#!/usr/bin/env node

/**
 * Simple HTTP server to test audio extraction and playback
 * Run: node test-audio-server.js
 * Then open: http://localhost:3000
 */

const http = require("http");
const { spawn } = require("child_process");
const url = require("url");

const PORT = 3000;

// HTML page
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Playback Test</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }

        .input-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 600;
            font-size: 14px;
        }

        input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        input:focus {
            outline: none;
            border-color: #667eea;
        }

        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-bottom: 20px;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        button:active {
            transform: translateY(0);
        }

        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .status {
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }

        .status.loading {
            display: block;
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }

        .status.success {
            display: block;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status.error {
            display: block;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .player-container {
            display: none;
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }

        .player-container.active {
            display: block;
        }

        audio {
            width: 100%;
            margin-top: 10px;
        }

        .info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #0c5460;
        }

        .metadata {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px 16px;
            font-size: 13px;
            margin-top: 15px;
        }

        .metadata-label {
            font-weight: 600;
            color: #555;
        }

        .metadata-value {
            color: #777;
            word-break: break-all;
        }

        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 Audio Playback Test</h1>
        <p class="subtitle">Test yt-dlp audio extraction and playback</p>

        <div class="info">
            💡 Enter a YouTube video ID to extract and play its audio stream
        </div>

        <div class="input-group">
            <label for="youtubeId">YouTube Video ID</label>
            <input 
                type="text" 
                id="youtubeId" 
                placeholder="e.g., LCFWd4DdL3M" 
                value="LCFWd4DdL3M"
            >
        </div>

        <button id="extractBtn" onclick="extractAudio()">
            Extract & Play Audio
        </button>

        <div id="status" class="status"></div>

        <div id="playerContainer" class="player-container">
            <h3 style="margin-bottom: 10px; color: #333;">Audio Player</h3>
            <audio id="audioPlayer" controls></audio>
            
            <div class="metadata" id="metadata"></div>
        </div>
    </div>

    <script>
        function showStatus(message, type) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.className = \`status \${type}\`;
        }

        function showMetadata(data) {
            const metadataEl = document.getElementById('metadata');
            metadataEl.innerHTML = \`
                <span class="metadata-label">Format:</span>
                <span class="metadata-value">\${data.format || 'N/A'}</span>
                
                <span class="metadata-label">Quality:</span>
                <span class="metadata-value">\${data.quality || 'N/A'}</span>
                
                <span class="metadata-label">URL Length:</span>
                <span class="metadata-value">\${data.urlLength || 'N/A'} characters</span>
                
                <span class="metadata-label">Extraction Time:</span>
                <span class="metadata-value">\${data.extractionTime || 'N/A'}ms</span>
            \`;
        }

        async function extractAudio() {
            const youtubeId = document.getElementById('youtubeId').value.trim();
            
            if (!youtubeId) {
                showStatus('❌ Please enter a YouTube video ID', 'error');
                return;
            }

            const extractBtn = document.getElementById('extractBtn');
            const playerContainer = document.getElementById('playerContainer');
            const audioPlayer = document.getElementById('audioPlayer');

            extractBtn.disabled = true;
            playerContainer.classList.remove('active');
            showStatus('⏳ Extracting audio URL from server...', 'loading');

            try {
                const response = await fetch(\`/extract?youtubeId=\${encodeURIComponent(youtubeId)}\`);
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Extraction failed');
                }

                showMetadata({
                    format: data.format,
                    quality: data.quality,
                    urlLength: data.audioUrl.length,
                    extractionTime: data.extractionTime
                });

                showStatus('✅ Audio URL extracted successfully! Loading player...', 'success');

                // Load audio
                audioPlayer.src = data.audioUrl;
                playerContainer.classList.add('active');

                // Auto-play
                audioPlayer.play().catch(err => {
                    console.log('Auto-play prevented:', err);
                });

                showStatus('✅ Ready to play! Click play button below.', 'success');

            } catch (error) {
                showStatus(\`❌ Error: \${error.message}\`, 'error');
                console.error('Extraction error:', error);
            } finally {
                extractBtn.disabled = false;
            }
        }

        // Handle audio events
        document.getElementById('audioPlayer').addEventListener('error', (e) => {
            showStatus('❌ Audio playback error. URL may have expired.', 'error');
            console.error('Audio error:', e);
        });

        document.getElementById('audioPlayer').addEventListener('playing', () => {
            showStatus('▶️ Playing audio...', 'success');
        });

        document.getElementById('audioPlayer').addEventListener('pause', () => {
            showStatus('⏸️ Paused', 'success');
        });

        document.getElementById('audioPlayer').addEventListener('ended', () => {
            showStatus('✅ Playback completed', 'success');
        });

        // Allow Enter key to trigger extraction
        document.getElementById('youtubeId').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                extractAudio();
            }
        });
    </script>
</body>
</html>
`;

// Extract audio URL using yt-dlp
async function extractAudioUrl(youtubeId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const ytdlp = spawn("yt-dlp", [
      "--get-url",
      "-f",
      "bestaudio",
      `https://www.youtube.com/watch?v=${youtubeId}`,
    ]);

    let output = "";
    let errorOutput = "";

    ytdlp.stdout.on("data", (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ytdlp.on("close", (code) => {
      const extractionTime = Date.now() - startTime;

      if (code === 0) {
        const audioUrl = output.trim();

        // Get format info
        const formatProcess = spawn("yt-dlp", [
          "-f",
          "bestaudio",
          "--print",
          "%(format_id)s %(ext)s %(abr)s",
          `https://www.youtube.com/watch?v=${youtubeId}`,
        ]);

        let formatInfo = "";
        formatProcess.stdout.on("data", (data) => {
          formatInfo += data.toString();
        });

        formatProcess.on("close", () => {
          const [formatId, ext, quality] = formatInfo.trim().split(" ");

          resolve({
            success: true,
            audioUrl,
            format: `${ext} (${formatId})`,
            quality: quality ? `${quality}kbps` : "Unknown",
            extractionTime,
          });
        });
      } else {
        reject(new Error(errorOutput || "yt-dlp extraction failed"));
      }
    });

    ytdlp.on("error", (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      ytdlp.kill();
      reject(new Error("Extraction timeout (15s)"));
    }, 15000);
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Serve HTML page
  if (parsedUrl.pathname === "/" || parsedUrl.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML_PAGE);
    return;
  }

  // API endpoint to extract audio
  if (parsedUrl.pathname === "/extract") {
    const youtubeId = parsedUrl.query.youtubeId;

    if (!youtubeId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: "Missing youtubeId parameter",
        })
      );
      return;
    }

    try {
      console.log(`Extracting audio for YouTube ID: ${youtubeId}`);
      const result = await extractAudioUrl(youtubeId);
      console.log(`✅ Extraction successful in ${result.extractionTime}ms`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error(`❌ Extraction failed: ${error.message}`);

      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: error.message,
        })
      );
    }
    return;
  }

  // 404 for other routes
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

// Start server
server.listen(PORT, () => {
  console.log("🎵 Audio Playback Test Server");
  console.log("================================");
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`\n📖 Open your browser and navigate to:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n⏹️  Press Ctrl+C to stop the server\n`);
});
