from flask import Flask, Response, render_template_string
import os
import subprocess
import threading

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
    """Renders a simple home page with information about the API"""
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
                        <p>This application provides an API for downloading YouTube videos and applying Ghibli-style filters.</p>
                        <p><strong>API Status:</strong> Running on port 8000</p>
                    </div>
                    
                    <h3>API Endpoints:</h3>
                    <ul class="list-group mb-4">
                        <li class="list-group-item"><code>POST /download</code> - Download a YouTube video</li>
                        <li class="list-group-item"><code>POST /extract-frames</code> - Extract frames from video</li>
                        <li class="list-group-item"><code>POST /stylize-frame</code> - Apply Ghibli style to frames</li>
                        <li class="list-group-item"><code>POST /reassemble</code> - Reassemble stylized frames into video</li>
                        <li class="list-group-item"><code>GET /download</code> - Download the final stylized video</li>
                    </ul>
                    
                    <h3>API Location:</h3>
                    <p>The API is running at: <code>http://localhost:8000</code> or the equivalent Replit URL.</p>
                    
                    <div class="btn-wrapper">
                        <a href="http://localhost:8000" class="btn btn-primary" target="_blank">Access API</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return render_template_string(html_content)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)