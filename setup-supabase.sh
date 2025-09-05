#!/bin/bash

# 🗄️ Supabase Setup Helper Script
# This script helps you set up your Supabase database quickly

echo "🚀 Financial Dashboard - Supabase Setup Helper"
echo "=============================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating one..."
    echo "PORT=3001" > .env
    echo ""
fi

echo "📋 STEP 1: Create Supabase Project"
echo "1. Go to https://supabase.com and sign up/login"
echo "2. Click 'New Project'"
echo "3. Fill in:"
echo "   - Project name: financial-dashboard"
echo "   - Database password: (choose a strong password)"
echo "   - Region: (closest to you)"
echo "4. Click 'Create new project' and wait 2-3 minutes"
echo ""
echo "Press ENTER when your project is ready..."
read -r

echo "🔑 STEP 2: Get Your Credentials"
echo "1. In your Supabase dashboard, go to Settings > API"
echo "2. Copy your Project URL (looks like: https://xxxxx.supabase.co)"
echo ""
echo "Enter your Project URL:"
read -r SUPABASE_URL

echo ""
echo "3. Copy your anon/public API key (NOT the service_role key)"
echo ""
echo "Enter your anon key:"
read -r SUPABASE_KEY

# Update .env file
echo "PORT=3001" > .env
echo "" >> .env
echo "# Supabase Configuration" >> .env
echo "REACT_APP_SUPABASE_URL=$SUPABASE_URL" >> .env
echo "REACT_APP_SUPABASE_ANON_KEY=$SUPABASE_KEY" >> .env

echo ""
echo "✅ Updated .env file with your credentials!"
echo ""

echo "🏗️ STEP 3: Set Up Database Schema"
echo "1. In your Supabase dashboard, go to 'SQL Editor'"
echo "2. Click 'New Query'"
echo "3. Copy and paste the contents of 'database/schema.sql'"
echo "4. Click 'Run' to create your tables and sample data"
echo ""
echo "Press ENTER when you've run the schema..."
read -r

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo "Your financial dashboard is now connected to Supabase!"
echo ""
echo "Next steps:"
echo "1. Restart your development server: npm start"
echo "2. Open http://localhost:3001"
echo "3. Your dashboard should now load data from your database!"
echo ""
echo "🔧 Troubleshooting:"
echo "- If you see connection errors, double-check your .env file"
echo "- Make sure you used the 'anon' key, not the 'service_role' key"
echo "- Verify the schema was created successfully in Supabase"
echo ""
echo "Happy dashboarding! 📊✨"
