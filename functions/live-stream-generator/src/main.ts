/**
 * Live Stream Generator - HLS Streaming Function
 * 
 * Generates HLS live stream from audio playlist
 * - Runs FFmpeg to create HLS segments
 * - Uploads segments to Appwrite Storage
 * - Self-triggers to maintain 24/7 stream
 * - Keeps last 60 seconds of segments (6 x 10s segments)
 */

import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { Client, Databases, Functions, Storage } from 'node-appwrite';
import fetch from 'node-fetch';
import { tmpdir } from 'os';
import { join } from 'path';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Constants
const LIVE_RADIO_COLLECTION_ID = 'live_radio';
const LIVE_RADIO_DOCUMENT_ID = 'current_state';
const STREAM_BUCKET_ID = 'live-stream';
const SEGMENT_DURATION = 10; // seconds
const PLAYLIST_SIZE = 6; // Keep 6 segments (60 seconds)
const KEEP_ALIVE_INTERVAL = 840000; // 14 minutes (before 15 min timeout)

interface PlaylistEntry {
  naatId: string;
  audioId: string;
  hasCutAudio: boolean;
}

interface LiveRadioState {
  currentTrackIndex: number;
  playlist: string[];
  updatedAt: string;
}

interface StreamState {
  currentSegmentIndex: number;
  playlistEntries: PlaylistEntry[];
  currentTrackIndex: number;
  segmentStartTime: number;
}

/**
 * Parse playlist entry from pipe-delimited format
 */
function parsePlaylistEntry(entry: string): PlaylistEntry {
  if (entry.includes('|')) {
    const [naatId, audioId, hasCutAudio] = entry.split('|');
    return { naatId, audioId, hasCutAudio: hasCutAudio === '1' };
  }
  return { naatId: entry, audioId: '', hasCutAudio: false };
}

/**
 * Download audio file from Appwrite Storage
 */
async function downloadAudioFile(
  storage: Storage,
  audioId: string,
  outputPath: string
): Promise<void> {
  try {
    // Get file view URL
    const fileUrl = `${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/storage/buckets/audio/files/${audioId}/view?project=${process.env.APPWRITE_FUNCTION_PROJECT_ID}`;
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const fileStream = createWriteStream(outputPath);
    await new Promise((resolve, reject) => {
      response.body?.pipe(fileStream);
      response.body?.on('error', reject);
      fileStream.on('finish', resolve);
    });

    console.log(`Downloaded audio file: ${audioId} -> ${outputPath}`);
  } catch (error) {
    console.error(`Error downloading audio file ${audioId}:`, error);
    throw error;
  }
}

/**
 * Generate HLS segment from audio file
 */
async function generateHLSSegment(
  audioPath: string,
  outputDir: string,
  segmentIndex: number,
  startTime: number = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const segmentPath = join(outputDir, `segment_${segmentIndex.toString().padStart(3, '0')}.ts`);
    
    ffmpeg(audioPath)
      .setStartTime(startTime)
      .duration(SEGMENT_DURATION)
      .audioCodec('aac')
      .audioBitrate('128k')
      .format('mpegts')
      .output(segmentPath)
      .on('end', () => {
        console.log(`Generated segment: ${segmentPath}`);
        resolve(segmentPath);
      })
      .on('error', (err) => {
        console.error(`Error generating segment:`, err);
        reject(err);
      })
      .run();
  });
}

/**
 * Upload segment to Appwrite Storage
 */
async function uploadSegment(
  storage: Storage,
  segmentPath: string,
  segmentIndex: number
): Promise<void> {
  try {
    const fileId = `segment_${segmentIndex.toString().padStart(3, '0')}`;
    const fileStream = createReadStream(segmentPath);
    
    // Try to delete existing file first
    try {
      await storage.deleteFile(STREAM_BUCKET_ID, fileId);
    } catch (e) {
      // File doesn't exist, that's fine
    }

    // Upload new segment
    await storage.createFile(
      STREAM_BUCKET_ID,
      fileId,
      fileStream as any
    );

    console.log(`Uploaded segment: ${fileId}`);
  } catch (error) {
    console.error(`Error uploading segment:`, error);
    throw error;
  }
}

/**
 * Generate and upload M3U8 playlist
 */
async function generatePlaylist(
  storage: Storage,
  segmentIndices: number[],
  targetDuration: number = SEGMENT_DURATION
): Promise<void> {
  const playlistContent = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${targetDuration}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    ''
  ];

  // Add segments
  for (const index of segmentIndices) {
    playlistContent.push(`#EXTINF:${SEGMENT_DURATION}.0,`);
    const fileId = `segment_${index.toString().padStart(3, '0')}`;
    const segmentUrl = `${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/storage/buckets/${STREAM_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_FUNCTION_PROJECT_ID}`;
    playlistContent.push(segmentUrl);
  }

  const playlistText = playlistContent.join('\n');
  const playlistBuffer = Buffer.from(playlistText, 'utf-8');

  try {
    // Delete existing playlist
    try {
      await storage.deleteFile(STREAM_BUCKET_ID, 'master.m3u8');
    } catch (e) {
      // File doesn't exist
    }

    // Upload new playlist
    await storage.createFile(
      STREAM_BUCKET_ID,
      'master.m3u8',
      playlistBuffer as any
    );

    console.log('Updated master.m3u8 playlist');
  } catch (error) {
    console.error('Error updating playlist:', error);
    throw error;
  }
}

