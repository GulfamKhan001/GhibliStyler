const express = require('express');
const router = express.Router();
const extractController = require('../controllers/extractController');

/**
 * POST /extract-frames
 * Extracts frames from the downloaded video
 * Request body: { videoId: "unique_video_id" }
 */
router.post('/', extractController.extractFrames);

module.exports = router;
