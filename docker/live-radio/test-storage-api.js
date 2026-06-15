/**
 * Test script to explore Appwrite Storage API
 * Check what data we can get from storage.listFiles() for radio fallback
 */

require('dotenv').config();
const { Client, Storage, Query } = require('node-appwrite');

const AUDIO_BUCKET_ID = 'audio-files'; // Your audio bucket ID

async function testStorageAPI() {
  console.log('🔍 Testing Appwrite Storage API for Radio Fallback\n');
  
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const storage = new Storage(client);

  try {
    console.log('📦 Fetching files from storage bucket...');
    console.log(`   Bucket ID: ${AUDIO_BUCKET_ID}\n`);
    
    // Test 1: Basic listFiles without filters
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Basic listFiles (first 25 files)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const basicResponse = await storage.listFiles(
      AUDIO_BUCKET_ID,
      [Query.limit(25)]
    );
    
    console.log(`✅ Total files in response: ${basicResponse.files.length}`);
    console.log(`📊 Total files in bucket: ${basicResponse.total}\n`);
    
    if (basicResponse.files.length > 0) {
      console.log('Sample file structure:');
      console.log(JSON.stringify(basicResponse.files[0], null, 2));
      console.log('\n');
      
      // Display first 5 files
      console.log('First 5 files:');
      basicResponse.files.slice(0, 5).forEach((file, idx) => {
        console.log(`${idx + 1}. ID: ${file.$id}`);
        console.log(`   Name: ${file.name}`);
        console.log(`   Size: ${(file.sizeOriginal / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Created: ${file.$createdAt}`);
        console.log('');
      });
    }
    
    // Test 2: Check if we can filter or search
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Available file properties');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (basicResponse.files.length > 0) {
      const sampleFile = basicResponse.files[0];
      console.log('Properties available in file object:');
      Object.keys(sampleFile).forEach(key => {
        console.log(`  - ${key}: ${typeof sampleFile[key]}`);
      });
    }
    
    // Test 3: Pagination test
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Pagination (fetching in batches)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    let totalFetched = 0;
    let offset = 0;
    const limit = 100;
    const maxToFetch = 500; // Test with first 500 files
    
    console.log('Fetching files in batches...');
    while (totalFetched < maxToFetch) {
      const response = await storage.listFiles(
        AUDIO_BUCKET_ID,
        [
          Query.limit(limit),
          Query.offset(offset)
        ]
      );
      
      totalFetched += response.files.length;
      console.log(`  Batch ${Math.floor(offset / limit) + 1}: Fetched ${response.files.length} files (Total: ${totalFetched})`);
      
      if (response.files.length < limit) {
        console.log(`  ✅ Reached end of files`);
        break;
      }
      
      offset += limit;
    }
    
    console.log(`\n📊 Total files fetched: ${totalFetched}`);
    
    // Test 4: Estimate read cost
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: Read cost estimation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const totalFiles = basicResponse.total;
    const batchSize = 100;
    const batchesNeeded = Math.ceil(totalFiles / batchSize);
    
    console.log(`Total audio files in storage: ${totalFiles}`);
    console.log(`Batch size: ${batchSize} files per request`);
    console.log(`Batches needed: ${batchesNeeded}`);
    console.log(`Estimated reads per fetch: ${batchesNeeded} reads`);
    console.log(`\nComparison:`);
    console.log(`  Database fetch: 5000 reads (with filters, metadata)`);
    console.log(`  Storage API:    ~${batchesNeeded} reads (file IDs only, no metadata)`);
    
    // Test 5: Check file naming patterns
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: File naming patterns');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const sampleFiles = basicResponse.files.slice(0, 10);
    console.log('Sample file IDs and names:');
    sampleFiles.forEach((file, idx) => {
      console.log(`${idx + 1}. ${file.$id} -> "${file.name}"`);
    });
    
    console.log('\n⚠️  NOTE: Storage API limitations:');
    console.log('   - Cannot filter by radio=true flag');
    console.log('   - No title, duration, or metadata');
    console.log('   - Cannot exclude naats marked as exclude=true');
    console.log('   - File name might not be meaningful for display');
    console.log('   - Will play ALL audio files (including non-radio naats)');
    
    // Test 6: Generate a sample playlist structure
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 6: Sample playlist structure from storage');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const samplePlaylist = basicResponse.files.slice(0, 5).map(file => ({
      id: file.$id,
      title: file.name || `Track ${file.$id}`,
      audioUrl: `https://sgp.cloud.appwrite.io/v1/storage/buckets/${AUDIO_BUCKET_ID}/files/${file.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`,
      duration: 300 // Default duration since we don't know
    }));
    
    console.log('Sample playlist entries:');
    console.log(JSON.stringify(samplePlaylist, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error testing storage API:', error);
    
    if (error.code === 402) {
      console.log('\n💡 Got 402 error - Storage reads also exhausted!');
      console.log('   This means storage.listFiles will NOT work as fallback.');
      console.log('   You MUST use static JSON export instead.');
    } else if (error.code === 429) {
      console.log('\n💡 Got 429 error - Rate limited on storage API');
      console.log('   Storage API has its own rate limits.');
    }
  }
}

// Run the test
testStorageAPI()
  .then(() => {
    console.log('\n✅ Storage API test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  });
