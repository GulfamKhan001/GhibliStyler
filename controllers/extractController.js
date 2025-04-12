const path = require('path');
const fs = require('fs-extra');
const ffmpegWrapper = require('../utils/ffmpegWrapper');
const fileManager = require('../utils/fileManager');
const { processedVideos } = require('./downloadController');

/**
 * Extracts frames from the downloaded video
 */
exports.extractFrames = async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        status: 'error',
        message: 'Video ID is required'
      });
    }

    // Check if video exists
    const videoInfo = processedVideos.get(videoId);
    if (!videoInfo) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found. Please download a video first'
      });
    }

    // Check if video has been downloaded
    if (videoInfo.status !== 'downloaded') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot extract frames. Current video status: ${videoInfo.status}`
      });
    }

    // Ensure frames directory exists
    const framesDir = path.join(fileManager.getSessionDir(videoId), 'frames');
    await fs.ensureDir(framesDir);

    // Extract frames
    const framePattern = path.join(framesDir, 'frame-%04d.png');
    const result = await ffmpegWrapper.extractFrames(videoInfo.originalPath, framePattern);

    if (!result.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to extract frames',
        error: result.error
      });
    }

    // Update video status
    videoInfo.status = 'frames_extracted';
    videoInfo.framesDir = framesDir;
    processedVideos.set(videoId, videoInfo);

    // Count extracted frames
    const frameFiles = await fs.readdir(framesDir);
    const frameCount = frameFiles.filter(file => file.startsWith('frame-') && file.endsWith('.png')).length;

    return res.status(200).json({
      status: 'success',
      message: 'Frames extracted successfully',
      videoId,
      framesCount: frameCount,
      framesDir
    });
  } catch (error) {
    console.error('Error extracting frames:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while extracting frames',
      error: error.message
    });
  }
};
