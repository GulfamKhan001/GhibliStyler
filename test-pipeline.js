// test-pipeline.js
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

// Create a small test video for processing
const createTestVideo = async () => {
  console.log('Creating test video...');
  
  // Create a temporary directory
  const videoId = uuidv4();
  const sessionDir = path.join('/tmp', videoId);
  await fs.ensureDir(sessionDir);
  
  // Path for the test video
  const outputPath = path.join(sessionDir, 'test_video.mp4');
  
  // Use ffmpeg to create a test video (3 seconds, color bars)
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'testsrc=duration=3:size=320x240:rate=30',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      outputPath
    ]);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`Created test video at ${outputPath}`);
        resolve({ videoId, videoPath: outputPath, sessionDir });
      } else {
        reject(new Error(`Failed to create test video, ffmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });
  });
};

// Extract frames from the test video
const extractFrames = async ({ videoPath, sessionDir }) => {
  console.log('Extracting frames...');
  
  // Create frames directory
  const framesDir = path.join(sessionDir, 'frames');
  await fs.ensureDir(framesDir);
  
  // Frame output pattern
  const framePattern = path.join(framesDir, 'frame-%04d.png');
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vsync', '0',
      '-q:v', '2',
      framePattern
    ]);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`Extracted frames to ${framesDir}`);
        resolve({ framesDir });
      } else {
        reject(new Error(`Failed to extract frames, ffmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });
  });
};

// Stylize the extracted frames
const stylizeFrames = async ({ framesDir, sessionDir }) => {
  console.log('Stylizing frames...');
  
  // Create directory for stylized frames
  const styledFramesDir = path.join(sessionDir, 'styled-frames');
  await fs.ensureDir(styledFramesDir);
  
  try {
    // Get all frame files
    const frameFiles = await fs.readdir(framesDir);
    const pngFrames = frameFiles.filter(file => file.endsWith('.png'));
    
    console.log(`Found ${pngFrames.length} frames to stylize`);
    
    // For this test, we'll just copy the frames to the styled dir
    // In a real app, this would apply the actual stylization effects
    for (const frameFile of pngFrames) {
      const sourcePath = path.join(framesDir, frameFile);
      const destPath = path.join(styledFramesDir, frameFile);
      await fs.copy(sourcePath, destPath);
    }
    
    console.log(`Copied frames to ${styledFramesDir}`);
    return { styledFramesDir };
  } catch (error) {
    console.error('Error stylizing frames:', error);
    throw error;
  }
};

// Reassemble the frames into a final video
const reassembleFrames = async ({ styledFramesDir, sessionDir }) => {
  console.log('Reassembling frames into video...');
  
  // Output path for final video
  const outputPath = path.join(sessionDir, 'final_video.mp4');
  
  // Frame pattern
  const framePattern = path.join(styledFramesDir, 'frame-%04d.png');
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-framerate', '30',
      '-i', framePattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '23',
      '-preset', 'medium',
      outputPath
    ]);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`Reassembled video saved to ${outputPath}`);
        resolve({ finalVideoPath: outputPath });
      } else {
        reject(new Error(`Failed to reassemble video, ffmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });
  });
};

// Run the full test pipeline
const runTestPipeline = async () => {
  try {
    // Step 1: Create test video
    const videoInfo = await createTestVideo();
    console.log(`Test video created with ID: ${videoInfo.videoId}`);
    
    // Step 2: Extract frames
    const frameInfo = await extractFrames(videoInfo);
    const combinedInfo = { ...videoInfo, ...frameInfo };
    
    // Step 3: Stylize frames
    const stylizeInfo = await stylizeFrames(combinedInfo);
    const fullInfo = { ...combinedInfo, ...stylizeInfo };
    
    // Step 4: Reassemble frames
    const finalInfo = await reassembleFrames(fullInfo);
    const completeInfo = { ...fullInfo, ...finalInfo };
    
    console.log('\n✅ Test pipeline completed successfully!');
    console.log('-----------------------------------');
    console.log('Video ID:', completeInfo.videoId);
    console.log('Original video:', completeInfo.videoPath);
    console.log('Frames directory:', completeInfo.framesDir);
    console.log('Styled frames directory:', completeInfo.styledFramesDir);
    console.log('Final video:', completeInfo.finalVideoPath);
    
    return completeInfo;
  } catch (error) {
    console.error('❌ Test pipeline failed:', error);
    throw error;
  }
};

// Run the test
runTestPipeline()
  .then(() => console.log('Test completed.'))
  .catch(err => console.error('Test failed:', err));