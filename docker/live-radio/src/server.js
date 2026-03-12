const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Current track state
let currentTrack = null;
let trackStartTime = null;
let currentTrackFile = null; // Path to current audio file

// Load current track info
async function loadCurrentTrack() {
  try {
    const stateFile = path.join(__dirname, '../current-state.json');
    if (await fs.pathExists(stateFile)) {
      const state = await fs.readJson(stateFile);
      currentTrack = state.currentTrack;
      currentTrackFile = state.currentTrackFile;
      trackStartTime = new Date(state.trackStartTime);
    }
  } catch (error) {
    console.error('Error loading current track:', error);
  }
}

// API endpoint for current track metadata
app.get('/api/current', (req, res) => {
  if (!currentTrack) {
    return res.json({
      success: false,
      error: 'No track currently playing'
    });
  }

  const now = new Date();
  const elapsedSeconds = trackStartTime ? Math.floor((now - trackStartTime) / 1000) : 0;

  res.json({
    success: true,
    currentTrack: {
      ...currentTrack,
      elapsedSeconds: Math.min(elapsedSeconds, currentTrack.duration || 0),
      startedAt: trackStartTime?.toISOString()
    },
    streamUrl: '/live/current.mp3' // Direct MP3 URL
  });
});

// Serve current MP3 file
app.get('/live/current.mp3', (req, res) => {
  console.log('📡 MP3 request received');
  console.log('🎵 Current track file:', currentTrackFile);
  
  if (!currentTrackFile) {
    console.log('❌ No current track file set');
    return res.status(404).json({ error: 'No audio file currently playing' });
  }
  
  if (!fs.existsSync(currentTrackFile)) {
    console.log('❌ Audio file does not exist:', currentTrackFile);
    return res.status(404).json({ error: 'Audio file not found' });
  }

  console.log('✅ Serving audio file:', currentTrackFile);
  
  const stat = fs.statSync(currentTrackFile);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Handle range requests for seeking
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    
    const file = fs.createReadStream(currentTrackFile, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // Serve full file
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
    };
    res.writeHead(200, head);
    fs.createReadStream(currentTrackFile).pipe(res);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Update current track (called by stream manager)
app.post('/api/update-track', (req, res) => {
  const { track, filePath } = req.body;
  
  currentTrack = track;
  currentTrackFile = filePath; // Store file path
  trackStartTime = new Date();
  
  // Save state to file
  const stateFile = path.join(__dirname, '../current-state.json');
  fs.writeJson(stateFile, {
    currentTrack: track,
    currentTrackFile: filePath,
    trackStartTime: trackStartTime.toISOString()
  }).catch(console.error);
  
  console.log(`Now playing: ${track.title}`);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Live Radio API server running on port ${PORT}`);
  loadCurrentTrack();
});