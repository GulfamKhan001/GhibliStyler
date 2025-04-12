const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');

/**
 * POST /download
 * Downloads a YouTube video based on the provided URL
 * Request body: { url: "https://www.youtube.com/watch?v=..." }
 */
router.post('/', downloadController.downloadVideo);

/**
 * GET /download
 * Downloads the final processed video
 */
router.get('/', downloadController.downloadFinalVideo);

module.exports = router;