/**
 * Clean up old segments
 */
async function cleanupOldSegments(
  storage: Storage,
  currentSegmentIndices: number[]
): Promise<void> {
  try {
    // List all files in bucket
    const files = await storage.listFiles(STREAM_BUCKET_ID);
    
    for (const file of files.files) {
      if (file.$id.startsWith('segment_')) {
        const segmentIndex = parseInt(file.$id.replace('segment_', ''));
        
        // Delete if not in current playlist
        if (!currentSegmentIndices.includes(segmentIndex)) {
          try {
            await storage.deleteFile(STREAM_BUCKET_ID, file.$id);
            console.log(`Deleted old segment: ${file.$id}`);
          } catch (e) {
            console.error(`Error deleting segment ${file.$id}:`, e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up segments:', error);
  }
}

/**
 * Main streaming loop
 */
async function streamLoop(
  databases: Databases,
  storage: Storage,
  state: StreamState,
  tempDir: string
): Promise<StreamState> {
  const startTime = Date.now();
  const segments: number[] = [];

  // Generate segments for KEEP_ALIVE_INTERVAL duration
  while (Date.now() - startTime < KEEP_ALIVE_INTERVAL) {
    try {
      // Get current track
      const currentEntry = state.playlistEntries[state.currentTrackIndex];
      const audioId = currentEntry.audioId || currentEntry.naatId;

      // Download audio file
      const audioPath = join(tempDir, `audio_${audioId}.mp3`);
      if (!existsSync(audioPath)) {
        await downloadAudioFile(storage, audioId, audioPath);
      }

      // Generate segment
      const segmentPath = await generateHLSSegment(
        audioPath,
        tempDir,
        state.currentSegmentIndex,
        state.segmentStartTime
      );

      // Upload segment
      await uploadSegment(storage, segmentPath, state.currentSegmentIndex);

      // Track segment
      segments.push(state.currentSegmentIndex);
      
      // Keep only last PLAYLIST_SIZE segments
      if (segments.length > PLAYLIST_SIZE) {
        segments.shift();
      }

      // Update playlist
      await generatePlaylist(storage, segments);

      // Cleanup old segments
      if (state.currentSegmentIndex % 10 === 0) {
        await cleanupOldSegments(storage, segments);
      }

      // Update state
      state.currentSegmentIndex++;
      state.segmentStartTime += SEGMENT_DURATION;

      // Check if we need to advance to next track
      // Get track duration from database
      const naat = await databases.getDocument(
        process.env.APPWRITE_DATABASE_ID!,
        'naats',
        currentEntry.naatId
      );
      
      if (state.segmentStartTime >= naat.duration) {
        // Move to next track
        state.currentTrackIndex = (state.currentTrackIndex + 1) % state.playlistEntries.length;
        state.segmentStartTime = 0;
        
        console.log(`Advanced to next track: ${state.currentTrackIndex}`);
      }

      // Cleanup segment file
      try {
        unlinkSync(segmentPath);
      } catch (e) {
        // Ignore
      }

    } catch (error) {
      console.error('Error in streaming loop:', error);
      // Continue on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return state;
}

/**
 * Self-trigger to keep stream alive
 */
async function keepAlive(functions: Functions, state: StreamState): Promise<void> {
  try {
    console.log('Triggering keep-alive...');
    
    await functions.createExecution(
      process.env.APPWRITE_FUNCTION_ID!,
      JSON.stringify(state),
      false,
      '/',
      'POST' as any
    );
    
    console.log('Keep-alive triggered successfully');
  } catch (error) {
    console.error('Error triggering keep-alive:', error);
  }
}

/**
 * Main function handler
 */
export default async ({ req, res, log, error }: any) => {
  try {
    log('Live Stream Generator started');

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT!)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);
    const storage = new Storage(client);
    const functions = new Functions(client);

    // Create temp directory
    const tempDir = join(tmpdir(), `live-stream-${Date.now()}`);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Get or restore state
    let state: StreamState;
    
    if (req.body && req.body !== '') {
      // Restore state from previous execution
      state = JSON.parse(req.body);
      log('Restored state from previous execution');
    } else {
      // Initialize new state
      log('Initializing new stream state');
      
      const liveState = await databases.getDocument(
        process.env.APPWRITE_DATABASE_ID!,
        LIVE_RADIO_COLLECTION_ID,
        LIVE_RADIO_DOCUMENT_ID
      ) as unknown as LiveRadioState;

      state = {
        currentSegmentIndex: 0,
        playlistEntries: liveState.playlist.map(parsePlaylistEntry),
        currentTrackIndex: liveState.currentTrackIndex,
        segmentStartTime: 0
      };
    }

    log(`Starting stream loop with ${state.playlistEntries.length} tracks`);

    // Run streaming loop
    const updatedState = await streamLoop(databases, storage, state, tempDir);

    // Trigger keep-alive before timeout
    await keepAlive(functions, updatedState);

    // Cleanup temp directory
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      log('Error cleaning up temp directory');
    }

    return res.json({
      success: true,
      message: 'Stream loop completed, keep-alive triggered',
      segmentsGenerated: updatedState.currentSegmentIndex - state.currentSegmentIndex,
      currentTrack: updatedState.currentTrackIndex
    });

  } catch (err: any) {
    error('Error in live stream generator:', err);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
