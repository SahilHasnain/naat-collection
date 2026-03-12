const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

class StreamManager {
  constructor() {
    this.ffmpegProcess = null;
    this.currentPlaylist = [];
    this.currentIndex = 0;
    this.playlistFile = path.join(__dirname, '../playlist.txt');
    this.outputDir = '/var/www/html/live';
    this.audioCacheDir = path.join(__dirname, '../audio-cache');
  }

  async initialize() {
    // Ensure directories exist
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(this.audioCacheDir);
    
    // Load initial playlist
    await this.updatePlaylist();
    
    // Start streaming
    this.startStream();
    
    // Update playlist every 3 minutes
    setInterval(() => {
      this.updatePlaylist();
    }, 3 * 60 * 1000);
  }

  async updatePlaylist() {
    try {
      console.log('Updating playlist...');
      
      const { Client, Databases, Query } = require('node-appwrite');
      
      // Initialize Appwrite client
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);
      
      // Fetch naats with radio enabled and cutAudio
      const response = await databases.listDocuments(
        process.env.DATABASE_ID,
        '695bc8e70038db72df5b', // naats collection ID
        [
          Query.limit(50),
          Query.lessThanEqual("duration", 1200), // 20 minutes max
          Query.equal("radio", true),
          Query.isNotNull("cutAudio"),
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
        audioUrl: `https://sgp.cloud.appwrite.io/v1/storage/buckets/audio-files/files/${naat.cutAudio}/view?project=695bb97700213f4ef5dd`,
        duration: naat.duration
      }));
      
      console.log(`Loaded ${this.currentPlaylist.length} naats for playlist`);
      await this.generateFFmpegPlaylist();
      
    } catch (error) {
      console.error('Error updating playlist:', error);
    }
  }

  async generateFFmpegPlaylist() {
    const playlistContent = [];
    
    for (const track of this.currentPlaylist) {
      // Download and cache audio file
      const cachedFile = await this.cacheAudioFile(track);
      if (cachedFile) {
        playlistContent.push(`file '${cachedFile}'`);
      }
    }
    
    await fs.writeFile(this.playlistFile, playlistContent.join('\n'));
    console.log(`Generated playlist with ${playlistContent.length} tracks`);
  }

  async cacheAudioFile(track) {
    const filename = `${track.id}.mp3`;
    const cachedPath = path.join(this.audioCacheDir, filename);
    
    // Check if already cached
    if (await fs.pathExists(cachedPath)) {
      return cachedPath;
    }
    
    try {
      console.log(`Caching audio: ${track.title}`);
      
      // Download audio file
      const response = await axios({
        method: 'GET',
        url: track.audioUrl,
        responseType: 'stream'
      });
      
      const writer = fs.createWriteStream(cachedPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(cachedPath));
        writer.on('error', reject);
      });
      
    } catch (error) {
      console.error(`Error caching ${track.title}:`, error);
      return null;
    }
  }

  startStream() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill();
    }

    console.log('Starting FFmpeg HLS stream...');
    
    const ffmpegArgs = [
      '-re',                          // Read input at native frame rate
      '-f', 'concat',                 // Concatenate input files
      '-safe', '0',                   // Allow unsafe file paths
      '-stream_loop', '-1',           // Loop playlist infinitely
      '-i', this.playlistFile,        // Input playlist
      '-c:a', 'aac',                  // Audio codec
      '-b:a', '128k',                 // Audio bitrate
      '-f', 'hls',                    // HLS format
      '-hls_time', '10',              // Segment duration (10 seconds)
      '-hls_list_size', '6',          // Keep 6 segments in playlist
      '-hls_flags', 'delete_segments', // Delete old segments
      '-hls_segment_filename', path.join(this.outputDir, 'segment_%03d.ts'),
      path.join(this.outputDir, 'master.m3u8')
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
    // Look for file changes in FFmpeg output
    const fileMatch = output.match(/Opening '([^']+)' for reading/);
    if (fileMatch) {
      const filename = path.basename(fileMatch[1], '.mp3');
      const track = this.currentPlaylist.find(t => t.id === filename);
      
      if (track) {
        this.notifyTrackChange(track);
      }
    }
  }

  async notifyTrackChange(track) {
    try {
      // Notify the API server about track change
      await axios.post('http://localhost:3000/api/update-track', {
        track: track
      });
    } catch (error) {
      console.error('Error notifying track change:', error);
    }
  }
}

// Start the stream manager
const manager = new StreamManager();
manager.initialize().catch(console.error);