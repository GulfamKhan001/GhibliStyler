const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const ytdlpWrapper = require('../utils/ytdlpWrapper');
const fileManager = require('../utils/fileManager');

// Map to store videoId -> filename for tracking processed videos
const processedVideos = new Map();

/**
 * Downloads a YouTube video from the provided URL
 */
exports.downloadVideo = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'YouTube URL is required'
      });
    }

    // Generate a unique ID for this video processing session
    const videoId = uuidv4();
    
    // Create temp directory for this session if it doesn't exist
    await fileManager.ensureSessionDir(videoId);

    // Download the video
    const outputFilePath = path.join(fileManager.getSessionDir(videoId), 'original_video.mp4');
    
    // Start the download process
    const result = await ytdlpWrapper.downloadVideo(url, outputFilePath);
    
    if (!result.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to download the video',
        error: result.error
      });
    }

    // Store the videoId and its filepath for later use
    processedVideos.set(videoId, {
      originalPath: outputFilePath,
      finalPath: null,
      status: 'downloaded'
    });

    return res.status(200).json({
      status: 'success',
      message: 'Video downloaded successfully',
      videoId,
      filePath: outputFilePath
    });
  } catch (error) {
    console.error('Error downloading video:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while downloading the video',
      error: error.message
    });
  }
};

/**
 * Sends the final processed video to the client
 */
exports.downloadFinalVideo = async (req, res) => {
  try {
    const { videoId } = req.query;

    if (!videoId) {
      return res.status(400).json({
        status: 'error',
        message: 'Video ID is required'
      });
    }

    // Get video info from the map
    const videoInfo = processedVideos.get(videoId);

    if (!videoInfo) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found'
      });
    }

    if (!videoInfo.finalPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Final video is not ready yet'
      });
    }

    // Check if file exists
    if (!await fs.pathExists(videoInfo.finalPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Final video file not found'
      });
    }

    // Send the file
    res.download(videoInfo.finalPath, 'ghibli-styled-video.mp4', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to send the file',
          error: err.message
        });
      }
    });
  } catch (error) {
    console.error('Error downloading final video:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while downloading the final video',
      error: error.message
    });
  }
};

// Export the map for other controllers to use
exports.processedVideos = processedVideos;
