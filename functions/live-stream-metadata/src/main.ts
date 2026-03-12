/**
 * Live Stream Metadata API
 * 
 * Returns current track information for the live stream
 * Frontend polls this endpoint to update UI
 */

import { Client, Databases } from 'node-appwrite';

const LIVE_RADIO_COLLECTION_ID = 'live_radio';
const LIVE_RADIO_DOCUMENT_ID = 'current_state';

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
 * Main function handler
 */
export default async ({ req, res, log, error }: any) => {
  try {
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT!)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new Databases(client);

    // Get current live radio state
    const state = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      LIVE_RADIO_COLLECTION_ID,
      LIVE_RADIO_DOCUMENT_ID
    ) as unknown as LiveRadioState;

    // Parse current track
    const currentEntry = parsePlaylistEntry(state.playlist[state.currentTrackIndex]);

    // Get track details
    const naat = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      'naats',
      currentEntry.naatId
    );

    // Get upcoming tracks (next 3)
    const upcomingTracks = [];
    for (let i = 1; i <= 3; i++) {
      const nextIndex = (state.currentTrackIndex + i) % state.playlist.length;
      const nextEntry = parsePlaylistEntry(state.playlist[nextIndex]);
      
      try {
        const nextNaat = await databases.getDocument(
          process.env.APPWRITE_DATABASE_ID!,
          'naats',
          nextEntry.naatId
        );
        
        upcomingTracks.push({
          id: nextNaat.$id,
          title: nextNaat.title,
          duration: nextNaat.duration
        });
      } catch (e) {
        // Skip if track not found
      }
    }

    // Calculate elapsed time since track started
    const trackStartTime = new Date(state.updatedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - trackStartTime) / 1000);

    return res.json({
      success: true,
      currentTrack: {
        id: naat.$id,
        title: naat.title,
        duration: naat.duration,
        thumbnailUrl: naat.thumbnailUrl,
        startedAt: state.updatedAt,
        elapsedSeconds: Math.min(elapsedSeconds, naat.duration)
      },
      upcomingTracks,
      streamUrl: `${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/storage/buckets/live-stream/files/master.m3u8/view?project=${process.env.APPWRITE_FUNCTION_PROJECT_ID}`
    });

  } catch (err: any) {
    error('Error fetching metadata:', err);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
