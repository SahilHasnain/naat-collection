/**
 * Export Naats to Static JSON
 * 
 * This script exports all naats from Appwrite to a static JSON file
 * that can be used as a fallback when database read limits are exceeded.
 * 
 * Usage:
 *   APP_PROJECT_ID=naat-collection node scripts/export-naats-to-json.js
 *   APP_PROJECT_ID=naat-production node scripts/export-naats-to-json.js
 * 
 * Output:
 *   static-exports/<project-id>/naats-export.json
 *   static-exports/<project-id>/channels-export.json
 */

const { Client, Databases, Query } = require('node-appwrite');
const fs = require('fs-extra');
const path = require('path');

// Load environment variables
const projectId = process.env.APP_PROJECT_ID || 'naat-collection';
require('dotenv').config({ path: path.join(__dirname, `../.env.${projectId}`) });
const { getProject } = require('../apps/mobile/brands');
let brand;
try {
  brand = getProject(projectId);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || brand.appwrite.endpoint)
  .setProject(process.env.APPWRITE_PROJECT_ID || brand.appwrite.projectId)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || brand.appwrite.databaseId;
const NAATS_COLLECTION_ID = process.env.APPWRITE_NAATS_COLLECTION_ID || brand.appwrite.naatsCollectionId;
const CHANNELS_COLLECTION_ID = process.env.APPWRITE_CHANNELS_COLLECTION_ID || brand.appwrite.channelsCollectionId;

const OUTPUT_DIR = path.join(__dirname, '../static-exports', projectId);
const NAATS_OUTPUT = path.join(OUTPUT_DIR, 'naats-export.json');
const CHANNELS_OUTPUT = path.join(OUTPUT_DIR, 'channels-export.json');
const ROOT_NAATS_OUTPUT = path.join(__dirname, '../static-exports/naats-export.json');
const ROOT_CHANNELS_OUTPUT = path.join(__dirname, '../static-exports/channels-export.json');

if (!process.env.APPWRITE_API_KEY) {
  console.error('APPWRITE_API_KEY is required; provide it through the environment or apps/mobile/.env.local.');
  process.exit(2);
}
if (!DATABASE_ID || !NAATS_COLLECTION_ID || !CHANNELS_COLLECTION_ID) {
  console.error(`Project "${projectId}" is missing Appwrite database/collection IDs.`);
  process.exit(2);
}

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

    // Legacy YouTube/upload tools consume root exports for the main brand only.
    if (projectId === 'naat-collection') {
      await fs.writeJson(ROOT_NAATS_OUTPUT, naatsExport, { spaces: 2 });
      await fs.writeJson(ROOT_CHANNELS_OUTPUT, channelsExport, { spaces: 2 });
      console.log('✅ Mirrored naat-collection exports to static-exports/ root for upload tools');
    }

    console.log('\n✅ Export completed successfully!\n');

    // Print summary
    console.log('📊 Summary:');
    console.log(`   Naats: ${naats.length}`);
    console.log(`   Channels: ${channels.length}`);
    console.log(`   Total size: ${((naatsSize + channelsSize) / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

    console.log('📤 Next steps:');
    console.log('   1. Commit files to Git:');
    console.log(`      git add static-exports/${projectId}/`);
    console.log('      git commit -m "Add static export for fallback"');
    console.log('      git push');
    console.log('');
    console.log('   2. Access via jsDelivr CDN:');
    console.log(`      ${brand.static.naatsUrl}`);
    console.log(`      ${brand.static.channelsUrl}`);
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
