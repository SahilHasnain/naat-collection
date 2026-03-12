/**
 * Live Stream Health Check
 * 
 * Monitors stream health and auto-restarts if needed
 * Run this every 5 minutes via cron or scheduled execution
 */

import { Client, Functions, Storage } from 'node-appwrite';

const STREAM_BUCKET_ID = 'live-stream';
const STREAM_GENERATOR_FUNCTION_ID = 'live-stream-generator'; // Update with actual ID
const MAX_SEGMENT_AGE = 60000; // 60 seconds

interface HealthStatus {
  isHealthy: boolean;
  issues: string[];
  segmentCount: number;
  lastSegmentAge: number;
  playlistExists: boolean;
}

/**
 * Check stream health
 */
async function checkStreamHealth(storage: Storage): Promise<HealthStatus> {
  const issues: string[] = [];
  let segmentCount = 0;
  let lastSegmentAge = 0;
  let playlistExists = false;

  try {
    // List files in stream bucket
    const files = await storage.listFiles(STREAM_BUCKET_ID);
    
    // Check if playlist exists
    const playlist = files.files.find(f => f.$id === 'master.m3u8');
    playlistExists = !!playlist;
    
    if (!playlistExists) {
      issues.push('Playlist (master.m3u8) not found');
    } else {
      // Check playlist age
      const playlistAge = Date.now() - new Date(playlist.$updatedAt).getTime();
      if (playlistAge > MAX_SEGMENT_AGE) {
        issues.push(`Playlist is stale (${Math.floor(playlistAge / 1000)}s old)`);
      }
    }

    // Count segments
    const segments = files.files.filter(f => f.$id.startsWith('segment_'));
    segmentCount = segments.length;

    if (segmentCount === 0) {
      issues.push('No segments found');
    } else if (segmentCount < 3) {
      issues.push(`Only ${segmentCount} segments (expected 6)`);
    }

    // Check most recent segment age
    if (segments.length > 0) {
      const latestSegment = segments.reduce((latest, current) => {
        return new Date(current.$updatedAt) > new Date(latest.$updatedAt) ? current : latest;
      });
      
      lastSegmentAge = Date.now() - new Date(latestSegment.$updatedAt).getTime();
      
      if (lastSegmentAge > MAX_SEGMENT_AGE) {
        issues.push(`Latest segment is ${Math.floor(lastSegmentAge / 1000)}s old`);
      }
    }

  } catch (error: any) {
    issues.push(`Error checking storage: ${error.message}`);
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    segmentCount,
    lastSegmentAge,
    playlistExists
  };
}

/**
 * Restart stream by triggering generator function
 */
async function restartStream(functions: Functions): Promise<void> {
  try {
    console.log('Attempting to restart stream...');
    
    await functions.createExecution(
      STREAM_GENERATOR_FUNCTION_ID,
      '',
      false,
      '/',
      'POST'
    );
    
    console.log('Stream restart triggered successfully');
  } catch (error: any) {
    console.error('Error restarting stream:', error);
    throw error;
  }
}

/**
 * Main function handler
 */
export default async ({ req, res, log, error }: any) => {
  try {
    log('Running stream health check...');

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT!)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const storage = new Storage(client);
    const functions = new Functions(client);

    // Check stream health
    const health = await checkStreamHealth(storage);

    log(`Health check complete: ${health.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    log(`Segments: ${health.segmentCount}, Last segment age: ${Math.floor(health.lastSegmentAge / 1000)}s`);

    if (!health.isHealthy) {
      log(`Issues found: ${health.issues.join(', ')}`);
      
      // Auto-restart if stream is down
      const shouldRestart = 
        !health.playlistExists || 
        health.segmentCount === 0 || 
        health.lastSegmentAge > MAX_SEGMENT_AGE;

      if (shouldRestart) {
        log('Stream appears to be down, triggering restart...');
        await restartStream(functions);
        
        return res.json({
          success: true,
          health,
          action: 'restarted',
          message: 'Stream was unhealthy and has been restarted'
        });
      }
    }

    return res.json({
      success: true,
      health,
      action: 'none',
      message: health.isHealthy ? 'Stream is healthy' : 'Stream has minor issues but is running'
    });

  } catch (err: any) {
    error('Error in health check:', err);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
