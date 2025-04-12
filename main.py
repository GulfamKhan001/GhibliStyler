from flask import Flask, render_template_string, request, jsonify
import os
import subprocess
import threading
import requests

app = Flask(__name__)

# Start the Node.js API server in a separate thread
def start_node_server():
    try:
        subprocess.Popen(["node", "index.js"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("Node.js API server started on port 8000")
    except Exception as e:
        print(f"Error starting Node.js server: {e}")

# Start the Node.js server when Flask starts
threading.Thread(target=start_node_server).start()

@app.route('/')
def home():
    """Renders the home page with a user interface for the stylizer"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ghibli-Style YouTube Video Stylizer</title>
        <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
        <style>
            .container { max-width: 800px; margin-top: 50px; }
            .btn-wrapper { margin: 20px 0; }
            .progress-container { display: none; margin-top: 20px; }
            .status-container { margin-top: 20px; }
            #processingSteps { list-style-type: none; padding-left: 0; }
            #processingSteps li { margin-bottom: 10px; }
            .step-waiting { color: var(--bs-secondary); }
            .step-active { color: var(--bs-primary); font-weight: bold; }
            .step-complete { color: var(--bs-success); }
            .step-error { color: var(--bs-danger); }
            #resultContainer { display: none; margin-top: 30px; }
        </style>
    </head>
    <body data-bs-theme="dark">
        <div class="container">
            <div class="card">
                <div class="card-header">
                    <h1 class="text-center">Ghibli-Style YouTube Video Stylizer</h1>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <p>Upload a YouTube video link to apply a Ghibli-style filter to it. The application will download the video, 
                        extract frames, apply the stylization effect, and reassemble the video for download.</p>
                    </div>
                    
                    <form id="videoForm">
                        <div class="mb-3">
                            <label for="youtubeUrl" class="form-label">YouTube Video URL</label>
                            <input type="url" class="form-control" id="youtubeUrl" 
                                placeholder="https://www.youtube.com/watch?v=..." required>
                            <div class="form-text">Enter the full URL of a YouTube video.</div>
                        </div>
                        
                        <div class="d-grid gap-2">
                            <button type="submit" class="btn btn-primary" id="processBtn">Process Video</button>
                        </div>
                    </form>
                    
                    <div class="progress-container" id="progressContainer">
                        <h4>Processing Status</h4>
                        <div class="progress" style="height: 25px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                 id="progressBar" role="progressbar" 
                                 aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" 
                                 style="width: 0%">0%</div>
                        </div>
                        
                        <div class="status-container">
                            <ul id="processingSteps">
                                <li id="step1" class="step-waiting">1. Downloading video...</li>
                                <li id="step2" class="step-waiting">2. Extracting frames...</li>
                                <li id="step3" class="step-waiting">3. Applying Ghibli style to frames...</li>
                                <li id="step4" class="step-waiting">4. Reassembling video...</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div id="resultContainer" class="text-center">
                        <h4>Your Ghibli-Style Video is Ready!</h4>
                        <p>Click the button below to download your stylized video.</p>
                        <a id="downloadBtn" href="#" class="btn btn-success" download>
                            Download Stylized Video
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const form = document.getElementById('videoForm');
                const progressContainer = document.getElementById('progressContainer');
                const progressBar = document.getElementById('progressBar');
                const resultContainer = document.getElementById('resultContainer');
                const downloadBtn = document.getElementById('downloadBtn');
                const steps = {
                    step1: document.getElementById('step1'),
                    step2: document.getElementById('step2'),
                    step3: document.getElementById('step3'),
                    step4: document.getElementById('step4')
                };
                
                let videoId = null;
                
                function updateProgress(percent, message) {
                    progressBar.style.width = `${percent}%`;
                    progressBar.setAttribute('aria-valuenow', percent);
                    progressBar.textContent = `${percent}%`;
                }
                
                function updateStep(step, status) {
                    // Reset all classes
                    steps[step].classList.remove('step-waiting', 'step-active', 'step-complete', 'step-error');
                    
                    // Add appropriate class
                    steps[step].classList.add(`step-${status}`);
                }
                
                async function processVideo(url) {
                    try {
                        // Step 1: Download video
                        updateStep('step1', 'active');
                        updateProgress(10, 'Downloading video...');
                        
                        const downloadResponse = await fetch('/api/download', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ url })
                        });
                        
                        const downloadData = await downloadResponse.json();
                        
                        if (!downloadResponse.ok) {
                            throw new Error(downloadData.message || 'Failed to download video');
                        }
                        
                        videoId = downloadData.videoId;
                        updateStep('step1', 'complete');
                        
                        // Step 2: Extract frames
                        updateStep('step2', 'active');
                        updateProgress(35, 'Extracting frames...');
                        
                        const extractResponse = await fetch('/api/extract-frames', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ videoId })
                        });
                        
                        const extractData = await extractResponse.json();
                        
                        if (!extractResponse.ok) {
                            throw new Error(extractData.message || 'Failed to extract frames');
                        }
                        
                        updateStep('step2', 'complete');
                        
                        // Step 3: Stylize frames
                        updateStep('step3', 'active');
                        updateProgress(60, 'Applying Ghibli style...');
                        
                        const stylizeResponse = await fetch('/api/stylize-frame', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ videoId })
                        });
                        
                        const stylizeData = await stylizeResponse.json();
                        
                        if (!stylizeResponse.ok) {
                            throw new Error(stylizeData.message || 'Failed to stylize frames');
                        }
                        
                        updateStep('step3', 'complete');
                        
                        // Step 4: Reassemble video
                        updateStep('step4', 'active');
                        updateProgress(85, 'Reassembling video...');
                        
                        const reassembleResponse = await fetch('/api/reassemble', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ videoId })
                        });
                        
                        const reassembleData = await reassembleResponse.json();
                        
                        if (!reassembleResponse.ok) {
                            throw new Error(reassembleData.message || 'Failed to reassemble video');
                        }
                        
                        updateStep('step4', 'complete');
                        updateProgress(100, 'Complete!');
                        
                        // Show download button with the correct URL
                        downloadBtn.href = reassembleData.downloadUrl;
                        resultContainer.style.display = 'block';
                        
                    } catch (error) {
                        console.error('Error during processing:', error);
                        
                        // Show error in progress bar
                        progressBar.classList.remove('bg-primary');
                        progressBar.classList.add('bg-danger');
                        progressBar.textContent = 'Error: ' + error.message;
                        
                        // Mark current step as error
                        for (const step in steps) {
                            if (steps[step].classList.contains('step-active')) {
                                updateStep(step, 'error');
                                break;
                            }
                        }
                    }
                }
                
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const youtubeUrl = document.getElementById('youtubeUrl').value;
                    
                    // Reset UI
                    progressBar.style.width = '0%';
                    progressBar.setAttribute('aria-valuenow', 0);
                    progressBar.textContent = '0%';
                    progressBar.classList.remove('bg-danger');
                    progressBar.classList.add('bg-primary');
                    resultContainer.style.display = 'none';
                    
                    for (const step in steps) {
                        updateStep(step, 'waiting');
                    }
                    
                    // Show progress container
                    progressContainer.style.display = 'block';
                    
                    // Process the video
                    processVideo(youtubeUrl);
                });
            });
        </script>
    </body>
    </html>
    """
    return render_template_string(html_content)

# API endpoints that proxy to the Node.js API
@app.route('/api/download', methods=['POST'])
def download_video():
    # Forward the request to the Node.js API
    response = requests.post('http://localhost:8000/download', json=request.json)
    return jsonify(response.json()), response.status_code

@app.route('/api/extract-frames', methods=['POST'])
def extract_frames():
    # Forward the request to the Node.js API
    response = requests.post('http://localhost:8000/extract-frames', json=request.json)
    return jsonify(response.json()), response.status_code

@app.route('/api/stylize-frame', methods=['POST'])
def stylize_frames():
    # Forward the request to the Node.js API
    response = requests.post('http://localhost:8000/stylize-frame', json=request.json)
    return jsonify(response.json()), response.status_code

@app.route('/api/reassemble', methods=['POST'])
def reassemble_video():
    # Forward the request to the Node.js API
    response = requests.post('http://localhost:8000/reassemble', json=request.json)
    return jsonify(response.json()), response.status_code

@app.route('/api/download', methods=['GET'])
def download_final_video():
    # Forward to the Node.js API download endpoint
    videoId = request.args.get('videoId')
    return jsonify({
        'downloadUrl': f'http://localhost:8000/download?videoId={videoId}'
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)