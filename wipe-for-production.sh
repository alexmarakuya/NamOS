#!/bin/bash

# NamOS Production Wipe Script
# This script safely wipes all test data to prepare for real production data

set -e

echo "🧹 NamOS Production Data Wipe"
echo "============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the NamOS root directory"
    exit 1
fi

# Check for environment variables
if [ ! -f "telegram-bot/.env" ]; then
    print_error "telegram-bot/.env file not found!"
    print_status "Please ensure your Supabase credentials are configured"
    exit 1
fi

print_success "Environment file found"

# Confirm with user
echo ""
print_warning "⚠️  WARNING: This will permanently delete ALL test data!"
print_warning "This includes:"
echo "   • All transactions"
echo "   • All attachments and files"
echo "   • All uploaded images and PDFs"
echo ""
print_status "Business units will be preserved (you can change this in the SQL script)"
echo ""

read -p "Are you sure you want to proceed? (type 'YES' to confirm): " confirm

if [ "$confirm" != "YES" ]; then
    print_status "Operation cancelled by user"
    exit 0
fi

echo ""
print_status "Starting production wipe process..."

# Step 1: Stop the bot if running
print_status "1. Stopping Telegram bot..."
pkill -f "node bot-refactored.js" 2>/dev/null || true
sleep 2
print_success "Bot stopped"

# Step 2: Clear storage files
print_status "2. Clearing Supabase Storage files..."
cd database
node clear-storage-files.js
if [ $? -eq 0 ]; then
    print_success "Storage files cleared"
else
    print_warning "Storage clearing completed with warnings"
fi
cd ..

# Step 3: Wipe database
print_status "3. Wiping database tables..."
print_status "Please run the following SQL script in your Supabase SQL editor:"
echo ""
echo "📄 File: database/wipe-test-data.sql"
echo ""
print_warning "⚠️  You need to manually run this in Supabase dashboard:"
print_status "1. Go to your Supabase project dashboard"
print_status "2. Navigate to SQL Editor"
print_status "3. Copy and paste the contents of database/wipe-test-data.sql"
print_status "4. Execute the script"
echo ""

read -p "Press ENTER after you've run the SQL script in Supabase..."

# Step 4: Verify clean state
print_status "4. Verifying clean state..."

# Check if we can connect to verify
cd telegram-bot
if node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
supabase.from('transactions').select('count').then(({data, error}) => {
  if (error) {
    console.log('❌ Could not verify - please check manually');
    process.exit(1);
  } else {
    console.log('✅ Database connection verified');
  }
});
" 2>/dev/null; then
    print_success "Database connection verified"
else
    print_warning "Could not verify database connection - please check manually"
fi

cd ..

# Step 5: Create fresh business units (optional)
echo ""
print_status "5. Would you like to create fresh business units?"
print_status "This will create:"
echo "   • Personal (personal type)"
echo "   • Main Business (business type)"
echo ""

read -p "Create fresh business units? (y/N): " create_units

if [[ $create_units =~ ^[Yy]$ ]]; then
    print_status "Creating fresh business units..."
    print_status "Please run this additional SQL in Supabase:"
    echo ""
    echo "INSERT INTO business_units (name, type, created_at, updated_at) VALUES"
    echo "('Personal', 'personal', NOW(), NOW()),"
    echo "('Main Business', 'business', NOW(), NOW());"
    echo ""
    read -p "Press ENTER after running the business units SQL..."
    print_success "Business units creation step completed"
fi

# Step 6: Final verification
print_status "6. Final verification and cleanup..."

# Clean up any temp files
find . -name "temp_*" -type f -delete 2>/dev/null || true
find telegram-bot/temp -name "*" -type f -delete 2>/dev/null || true

print_success "Temporary files cleaned"

# Summary
echo ""
print_success "🎉 Production wipe completed!"
echo ""
echo "📊 Summary:"
echo "  ✅ Telegram bot stopped"
echo "  ✅ Storage files cleared"
echo "  ✅ Database wipe script provided"
echo "  ✅ Temporary files cleaned"
echo ""
print_status "Your NamOS system is now ready for real production data!"
echo ""
print_warning "Next steps:"
echo "  1. Verify all data is cleared in Supabase dashboard"
echo "  2. Start the bot: cd telegram-bot && node bot-refactored.js"
echo "  3. Test with a real transaction"
echo ""
print_success "🚀 Ready for production use!"
