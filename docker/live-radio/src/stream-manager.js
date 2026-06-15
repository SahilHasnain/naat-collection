const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

class StreamManager {
  constructor() {
    this.ffmpegProcess = null;
    this.currentPlaylist = [];
    this.currentIndex = 0;
    this.lastNotifiedTrack = null;
    this.playlistFile = path.join(__dirname, '../playlist.txt');
    this.outputDir = '/var/www/html/live';
    this.audioCacheDir = path.join(__dirname, '../audio-cache');
    this.trackRotationInterval = null;
    this.playlistMetadataFile = path.join(__dirname, '../playlist-metadata.json');
  }

  async initialize() {
    // Ensure directories exist
    await fs.ensureDir(this.audioCacheDir);
    
    // Check if we have cached playlist metadata
    const hasCachedPlaylist = await this.loadCachedPlaylist();
    
    if (!hasCachedPlaylist) {
      console.log('📥 No cached playlist found, fetching from Appwrite...');
      await this.updatePlaylist(); // Only fetch if no cache
    } else {
      console.log('✅ Using cached playlist metadata');
    }
    
    // Start Icecast streaming
    this.startStream();
    
    // Removed: 3-minute interval updates
    // Playlist only updates on container restart with CLEAR_AUDIO_CACHE_ON_START=true
  }

  startTrackRotation() {
    if (this.currentPlaylist.length === 0) return;
    
    // Start with first track
    this.currentIndex = 0;
    this.playCurrentTrack();
    
    console.log('🎵 Started track rotation');
  }

  async playCurrentTrack() {
    if (this.currentPlaylist.length === 0) return;
    
    const track = this.currentPlaylist[this.currentIndex];
    const filePath = path.join(this.audioCacheDir, `${track.id}.mp3`);
    
    if (await fs.pathExists(filePath)) {
      console.log(`🎵 Now playing: ${track.title}`);
      
      // Notify API server with file path
      await this.notifyTrackChange(track, filePath);
      
      // Schedule next track
      const duration = (track.duration || 180) * 1000; // Convert to milliseconds
      this.trackRotationInterval = setTimeout(() => {
        this.nextTrack();
      }, duration);
    } else {
      console.error(`❌ Audio file not found: ${filePath}`);
      this.nextTrack();
    }
  }

  nextTrack() {
    if (this.trackRotationInterval) {
      clearTimeout(this.trackRotationInterval);
    }
    
    this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
    this.playCurrentTrack();
  }

  /**
   * Load playlist from cached metadata file
   * Returns true if cache exists and is loaded successfully
   */
  async loadCachedPlaylist() {
    try {
      if (!(await fs.pathExists(this.playlistMetadataFile))) {
        return false;
      }

      const cachedData = await fs.readJson(this.playlistMetadataFile);
      
      if (!cachedData.playlist || cachedData.playlist.length === 0) {
        return false;
      }

      this.currentPlaylist = cachedData.playlist;
      
      console.log(`📦 Loaded ${this.currentPlaylist.length} naats from cache`);
      console.log(`📅 Cache date: ${cachedData.updatedAt}`);
      
      // Generate FFmpeg playlist from cached data
      await this.generateFFmpegPlaylist();
      
      return true;
    } catch (error) {
      console.error('❌ Error loading cached playlist:', error);
      return false;
    }
  }

  /**
   * Save playlist metadata to cache file
   */
  async saveCachedPlaylist() {
    try {
      const cacheData = {
        playlist: this.currentPlaylist,
        updatedAt: new Date().toISOString(),
        totalNaats: this.currentPlaylist.length
      };

      await fs.writeJson(this.playlistMetadataFile, cacheData, { spaces: 2 });
      console.log(`💾 Saved playlist metadata to cache`);
    } catch (error) {
      console.error('❌ Error saving playlist cache:', error);
    }
  }

