// Simple script to check if environment variables are loaded correctly
require('dotenv').config();

console.log('🔍 Checking environment variables...\n');

const requiredVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET', 
  'SLACK_APP_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

let allGood = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your-') || value.includes('here')) {
    console.log(`❌ ${varName}: NOT SET or using placeholder`);
    allGood = false;
  } else {
    // Show first/last few chars for security
    const preview = value.length > 20 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
      : value;
    console.log(`✅ ${varName}: ${preview}`);
  }
});

if (allGood) {
  console.log('\n🎉 All environment variables look good!');
  console.log('Try running: npm run dev');
} else {
  console.log('\n❌ Please fix the missing/placeholder environment variables in your .env file');
  console.log('\nYour .env file should contain:');
  console.log('SLACK_BOT_TOKEN=xoxb-your-actual-bot-token');
  console.log('SLACK_SIGNING_SECRET=your-actual-signing-secret');
  console.log('SLACK_APP_TOKEN=xapp-your-actual-app-token');
  console.log('SUPABASE_URL=your-supabase-url');
  console.log('SUPABASE_ANON_KEY=your-supabase-anon-key');
}
