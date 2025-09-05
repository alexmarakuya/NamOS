// NamOS Database State Checker
// This script checks the current state of your database before/after wiping
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../telegram-bot/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const checkDatabaseState = async () => {
  console.log('🔍 NamOS Database State Check');
  console.log('============================\n');

  try {
    // Check transactions
    console.log('📊 Checking transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (transError) {
      console.error('❌ Error fetching transactions:', transError);
    } else {
      console.log(`   Total transactions: ${transactions.length > 0 ? 'Found data' : '0 (clean)'}`);
      if (transactions.length > 0) {
        console.log('   Recent transactions:');
        transactions.forEach((t, i) => {
          console.log(`     ${i + 1}. $${t.amount} - ${t.description} (${t.type})`);
        });
      }
    }

    // Check attachments
    console.log('\n📎 Checking attachments...');
    const { data: attachments, error: attachError } = await supabase
      .from('attachments')
      .select('*')
      .limit(5);

    if (attachError) {
      console.error('❌ Error fetching attachments:', attachError);
    } else {
      console.log(`   Total attachments: ${attachments.length > 0 ? 'Found data' : '0 (clean)'}`);
      if (attachments.length > 0) {
        console.log('   Recent attachments:');
        attachments.forEach((a, i) => {
          console.log(`     ${i + 1}. ${a.file_name} (${a.file_type}) - ${(a.file_size / 1024).toFixed(1)}KB`);
        });
      }
    }

    // Check business units
    console.log('\n🏢 Checking business units...');
    const { data: businessUnits, error: buError } = await supabase
      .from('business_units')
      .select('*')
      .order('name');

    if (buError) {
      console.error('❌ Error fetching business units:', buError);
    } else {
      console.log(`   Total business units: ${businessUnits.length}`);
      if (businessUnits.length > 0) {
        console.log('   Business units:');
        businessUnits.forEach((bu, i) => {
          console.log(`     ${i + 1}. ${bu.name} (${bu.type})`);
        });
      }
    }

    // Check storage
    console.log('\n📁 Checking storage...');
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('transaction-attachments')
      .list('', { limit: 10 });

    if (storageError) {
      console.error('❌ Error checking storage:', storageError);
    } else {
      const fileCount = storageFiles ? storageFiles.length : 0;
      console.log(`   Storage files: ${fileCount > 0 ? `${fileCount} files found` : '0 (clean)'}`);
      if (fileCount > 0) {
        console.log('   Recent files:');
        storageFiles.slice(0, 5).forEach((f, i) => {
          console.log(`     ${i + 1}. ${f.name} (${f.metadata ? 'folder' : 'file'})`);
        });
      }
    }

    // Summary
    console.log('\n📋 Summary:');
    const hasTransactions = transactions && transactions.length > 0;
    const hasAttachments = attachments && attachments.length > 0;
    const hasStorageFiles = storageFiles && storageFiles.length > 0;
    const hasBusinessUnits = businessUnits && businessUnits.length > 0;

    if (!hasTransactions && !hasAttachments && !hasStorageFiles) {
      console.log('✅ Database appears to be clean and ready for production!');
      console.log('   • No transactions found');
      console.log('   • No attachments found');
      console.log('   • No storage files found');
      if (hasBusinessUnits) {
        console.log(`   • ${businessUnits.length} business units configured`);
      }
    } else {
      console.log('⚠️  Database contains test data:');
      if (hasTransactions) console.log('   • Transactions found - needs wiping');
      if (hasAttachments) console.log('   • Attachments found - needs wiping');
      if (hasStorageFiles) console.log('   • Storage files found - needs clearing');
      console.log('\n   Run the wipe script to clean for production');
    }

    // Check table schemas
    console.log('\n🗂️  Table Structure Check:');
    
    const tables = ['transactions', 'attachments', 'business_units'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${table}: Error (${error.message})`);
        } else {
          console.log(`   ✅ ${table}: Structure OK`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n🏁 Database state check completed!');
};

// Run if called directly
if (require.main === module) {
  checkDatabaseState().catch(console.error);
}

module.exports = { checkDatabaseState };
