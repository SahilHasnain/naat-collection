const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Current track state
let currentTrackState = {
  track: null,
  filePath: null,
  startedAt: null
};

// API Routes
app.get('/api/current', (req, res) => {
  if (!currentTrackState.track) {
    return res.json({
      success: false,
      error: 'No track currently playing'
    });
  }

  // Calculate elapsed time
  const elapsedSeconds = currentTrackState.startedAt 
    ? Math.floor((Date.now() - new Date(currentTrackState.startedAt).getTime()) / 1000)
    : 0;

  res.json({
    success: true,
    currentTrack: {
      ...currentTrackState.track,
      elapsedSeconds,
      startedAt: currentTrackState.startedAt
    },
    streamUrl: 'http://owaisrazaqadri.duckdns.org:8000/live',
    listenerCount: 0, // TODO: Get from Icecast stats
    upcomingTracks: [] // TODO: Implement upcoming tracks
  });
});

// Update current track (called by stream manager)
app.post('/api/update-track', (req, res) => {
  const { track, filePath } = req.body;
  
  currentTrackState = {
    track,
    filePath,
    startedAt: new Date().toISOString()
  };
  
  console.log(`Now playing: ${track.title}`);
  
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    currentTrack: currentTrackState.track?.title || 'None'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Live Radio API server running on port ${PORT}`);
});