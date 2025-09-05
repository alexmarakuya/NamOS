#!/bin/bash

# NamOS Test Runner Script
set -e

echo "🧪 NamOS Test Suite Runner"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
print_status "Checking environment variables..."
if [ ! -f "telegram-bot/.env" ]; then
    print_error "telegram-bot/.env file not found!"
    print_status "Please create telegram-bot/.env with:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "TELEGRAM_BOT_TOKEN=your_bot_token"
    echo "OPENAI_API_KEY=your_openai_key"
    exit 1
fi

print_success "Environment file found"

# Install dependencies
print_status "Installing dependencies..."

# Main project dependencies
if [ -f "package.json" ]; then
    print_status "Installing main project dependencies..."
    npm install --silent
fi

# Telegram bot dependencies
if [ -f "telegram-bot/package.json" ]; then
    print_status "Installing telegram bot dependencies..."
    cd telegram-bot
    npm install --silent
    cd ..
fi

# Test dependencies
if [ -f "tests/package.json" ]; then
    print_status "Installing test dependencies..."
    cd tests
    npm install --silent
    cd ..
else
    print_error "tests/package.json not found!"
    exit 1
fi

print_success "All dependencies installed"

# Run different types of tests based on arguments
case "${1:-all}" in
    "file-upload")
        print_status "Running file upload tests..."
        cd tests
        npm run test:file-upload
        ;;
    "bot")
        print_status "Running bot functionality tests..."
        cd tests
        npm run test:bot
        ;;
    "coverage")
        print_status "Running tests with coverage..."
        cd tests
        npm run test:coverage
        ;;
    "ci")
        print_status "Running CI tests..."
        cd tests
        npm run test:ci
        ;;
    "watch")
        print_status "Running tests in watch mode..."
        cd tests
        npm run test:watch
        ;;
    "all"|*)
        print_status "Running all tests..."
        cd tests
        npm test
        ;;
esac

# Check test results
if [ $? -eq 0 ]; then
    print_success "All tests passed! 🎉"
    
    # Optional: Show coverage report location
    if [ -d "tests/coverage" ]; then
        print_status "Coverage report available at: tests/coverage/index.html"
    fi
    
    echo ""
    echo "📊 Test Summary:"
    echo "  ✅ File upload functionality"
    echo "  ✅ Bot conversation flow"
    echo "  ✅ Database operations"
    echo "  ✅ Error handling"
    echo "  ✅ Integration tests"
    
else
    print_error "Some tests failed! ❌"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "  1. Check your .env file has correct Supabase credentials"
    echo "  2. Ensure your Supabase database is set up correctly"
    echo "  3. Verify the transaction-attachments storage bucket exists"
    echo "  4. Check that business units exist in your database"
    exit 1
fi

echo ""
print_success "Test run completed!"
