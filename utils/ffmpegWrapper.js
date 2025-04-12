const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

/**
 * Extracts frames from a video file
 * @param {string} inputPath - Path to the input video file
 * @param {string} outputPattern - Output pattern for extracted frames (e.g., /path/to/frame-%04d.png)
 * @returns {Promise<Object>} - Result of the operation
 */
const extractFrames = (inputPath, outputPattern) => {
  return new Promise((resolve, reject) => {
    // Make sure the input file exists
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Input file does not exist: ${inputPath}`));
    }

    // Create the ffmpeg command
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vsync', '0',
      '-q:v', '2', // High quality frames
      outputPattern
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ 
          success: false, 
          error: `FFmpeg exited with code ${code}. Error: ${stderr}` 
        });
      }
    });

    ffmpeg.on('error', (err) => {
      resolve({ 
        success: false, 
        error: `Failed to start FFmpeg process: ${err.message}` 
      });
    });
  });
};

/**
 * Reassembles frames into a video
 * @param {string} framePattern - Pattern to match input frames (e.g., /path/to/frame-%04d.png)
 * @param {string} outputPath - Path to the output video file
 * @param {number} frameRate - Frame rate to use for the output video
 * @returns {Promise<Object>} - Result of the operation
 */
const reassembleFrames = (framePattern, outputPath, frameRate = 24) => {
  return new Promise((resolve, reject) => {
    // Create the ffmpeg command
    const ffmpeg = spawn('ffmpeg', [
      '-framerate', frameRate.toString(),
      '-i', framePattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '23', // Good quality
      '-preset', 'medium', // Balance between encoding speed and compression
      outputPath
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ 
          success: false, 
          error: `FFmpeg exited with code ${code}. Error: ${stderr}` 
        });
      }
    });

    ffmpeg.on('error', (err) => {
      resolve({ 
        success: false, 
        error: `Failed to start FFmpeg process: ${err.message}` 
      });
    });
  });
};

/**
 * Gets metadata from a video file
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<Object>} - Video metadata
 */
const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of json "${videoPath}"`, (error, stdout) => {
      if (error) {
        console.error('Error getting video metadata:', error);
        return resolve({ width: 0, height: 0, frameRate: 24 });
      }

      try {
        const data = JSON.parse(stdout);
        const stream = data.streams[0];
        
        // Parse frame rate fraction (e.g., "24/1")
        let frameRate = 24;
        if (stream.r_frame_rate) {
          const [numerator, denominator] = stream.r_frame_rate.split('/');
          frameRate = Math.round(parseInt(numerator) / parseInt(denominator));
        }

        resolve({
          width: stream.width || 0,
          height: stream.height || 0,
          frameRate
        });
      } catch (err) {
        console.error('Error parsing video metadata:', err);
        resolve({ width: 0, height: 0, frameRate: 24 });
      }
    });
  });
};

module.exports = {
  extractFrames,
  reassembleFrames,
  getVideoMetadata
};
