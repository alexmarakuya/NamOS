// NamOS Storage Cleanup Script
// This script clears all test files from Supabase Storage
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../telegram-bot/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BUCKET_NAME = 'transaction-attachments';

const clearStorageFiles = async () => {
  console.log('🧹 Starting Supabase Storage cleanup...\n');

  try {
    // Step 1: List all files in the bucket
    console.log('1. Listing all files in storage...');
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('❌ Error listing files:', listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log('✅ No files found in storage - already clean!');
      return;
    }

    console.log(`📁 Found ${files.length} items in storage`);

    // Step 2: Get all file paths (including subdirectories)
    const getAllFilePaths = async (path = '') => {
      const { data: items, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(path, { limit: 1000 });

      if (error) {
        console.error(`Error listing path ${path}:`, error);
        return [];
      }

      let allPaths = [];
      
      for (const item of items) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        
        if (item.metadata === null) {
          // This is a file
          allPaths.push(fullPath);
        } else {
          // This might be a directory, recurse into it
          const subPaths = await getAllFilePaths(fullPath);
          allPaths = allPaths.concat(subPaths);
        }
      }
      
      return allPaths;
    };

    console.log('2. Scanning all directories for files...');
    const allFilePaths = await getAllFilePaths();
    
    if (allFilePaths.length === 0) {
      console.log('✅ No files to delete - storage is clean!');
      return;
    }

    console.log(`📄 Found ${allFilePaths.length} files to delete`);
    
    // Step 3: Delete files in batches
    const batchSize = 50; // Supabase has limits on batch operations
    const batches = [];
    
    for (let i = 0; i < allFilePaths.length; i += batchSize) {
      batches.push(allFilePaths.slice(i, i + batchSize));
    }

    console.log(`3. Deleting files in ${batches.length} batches...`);
    
    let totalDeleted = 0;
    let errors = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Batch ${i + 1}/${batches.length}: Deleting ${batch.length} files...`);
      
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (deleteError) {
        console.error(`   ❌ Error in batch ${i + 1}:`, deleteError);
        errors.push(deleteError);
      } else {
        const deletedCount = deleteData ? deleteData.length : 0;
        totalDeleted += deletedCount;
        console.log(`   ✅ Batch ${i + 1} completed: ${deletedCount} files deleted`);
      }

      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 4: Verify cleanup
    console.log('\n4. Verifying cleanup...');
    const { data: remainingFiles, error: verifyError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 10 });

    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError);
    } else {
      const remainingCount = remainingFiles ? remainingFiles.length : 0;
      
      if (remainingCount === 0) {
        console.log('✅ Storage cleanup completed successfully!');
      } else {
        console.log(`⚠️  ${remainingCount} items may still remain in storage`);
      }
    }

    // Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Files deleted: ${totalDeleted}`);
    console.log(`   Errors encountered: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
      });
    }

    console.log('\n🎉 Storage cleanup process completed!');

  } catch (error) {
    console.error('❌ Unexpected error during storage cleanup:', error);
  }
};

// Alternative: Nuclear option - recreate the bucket
const recreateBucket = async () => {
  console.log('💥 Nuclear option: Recreating storage bucket...\n');
  
  try {
    // Delete the entire bucket
    console.log('1. Deleting bucket...');
    const { error: deleteError } = await supabase.storage.deleteBucket(BUCKET_NAME);
    
    if (deleteError && !deleteError.message.includes('not found')) {
      console.error('❌ Error deleting bucket:', deleteError);
      return;
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Recreate the bucket
    console.log('2. Recreating bucket...');
    const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/*', 'application/pdf'],
      fileSizeLimit: 10 * 1024 * 1024 // 10MB
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return;
    }

    console.log('✅ Bucket recreated successfully!');
    console.log('⚠️  You may need to reconfigure RLS policies');

  } catch (error) {
    console.error('❌ Error in nuclear option:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧹 NamOS Storage Cleanup Tool\n');
  
  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in environment');
    process.exit(1);
  }

  // Check command line arguments
  const args = process.argv.slice(2);
  const useNuclearOption = args.includes('--nuclear') || args.includes('--recreate');

  if (useNuclearOption) {
    console.log('⚠️  Using nuclear option - this will recreate the entire bucket!');
    await recreateBucket();
  } else {
    console.log('Using safe cleanup - this will delete files but preserve bucket structure');
    await clearStorageFiles();
  }

  console.log('\n🏁 Done!');
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { clearStorageFiles, recreateBucket };
