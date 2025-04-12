const path = require('path');
const fs = require('fs-extra');
const ffmpegWrapper = require('../utils/ffmpegWrapper');
const fileManager = require('../utils/fileManager');
const { processedVideos } = require('./downloadController');

/**
 * Reassembles stylized frames into a video
 */
exports.reassembleVideo = async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        status: 'error',
        message: 'Video ID is required'
      });
    }

    // Check if video exists and frames have been stylized
    const videoInfo = processedVideos.get(videoId);
    if (!videoInfo) {
      return res.status(404).json({
        status: 'error',
        message: 'Video not found. Please download a video first'
      });
    }

    if (videoInfo.status !== 'frames_stylized') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot reassemble video. Current video status: ${videoInfo.status}`
      });
    }

    // Define final output path
    const outputPath = path.join(fileManager.getSessionDir(videoId), 'ghibli-final.mp4');
    
    // Get frame rate of original video
    const videoMetadata = await ffmpegWrapper.getVideoMetadata(videoInfo.originalPath);
    const frameRate = videoMetadata.frameRate || 24; // Default to 24fps if we can't detect it

    // Reassemble frames into video
    const framePattern = path.join(videoInfo.styledFramesDir, 'frame-%04d.png');
    const result = await ffmpegWrapper.reassembleFrames(framePattern, outputPath, frameRate);

    if (!result.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to reassemble video',
        error: result.error
      });
    }

    // Update video status and final path
    videoInfo.status = 'completed';
    videoInfo.finalPath = outputPath;
    processedVideos.set(videoId, videoInfo);

    return res.status(200).json({
      status: 'success',
      message: 'Video reassembled successfully',
      videoId,
      finalPath: outputPath,
      downloadUrl: `/download?videoId=${videoId}`
    });
  } catch (error) {
    console.error('Error reassembling video:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while reassembling the video',
      error: error.message
    });
  }
};
