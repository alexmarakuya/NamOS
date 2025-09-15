#!/bin/bash

# Project Spirits Setup Script
# This script sets up the Project Spirit system using Supabase CLI

echo "🧠 Setting up Project Spirits system..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing it now..."
    
    # Install Supabase CLI
    if command -v brew &> /dev/null; then
        echo "📦 Installing via Homebrew..."
        brew install supabase/tap/supabase
    else
        echo "📦 Installing directly from GitHub..."
        curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_darwin_amd64.tar.gz | tar -xz
        sudo mv supabase /usr/local/bin/
    fi
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "🚀 Initializing Supabase project..."
    supabase init
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase..."
    supabase login
fi

# Check if linked to a project
if [ ! -f ".supabase/project-ref" ]; then
    echo "🔗 Please link to your Supabase project..."
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    echo "You can find your project ref in your Supabase dashboard URL"
    exit 1
fi

echo "📊 Applying Project Spirits migration..."

# Check if migration already exists
if [ ! -f "supabase/migrations/*_project_spirits.sql" ]; then
    echo "❌ Project Spirits migration not found. Please ensure the migration file exists."
    exit 1
fi

# Apply migrations
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Project Spirits database schema applied successfully!"
else
    echo "❌ Failed to apply migrations. Please check the error messages above."
    exit 1
fi

# Check for OpenAI API key
if ! grep -q "REACT_APP_OPENAI_API_KEY=" .env || grep -q "your_openai_api_key_here" .env; then
    echo ""
    echo "🔑 OpenAI API Key Setup Required"
    echo "================================"
    echo "To enable AI features, you need to add your OpenAI API key to your .env file."
    echo ""
    echo "1. Get an API key from: https://platform.openai.com/api-keys"
    echo "2. Replace 'your_openai_api_key_here' in your .env file with your actual key"
    echo ""
    echo "Your .env file should contain:"
    echo "REACT_APP_OPENAI_API_KEY=sk-your-actual-key-here"
    echo ""
fi

echo ""
echo "🎉 Project Spirits Setup Complete!"
echo "=================================="
echo ""
echo "✅ Database schema applied"
echo "✅ Supabase CLI configured"
echo "✅ Migrations tracked"
echo ""
echo "🚀 Next steps:"
echo "1. Add your OpenAI API key to .env (if not done already)"
echo "2. Start your development server: npm start"
echo "3. Navigate to any project and create your first Project Spirit!"
echo ""
echo "🎯 The Project Spirit system includes:"
echo "   • AI-powered project assistants"
echo "   • Intelligent insights and suggestions"
echo "   • Natural language project chat"
echo "   • Automated project stage tracking"
echo "   • Client profile learning"
echo ""
echo "📚 Documentation:"
echo "   • Read PROJECT_SPIRITS_README.md for detailed information"
echo "   • Check SETUP_INSTRUCTIONS.md for troubleshooting"
echo ""
echo "Happy building with Project Spirits! 🧠✨"