  async updatePlaylist() {
    try {
      console.log('🔄 Fetching playlist from Appwrite...');
      
      const { Client, Databases, Query } = require('node-appwrite');
      
      // Initialize Appwrite client
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);
      
      // Fetch naats with cutAudio available and radio attribute true
      const response = await databases.listDocuments(
        process.env.DATABASE_ID,
        process.env.NAATS_COLLECTION_ID,
        [
          Query.limit(5000),
          Query.lessThanEqual("duration", 1200), // 20 minutes max
          Query.isNotNull("cutAudio"),
          Query.equal("radio", true),
          Query.or([
            Query.equal("exclude", false),
            Query.isNull("exclude")
          ]),
          Query.select(["$id", "title", "cutAudio", "duration"])
        ]
      );
      
      // Convert to playlist format
      this.currentPlaylist = response.documents.map(naat => ({
        id: naat.$id,
        title: naat.title,
        audioUrl: `https://sgp.cloud.appwrite.io/v1/storage/buckets/audio-files/files/${naat.cutAudio}/view?project=${process.env.APPWRITE_PROJECT_ID}`,
        duration: naat.duration
      }));
      
      console.log(`✅ Fetched ${this.currentPlaylist.length} naats from Appwrite`);
      
      // Save to cache for future restarts
      await this.saveCachedPlaylist();
      
      // Generate FFmpeg playlist
      await this.generateFFmpegPlaylist();
      
    } catch (error) {
      console.error('❌ Error updating playlist from Appwrite:', error);
      
      // Try to load from cache as fallback
      const loaded = await this.loadCachedPlaylist();
      if (!loaded) {
        console.error('❌ No cached playlist available, cannot continue');
        process.exit(1);
      }
    }
  }

  async generateFFmpegPlaylist() {
    const playlistContent = [];
    
    console.log('🎵 Generating FFmpeg playlist...');
    
    for (const track of this.currentPlaylist) {
      // Download and cache audio file (only if not already cached)
      const cachedFile = await this.cacheAudioFile(track);
      if (cachedFile) {
        playlistContent.push(`file '${cachedFile}'`);
      }
    }
    
    await fs.writeFile(this.playlistFile, playlistContent.join('\n'));
    console.log(`✅ Generated playlist with ${playlistContent.length} tracks`);
    
    // Start track rotation if not already started
    if (this.currentPlaylist.length > 0 && !this.trackRotationInterval) {
      console.log('▶️  Starting track rotation...');
      this.startTrackRotation();
    }
  }

  async cacheAudioFile(track) {
    const filename = `${track.id}.mp3`;
    const cachedPath = path.join(this.audioCacheDir, filename);
    
    // Check if already cached
    if (await fs.pathExists(cachedPath)) {
      console.log(`✅ Using cached audio: ${track.title}`);
      return cachedPath;
    }
    
    try {
      console.log(`📥 Downloading audio: ${track.title}`);
      
      // Download audio file
      const response = await axios({
        method: 'GET',
        url: track.audioUrl,
        responseType: 'stream'
      });
      
      const writer = fs.createWriteStream(cachedPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Cached: ${track.title}`);
          resolve(cachedPath);
        });
        writer.on('error', reject);
      });
      
    } catch (error) {
      console.error(`❌ Error caching ${track.title}:`, error);
      return null;
    }
  }

  startStream() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill();
    }

    console.log('Starting FFmpeg Icecast stream...');
    
    const ffmpegArgs = [
      '-re',                          // Read input at native frame rate
      '-f', 'concat',                 // Concatenate input files
      '-safe', '0',                   // Allow unsafe file paths
      '-stream_loop', '-1',           // Loop playlist infinitely
      '-i', this.playlistFile,        // Input playlist
      '-c:a', 'mp3',                  // Audio codec MP3 (better Icecast support)
      '-b:a', '128k',                 // Audio bitrate
      '-f', 'mp3',                    // MP3 format for Icecast
      '-content_type', 'audio/mpeg',  // Content type
      '-ice_name', 'Owais Raza Qadri Live Radio',
      '-ice_description', 'Live Naat Radio Stream',
      '-ice_genre', 'Islamic',
      'icecast://source:hackme@localhost:8000/live'  // Icecast URL
    ];

    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    this.ffmpegProcess.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout: ${data}`);
    });

    this.ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`FFmpeg: ${output}`);
      
      // Parse FFmpeg output to detect track changes
      this.parseFFmpegOutput(output);
    });

    this.ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
      
      // Restart after 5 seconds
      setTimeout(() => {
        this.startStream();
      }, 5000);
    });
  }

  parseFFmpegOutput(output) {
    // Look for file changes in FFmpeg output - more comprehensive patterns
    const filePatterns = [
      /Opening '([^']+)' for reading/,
      /Input #0, mp3, from '([^']+)':/,
      /Stream #0:0.*Audio.*from '([^']+)'/,
      /\[mp3 @ [^\]]+\] Estimating duration from bitrate, this may be inaccurate for '([^']+)'/
    ];
    
    for (const pattern of filePatterns) {
      const match = output.match(pattern);
      if (match) {
        const filePath = match[1];
        const filename = path.basename(filePath, '.mp3');
        const track = this.currentPlaylist.find(t => t.id === filename);
        
        if (track && track !== this.lastNotifiedTrack) {
          console.log(`Track changed detected: ${track.title}`);
          this.lastNotifiedTrack = track;
          this.notifyTrackChange(track);
        }
        break;
      }
    }
  }

  async notifyTrackChange(track, filePath) {
    try {
      // Notify the API server about track change
      await axios.post('http://localhost:3000/api/update-track', {
        track: track,
        filePath: filePath
      });
    } catch (error) {
      console.error('Error notifying track change:', error);
    }
  }
}

// Start the stream manager
const manager = new StreamManager();
manager.initialize().catch(console.error);
