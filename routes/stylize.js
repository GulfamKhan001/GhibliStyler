const express = require('express');
const router = express.Router();
const stylizeController = require('../controllers/stylizeController');

/**
 * POST /stylize-frame
 * Applies Ghibli-style filter to all extracted frames
 * Request body: { videoId: "unique_video_id" }
 */
router.post('/', stylizeController.stylizeFrames);

module.exports = router;
