/**
 * Export Naats to Static JSON
 * 
 * This script exports all naats from Appwrite to a static JSON file
 * that can be used as a fallback when database read limits are exceeded.
 * 
 * Usage:
 *   node scripts/export-naats-to-json.js
 * 
 * Output:
 *   static-exports/naats-export.json
 *   static-exports/channels-export.json
 */

const { Client, Databases, Query } = require('node-appwrite');
const fs = require('fs-extra');
const path = require('path');

// Load environment variables
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID;
const CHANNELS_COLLECTION_ID = process.env.APPWRITE_CHANNELS_COLLECTION_ID;

const OUTPUT_DIR = path.join(__dirname, '../static-exports');
const NAATS_OUTPUT = path.join(OUTPUT_DIR, 'naats-export.json');
const CHANNELS_OUTPUT = path.join(OUTPUT_DIR, 'channels-export.json');

/**
 * Fetch all naats from Appwrite in batches
 */
async function fetchAllNaats() {
  console.log('📥 Fetching all naats from Appwrite...');
  
  const allNaats = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;
  let batchCount = 0;

  while (hasMore) {
    batchCount++;
    console.log(`  Batch ${batchCount}: offset ${offset}...`);

    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        NAATS_COLLECTION_ID,
        [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc('uploadDate'),
          Query.or([
            Query.equal('exclude', false),
            Query.isNull('exclude')
          ])
        ]
      );

      allNaats.push(...response.documents);
      hasMore = response.documents.length === limit;
      offset += limit;

      console.log(`    ✓ Fetched ${response.documents.length} naats (total: ${allNaats.length})`);

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`    ✗ Error fetching batch ${batchCount}:`, error.message);
      
      if (error.code === 429) {
        console.log('    ⏳ Rate limited, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue; // Retry same batch
      }
      
      throw error;
    }
  }

  console.log(`✅ Fetched ${allNaats.length} naats in ${batchCount} batches`);
  return allNaats;
}

/**
 * Fetch all channels from Appwrite
 */
async function fetchAllChannels() {
  console.log('📥 Fetching all channels from Appwrite...');

  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      CHANNELS_COLLECTION_ID,
      [
        Query.orderAsc('channelName'),
        Query.limit(100)
      ]
    );

    console.log(`✅ Fetched ${response.documents.length} channels`);
    return response.documents;

  } catch (error) {
    console.error('✗ Error fetching channels:', error.message);
    throw error;
  }
}

/**
 * Generate export metadata
 */
function generateMetadata(itemCount) {
  return {
    exportedAt: new Date().toISOString(),
    totalItems: itemCount,
    version: '1.0',
    source: 'Appwrite Database',
    expiresAt: null, // Never expires, but should be refreshed monthly
    note: 'This is a static fallback export. Data may be outdated.'
  };
}

/**
 * Main export function
 */
async function exportData() {
  console.log('🚀 Starting data export...\n');

  try {
    // Ensure output directory exists
    await fs.ensureDir(OUTPUT_DIR);
    console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

    // Fetch naats
    const naats = await fetchAllNaats();
    console.log('');

    // Fetch channels
    const channels = await fetchAllChannels();
    console.log('');

    // Prepare naats export
    const naatsExport = {
      metadata: generateMetadata(naats.length),
      data: naats
    };

    // Prepare channels export
    const channelsExport = {
      metadata: generateMetadata(channels.length),
      data: channels
    };

    // Write naats to file
    console.log('💾 Writing naats to file...');
    await fs.writeJson(NAATS_OUTPUT, naatsExport, { spaces: 2 });
    const naatsSize = (await fs.stat(NAATS_OUTPUT)).size;
    console.log(`✅ Saved: ${NAATS_OUTPUT}`);
    console.log(`   Size: ${(naatsSize / 1024 / 1024).toFixed(2)} MB`);

    // Write channels to file
    console.log('💾 Writing channels to file...');
    await fs.writeJson(CHANNELS_OUTPUT, channelsExport, { spaces: 2 });
    const channelsSize = (await fs.stat(CHANNELS_OUTPUT)).size;
    console.log(`✅ Saved: ${CHANNELS_OUTPUT}`);
    console.log(`   Size: ${(channelsSize / 1024).toFixed(2)} KB`);

    console.log('\n✅ Export completed successfully!\n');

    // Print summary
    console.log('📊 Summary:');
    console.log(`   Naats: ${naats.length}`);
    console.log(`   Channels: ${channels.length}`);
    console.log(`   Total size: ${((naatsSize + channelsSize) / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

    console.log('📤 Next steps:');
    console.log('   1. Commit files to Git:');
    console.log('      git add static-exports/');
    console.log('      git commit -m "Add static export for fallback"');
    console.log('      git push');
    console.log('');
    console.log('   2. Access via jsDelivr CDN:');
    console.log('      https://cdn.jsdelivr.net/gh/sahilhasnain/naat-collection@main/static-exports/naats-export.json');
    console.log('      https://cdn.jsdelivr.net/gh/sahilhasnain/naat-collection@main/static-exports/channels-export.json');
    console.log('');
    console.log('   3. Update app with fallback logic (see implementation files)');

  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run export
exportData();
