const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { processedVideos } = require('./downloadController');
const fileManager = require('../utils/fileManager');

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
    const stylizePromises = pngFrames.map(async (frameFile, index) => {
      const inputPath = path.join(framesDir, frameFile);
      const outputPath = path.join(styledFramesDir, frameFile);

      // Apply stylization effects
      // Here we're doing some simple effects to mimic Ghibli style as a placeholder
      await sharp(inputPath)
        // Increase saturation and apply soft contrast
        .modulate({ saturation: 1.4, brightness: 1.05 })
        // Add slight blur for that hand-drawn feel
        .blur(0.3)
        // Ghibli films often have a warm color temperature
        .tint({ r: 255, g: 240, b: 230 })
        // Save the stylized frame
        .toFile(outputPath);

      // Report progress every 10% of frames
      if (index % Math.max(1, Math.floor(pngFrames.length / 10)) === 0) {
        const progress = Math.floor((index / pngFrames.length) * 100);
        console.log(`Stylizing progress: ${progress}%`);
      }
    });

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
