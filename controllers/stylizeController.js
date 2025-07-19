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

    const stylizePromises = [];
    const framesToStylize = [pngFrames[20]]; // Only process one frame for testing
    // const framesToStylize = pngFrames.filter((_, index) => index % 10 === 0);

    for (let i = 0; i < framesToStylize.length; i++) {
      const frameFile = framesToStylize[i];
      const inputPath = path.join(framesDir, frameFile);
      const outputPath = path.join(styledFramesDir, frameFile);

      // Start the stylization promise (do not await here)
      stylizePromises.push(stylizeFrameWithRunPod(inputPath, outputPath));

      // Optional: log progress as requests are sent
      if (i % Math.max(1, Math.floor(framesToStylize.length / 10)) === 0) {
        const progress = Math.floor((i / framesToStylize.length) * 100);
        console.log(`Stylization request sent: ${progress}%`);
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

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT = 'https://api.runpod.ai/v2/m13tzh4qxiu26g';

// Ensure global.fetch is available (Node.js)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


async function stylizeFrameWithRunPod(inputPath, outputPath) {
  const imageBase64 = fs.readFileSync(inputPath, { encoding: 'base64' });

  // 1. Submit the job
  const payload = {
    input: {
      prompt: "Studio Ghibli style, dreamy watercolor, anime background",
      init_images: [imageBase64],
      denoising_strength: 0.6,
      steps: 30,
      sampler_index: "Euler a"
    }
  };

  const requestConfig = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RUNPOD_API_KEY}`
    },
    body: JSON.stringify(payload)
  };

  try {
    const response = await fetch(RUNPOD_ENDPOINT + "/run", requestConfig);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    

    const job = await response.json();
    const jobId = job.id;

    // Polling loop for job status
    let result;
    while (true) {
      await new Promise((res) => setTimeout(res, 3000)); // wait 3 seconds
    

      const statusRes = await fetch(`${RUNPOD_ENDPOINT}/status/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${RUNPOD_API_KEY}`
        }
      });

      const status = await statusRes.json();
      console.log(status);
      
      if (status.status === "COMPLETED") {
        result = status.output;
        break;
      }

      if (status.status === "FAILED") {
        throw new Error(`RunPod job failed: ${JSON.stringify(status)}`);
      }

      console.log(`Waiting for job... Status: ${status.status}`);
    }
    const imageBuffer = Buffer.from(result.images[0], 'base64');
    fs.writeFileSync(outputPath, imageBuffer);
  } catch (error) {
    console.error("Error stylizing frame with RunPod:", error.message);
    throw error;
  }
}
