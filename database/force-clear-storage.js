// Force clear Supabase Storage - handles nested directories
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../telegram-bot/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BUCKET_NAME = 'transaction-attachments';

const forceClearStorage = async () => {
  console.log('🧹 Force clearing Supabase Storage...\n');

  try {
    // Recursive function to get all files in all subdirectories
    const getAllFiles = async (prefix = '') => {
      const { data: items, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(prefix, { limit: 1000 });

      if (error) {
        console.error(`Error listing ${prefix}:`, error);
        return [];
      }

      let allFiles = [];
      
      for (const item of items) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        
        // Check if it's a file or directory by trying to get its metadata
        if (item.id) {
          // It's a file
          allFiles.push(fullPath);
          console.log(`   Found file: ${fullPath}`);
        } else {
          // It might be a directory, recurse into it
          console.log(`   Scanning directory: ${fullPath}`);
          const subFiles = await getAllFiles(fullPath);
          allFiles = allFiles.concat(subFiles);
        }
      }
      
      return allFiles;
    };

    console.log('1. Recursively scanning all directories...');
    const allFiles = await getAllFiles();
    
    console.log(`\n2. Found ${allFiles.length} files to delete`);
    
    if (allFiles.length === 0) {
      console.log('✅ No files found - storage is already clean!');
      return;
    }

    // Delete files in smaller batches
    const batchSize = 10; // Smaller batches for better success rate
    let totalDeleted = 0;
    
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allFiles.length / batchSize);
      
      console.log(`\n   Batch ${batchNum}/${totalBatches}: Deleting ${batch.length} files...`);
      batch.forEach(file => console.log(`     - ${file}`));
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (error) {
        console.error(`   ❌ Error in batch ${batchNum}:`, error);
        // Try deleting files one by one
        for (const file of batch) {
          const { error: singleError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([file]);
          
          if (singleError) {
            console.error(`     ❌ Failed to delete ${file}:`, singleError);
          } else {
            console.log(`     ✅ Deleted ${file}`);
            totalDeleted++;
          }
        }
      } else {
        const deletedCount = data ? data.length : 0;
        totalDeleted += deletedCount;
        console.log(`   ✅ Batch ${batchNum} completed: ${deletedCount} files deleted`);
      }

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n3. Final verification...`);
    const { data: remainingFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 100 });

    const remainingCount = remainingFiles ? remainingFiles.length : 0;
    
    console.log('\n📊 Final Summary:');
    console.log(`   Files deleted: ${totalDeleted}`);
    console.log(`   Files remaining: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('✅ Storage completely cleared!');
    } else {
      console.log('⚠️  Some files may still remain');
      console.log('\nRemaining items:');
      remainingFiles.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.name} ${item.id ? '(file)' : '(directory)'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during force clear:', error);
  }
};

// Run if called directly
if (require.main === module) {
  forceClearStorage().catch(console.error);
}

module.exports = { forceClearStorage };
