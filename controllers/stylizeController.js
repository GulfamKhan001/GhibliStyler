const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { processedVideos } = require('./downloadController');
const fileManager = require('../utils/fileManager');
const axios = require('axios');
const FormData = require('form-data');
const os = require('os');

/**
 * Applies a Ghibli-style filter to extracted frames
 * For now, this is a placeholder that applies simple image effects
 */
exports.stylizeFrames = async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        status: 'error',
        message: 'Video ID is required'
      });
    }

    // Check if video exists and frames have been extracted
    const videoInfo = processedVideos.get(videoId);
    if (!videoInfo) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found. Please download a video first'
      });
    }

    if (videoInfo.status !== 'frames_extracted') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot stylize frames. Current video status: ${videoInfo.status}`
      });
    }

    // Ensure styled frames directory exists
    const styledFramesDir = path.join(fileManager.getSessionDir(videoId), 'styled-frames');
    await fs.ensureDir(styledFramesDir);

    // Get list of frames
    const framesDir = videoInfo.framesDir;
    const frameFiles = await fs.readdir(framesDir);
    const pngFrames = frameFiles.filter(file => file.endsWith('.png'));

    if (pngFrames.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No frames found to stylize'
      });
    }

    // Process each frame
    for (let index = 0; index < pngFrames.length; index++) {
      if (index % 10 === 0) {
        const frameFile = pngFrames[index];
        const inputPath = path.join(framesDir, frameFile);
        const outputPath = path.join(styledFramesDir, frameFile);
    
        await stylizeFrameWithOpenAI(inputPath, outputPath);
    
        // Wait 2-5 seconds before next API call
        const waitMs = 2000 + Math.floor(Math.random() * 3000);
        await new Promise(res => setTimeout(res, waitMs));
    
        // Report progress every 10%
        if (index % Math.max(1, Math.floor(pngFrames.length / 10)) === 0) {
          const progress = Math.floor((index / pngFrames.length) * 100);
          console.log(`Stylizing progress: ${progress}%`);
        }
      }
    }

    // Wait for all stylization operations to complete
    await Promise.all(stylizePromises);

    // Update video status
    videoInfo.status = 'frames_stylized';
    videoInfo.styledFramesDir = styledFramesDir;
    processedVideos.set(videoId, videoInfo);

    return res.status(200).json({
      status: 'success',
      message: 'Frames stylized successfully',
      videoId,
      framesCount: pngFrames.length,
      styledFramesDir
    });
  } catch (error) {
    console.error('Error stylizing frames:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while stylizing frames',
      error: error.message
    });
  }
};

async function stylizeFrameWithOpenAI(inputPath, outputPath, retries = 3) {
  // Ensure PNG and 512x512
  const tempPngPath = path.join(
    os.tmpdir(),
    `ghibli-stylizer-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  );
  await sharp(inputPath)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(tempPngPath);

  try {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const form = new FormData();
        form.append('image', fs.createReadStream(tempPngPath));
        form.append('n', 1);
        form.append('size', '512x512');

        const response = await axios.post(
          'https://api.openai.com/v1/images/variations',
          form,
          {
            headers: {
              ...form.getHeaders(),
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
          }
        );

        const stylizedImageUrl = response.data.data[0].url;
        const stylizedImage = await axios.get(stylizedImageUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(outputPath, stylizedImage.data);
        // Clean up temp file
        await fs.remove(tempPngPath);
        return;
      } catch (err) {
        if (err.response && err.response.status === 429) {
          const retryAfter = err.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10000;
          console.warn(`Rate limited by OpenAI (429). Waiting ${waitTime / 1000}s before retrying...`);
          await new Promise(res => setTimeout(res, waitTime));
        } else {
          console.error(`Error stylizing frame (attempt ${attempt}):`, err.message, err.response?.data);
          if (attempt === retries) throw err;
          await new Promise(res => setTimeout(res, 2000 * attempt));
        }
      }
    }
  }finally {
    // Clean up temp file
    if (await fs.pathExists(tempPngPath)) {
      await fs.remove(tempPngPath);
    }
  }
}
