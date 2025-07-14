const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const downloadRoutes = require('./routes/download');
const extractRoutes = require('./routes/extract');
const stylizeRoutes = require('./routes/stylize');
const reassembleRoutes = require('./routes/reassemble');
const fileManager = require('./utils/fileManager');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure temp directories exist
fileManager.setupDirectories();
console.log('API', process.env.OPENAI_API_KEY);

// Basic route for checking if the API is up
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Ghibli-Style YouTube Video Stylizer API is running'
  });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Routes
app.use('/download', downloadRoutes);
app.use('/extract-frames', extractRoutes);
app.use('/stylize-frame', stylizeRoutes);
app.use('/reassemble', reassembleRoutes);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// Handle application shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await fileManager.cleanupAllTempFiles();
  process.exit(0);
});

process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
  await fileManager.cleanupAllTempFiles();
  process.exit(1);
});

module.exports = app;
