const express = require('express');
const router = express.Router();
const reassembleController = require('../controllers/reassembleController');

/**
 * POST /reassemble
 * Reassembles stylized frames into a video
 * Request body: { videoId: "unique_video_id" }
 */
router.post('/', reassembleController.reassembleVideo);

module.exports = router;
