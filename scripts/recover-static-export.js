const fs = require('fs');
const path = require('path');
const { Client, Storage, Query } = require('node-appwrite');

const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '695bb97700213f4ef5dd';
const APPWRITE_API_KEY = 'standard_660d361514aaa69487835a4be50a0425800c53a92a3170d280a6d26750cd7d2b20c5edfb52c95b01d458d75f99a1ba91e7ef5ae8c09f6c6fc987fb90c819aa4899f1f4508e9fa44656b0059747bb69cfaaf8c43c52036177f5d1628da61c2862940e4291d43800690960eccef4ff5cb2a9358d88593c7bb048df5b53a769d37c';
const YOUTUBE_API_KEY = 'AIzaSyA1rxvVTECDW4cSleuY6rZwVfKLHMuRw9Q';
const BUCKET_ID = 'audio-files';
const MAX_FILES = 1000;
const YT_BATCH_SIZE = 50;

const OUTPUT_DIR = path.join(__dirname, '../static-exports');
const NAATS_OUTPUT = path.join(OUTPUT_DIR, 'naats-export.json');
const CHANNELS_OUTPUT = path.join(OUTPUT_DIR, 'channels-export.json');

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);
const storage = new Storage(client);

async function listAllFiles(maxFiles) {
  const allFiles = [];
  let offset = 0;
  while (allFiles.length < maxFiles) {
    const limit = Math.min(25, maxFiles - allFiles.length);
    const page = await storage.listFiles(BUCKET_ID, [
      Query.limit(limit), Query.orderDesc('$createdAt'), Query.offset(offset),
    ]);
    allFiles.push(...page.files);
    if (page.files.length < limit) break;
    offset += limit;
  }
  return allFiles.slice(0, maxFiles);
}

async function fetchYouTube(ids) {
  const metadata = {};
  for (let i = 0; i < ids.length; i += YT_BATCH_SIZE) {
    const batch = ids.slice(i, i + YT_BATCH_SIZE);
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${batch.join(',')}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    if (!data.items) continue;
    for (const item of data.items) metadata[item.id] = item;
    if (i + YT_BATCH_SIZE < ids.length) await new Promise(r => setTimeout(r, 200));
  }
  return metadata;
}

function parseDuration(d) {
  if (!d) return 0;
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return (parseInt(m?.[1]||'0')*3600) + (parseInt(m?.[2]||'0')*60) + parseInt(m?.[3]||'0');
}

function deriveChannelId(title) {
  const map = {
    'Owais Raza Qadri': 'owais-raza-qadri',
    'Baghdadi Sound & Video': 'baghdadi-sound-video',
    'Qtv USA': 'qtv-usa',
    'Qtv Canada': 'qtv-canada',
    'Dunya Media': 'dunya-media',
  };
  return map[title] || title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'unknown';
}

async function main() {
  console.log('=== Recovery Static Export ===\n');

  console.log(`Fetching ${MAX_FILES} files from Storage...`);
  const allFiles = await listAllFiles(MAX_FILES);
  console.log(`Got ${allFiles.length} files`);

  const rawFiles = allFiles.filter(f => f.name.endsWith('.m4a'));
  const cutFiles = allFiles.filter(f => f.name.endsWith('.mp4'));
  const seenDocIds = new Set();

  console.log(`  .m4a (named by YouTube ID): ${rawFiles.length}`);
  console.log(`  .mp4 (cut audio): ${cutFiles.length}\n`);

  // Build YouTube ID -> storage ID map from .m4a files
  const ytToStorage = {};
  for (const f of rawFiles) {
    const ytId = path.parse(f.name).name;
    ytToStorage[ytId] = f.$id;
  }

  const rawYtIds = Object.keys(ytToStorage);
  console.log(`Fetching YouTube metadata for ${rawYtIds.length} IDs...`);
  const ytMeta = await fetchYouTube(rawYtIds);
  console.log(`Got ${Object.keys(ytMeta).length} results\n`);

  const naats = [];
  const channelsSet = new Map();

  // 1. Process cut .mp4 files (have audio, need metadata from YouTube)
  for (const file of cutFiles) {
    const docId = path.parse(file.name).name.replace(/_cut$/, '');
    if (seenDocIds.has(docId)) continue;
    seenDocIds.add(docId);

    const createdDate = new Date(file.$createdAt);
    const title = createdDate.toISOString().split('T')[0] + ' - Naat';
    const chName = 'Owais Raza Qadri';
    const chId = 'owais-raza-qadri';

    naats.push({
      $id: file.$id,
      youtubeId: docId,
      title: title,
      channelName: chName,
      channelId: chId,
      uploadDate: file.$createdAt,
      duration: 0,
      thumbnailUrl: '',
      views: 0,
      audioId: file.$id,
      cutAudio: file.$id,
      exclude: false,
    });

    if (!channelsSet.has(chId)) {
      channelsSet.set(chId, {
        channelId: chId, channelName: chName, isOfficial: true, isOther: false, type: 'channel', playlistId: null,
      });
    }
  }

  console.log(`Cut files added: ${naats.length} (with working audio, placeholder titles)`);

  // 2. Process .m4a files that have YouTube metadata (full data + audio)
  let m4aAdded = 0;
  for (const [ytId, storageId] of Object.entries(ytToStorage)) {
    if (seenDocIds.has(ytId)) continue;
    const yt = ytMeta[ytId];
    if (!yt) continue;
    const sn = yt.snippet;
    const chTitle = sn.channelTitle || 'Unknown';
    const chId = deriveChannelId(chTitle);
    const dur = parseDuration(yt.contentDetails?.duration);
    const thumb = sn.thumbnails?.maxres?.url || sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || '';
    seenDocIds.add(ytId);

    naats.push({
      $id: storageId,
      youtubeId: ytId,
      title: sn.title || ytId,
      channelName: chTitle,
      channelId: chId,
      uploadDate: sn.publishedAt,
      duration: dur,
      thumbnailUrl: thumb,
      views: 0,
      audioId: storageId,
      cutAudio: storageId,
      exclude: false,
    });

    if (!channelsSet.has(chId)) {
      channelsSet.set(chId, {
        channelId: chId, channelName: chTitle, isOfficial: true, isOther: false, type: 'channel', playlistId: null,
      });
    }
    m4aAdded++;
  }

  console.log(`.m4a files added: ${m4aAdded} (with YouTube metadata + audio)`);

  const audioCount = naats.filter(n => n.audioId).length;
  console.log(`\nTotal: ${naats.length} naats, ${audioCount} with audio, ${channelsSet.size} channels\n`);

  const naatsExport = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalItems: naats.length,
      version: '1.0',
      source: 'Recovered from Storage API + YouTube API',
      note: 'TEMPORARY export. Cut files have placeholder titles (date-based) but working audio. On July 1st run export-naats-to-json.js for proper data.',
    },
    data: naats.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)),
  };

  const channelsExport = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalItems: channelsSet.size,
      version: '1.0',
      source: 'Recovered from Storage API + YouTube API',
    },
    data: Array.from(channelsSet.values()),
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(NAATS_OUTPUT, JSON.stringify(naatsExport, null, 2));
  console.log(`Saved: ${NAATS_OUTPUT} (${(fs.statSync(NAATS_OUTPUT).size/1024/1024).toFixed(2)} MB)`);
  fs.writeFileSync(CHANNELS_OUTPUT, JSON.stringify(channelsExport, null, 2));
  console.log(`Saved: ${CHANNELS_OUTPUT} (${(fs.statSync(CHANNELS_OUTPUT).size/1024).toFixed(2)} KB)`);
  console.log('\n=== Recovery complete ===');
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
