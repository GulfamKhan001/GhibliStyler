const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Base temporary directory
const BASE_TEMP_DIR = path.join(os.tmpdir(), 'ghibli-stylizer');

// Initialize directories
const setupDirectories = async () => {
  try {
    await fs.ensureDir(BASE_TEMP_DIR);
    console.log(`Created base temporary directory at ${BASE_TEMP_DIR}`);
    return true;
  } catch (error) {
    console.error('Error setting up directories:', error);
    return false;
  }
};

// Get the session directory for a specific videoId
const getSessionDir = (videoId) => {
  return path.join(BASE_TEMP_DIR, videoId);
};

// Ensure session directory exists
const ensureSessionDir = async (videoId) => {
  const sessionDir = getSessionDir(videoId);
  await fs.ensureDir(sessionDir);
  await fs.ensureDir(path.join(sessionDir, 'frames'));
  await fs.ensureDir(path.join(sessionDir, 'styled-frames'));
  return sessionDir;
};

// Clean up a specific session directory
const cleanupSessionDir = async (videoId) => {
  try {
    const sessionDir = getSessionDir(videoId);
    if (await fs.pathExists(sessionDir)) {
      await fs.remove(sessionDir);
      console.log(`Cleaned up directory for video ID: ${videoId}`);
    }
    return true;
  } catch (error) {
    console.error(`Error cleaning up directory for video ID ${videoId}:`, error);
    return false;
  }
};

// Clean up all temporary files
const cleanupAllTempFiles = async () => {
  try {
    if (await fs.pathExists(BASE_TEMP_DIR)) {
      await fs.remove(BASE_TEMP_DIR);
      console.log('Cleaned up all temporary files');
    }
    return true;
  } catch (error) {
    console.error('Error cleaning up all temporary files:', error);
    return false;
  }
};

// Schedule cleanup for old files (older than 24 hours)
const scheduleCleanup = () => {
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  setInterval(async () => {
    try {
      if (!await fs.pathExists(BASE_TEMP_DIR)) return;
      
      const contents = await fs.readdir(BASE_TEMP_DIR);
      const now = Date.now();
      
      for (const item of contents) {
        const itemPath = path.join(BASE_TEMP_DIR, item);
        const stats = await fs.stat(itemPath);
        const age = now - stats.mtime.getTime();
        
        if (age > ONE_DAY) {
          await fs.remove(itemPath);
          console.log(`Removed old item: ${itemPath}`);
        }
      }
    } catch (error) {
      console.error('Error during scheduled cleanup:', error);
    }
  }, ONE_DAY);
};

// Start the cleanup scheduler
scheduleCleanup();

module.exports = {
  setupDirectories,
  getSessionDir,
  ensureSessionDir,
  cleanupSessionDir,
  cleanupAllTempFiles
};
