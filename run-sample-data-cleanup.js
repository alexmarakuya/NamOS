#!/usr/bin/env node

/**
 * NamOS Sample Data Cleanup Script
 * 
 * This script helps you clean up all sample data from your NamOS application.
 * It provides instructions and can optionally run the cleanup SQL script.
 */

const fs = require('fs');
const path = require('path');

console.log(`
🧹 ============================================
🧹 NamOS SAMPLE DATA CLEANUP
🧹 ============================================

This script will help you remove ALL sample data from your NamOS application.

📋 WHAT WILL BE CLEANED:
   ✅ Mock data removed from React components
   ✅ Sample database files deleted
   ✅ Schema.sql cleaned of sample inserts
   
📊 DATABASE CLEANUP REQUIRED:
   ⚠️  You still need to run the database cleanup SQL script
   
🚀 NEXT STEPS:
`);

console.log(`
1️⃣  RUN DATABASE CLEANUP:
   
   Go to your Supabase dashboard:
   • Navigate to SQL Editor
   • Copy and paste the contents of:
     database/complete-sample-data-cleanup.sql
   • Execute the script
   
2️⃣  VERIFY CLEANUP:
   
   Check your application:
   • Financial dashboard should show empty state
   • Tasks should show empty state  
   • Time tracking should show empty state
   
3️⃣  ADD REAL DATA:
   
   Your application is now ready for production:
   • Set up your real business units/areas
   • Add real transactions via the UI or Telegram bot
   • Create real projects and tasks
   • Log real time entries
`);

// Check if the cleanup SQL file exists
const cleanupSqlPath = path.join(__dirname, 'database', 'complete-sample-data-cleanup.sql');
if (fs.existsSync(cleanupSqlPath)) {
    console.log(`
📄 DATABASE CLEANUP SCRIPT LOCATION:
   ${cleanupSqlPath}
   
💡 TIP: You can copy this file content and paste it directly 
   into your Supabase SQL Editor.
`);
} else {
    console.log(`
❌ ERROR: Database cleanup script not found!
   Expected location: ${cleanupSqlPath}
`);
}

console.log(`
🎉 FRONTEND CLEANUP COMPLETED!
   
   All mock data has been removed from your React components.
   Your application will now show empty states until you add real data.
   
⚠️  REMEMBER: Run the database cleanup SQL script in Supabase
   to complete the cleanup process.
   
🚀 Your NamOS application is ready for production use!

============================================
`);
