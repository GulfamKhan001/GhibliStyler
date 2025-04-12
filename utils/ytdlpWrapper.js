const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Downloads a video from YouTube using yt-dlp
 * @param {string} url - YouTube URL
 * @param {string} outputPath - Path to save the downloaded video
 * @returns {Promise<Object>} - Result of the operation
 */
const downloadVideo = (url, outputPath) => {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    fs.ensureDirSync(path.dirname(outputPath));

    // Create the yt-dlp command
    const ytdlp = spawn('yt-dlp', [
      url,
      '-o', outputPath,
      '--format', 'mp4',  // We want mp4 format for compatibility
      '--restrict-filenames',  // Replace special characters in filenames
      '--no-playlist',  // Only download the single video, not a playlist
      '--no-overwrites'  // Don't overwrite existing files
    ]);

    let stderr = '';
    let stdout = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
      // Log download progress
      process.stdout.write('.');
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        console.log('\nDownload completed successfully');
        resolve({ success: true });
      } else {
        console.error(`\nyt-dlp exited with code ${code}`);
        resolve({ 
          success: false, 
          error: `yt-dlp exited with code ${code}. Error: ${stderr}` 
        });
      }
    });

    ytdlp.on('error', (err) => {
      console.error('Failed to start yt-dlp process:', err);
      resolve({ 
        success: false, 
        error: `Failed to start yt-dlp process: ${err.message}` 
      });
    });
  });
};

module.exports = {
  downloadVideo
};
