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

// Load current track info
async function loadCurrentTrack() {
  try {
    const stateFile = path.join(__dirname, '../current-state.json');
    if (await fs.pathExists(stateFile)) {
      const state = await fs.readJson(stateFile);
      currentTrack = state.currentTrack;
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
    streamUrl: '/live/master.m3u8'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Update current track (called by stream manager)
app.post('/api/update-track', (req, res) => {
  const { track } = req.body;
  
  currentTrack = track;
  trackStartTime = new Date();
  
  // Save state to file
  const stateFile = path.join(__dirname, '../current-state.json');
  fs.writeJson(stateFile, {
    currentTrack: track,
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