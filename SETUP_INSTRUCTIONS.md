# 🧠 Project Spirits Setup Instructions

Since you're using Supabase directly (without CLI), follow these steps to set up the Project Spirits system:

## 🚀 Quick Setup (5 minutes)

### Step 1: Apply Database Schema

1. **Open your Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Project Spirits Schema**
   - Copy the entire contents of `database/project-spirits-schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

### Step 2: Add OpenAI API Key

Add your OpenAI API key to your `.env` file:

```bash
# Add this line to your .env file
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

**Get an OpenAI API Key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login
3. Go to API Keys section
4. Create a new secret key
5. Copy and paste it into your `.env` file

### Step 3: Restart Your App

```bash
npm start
```

### Step 4: Create Your First Project Spirit

1. Navigate to any project in your dashboard
2. Open the project sidebar (click on a project)
3. Scroll down to the "Project Spirit" section
4. Click "Create Project Spirit"
5. Start chatting with your new AI assistant!

## ✅ Verification

After setup, you should see:

- **New tables in Supabase**: `project_spirits`, `spirit_conversations`, `spirit_insights`, etc.
- **Project Spirit section** in your project sidebar
- **"Create Project Spirit" button** for projects without spirits
- **Chat interface** when you click "Chat with [Spirit Name]"

## 🔧 Troubleshooting

### Database Issues
- **Error running schema**: Make sure you copied the entire file contents
- **Permission errors**: Verify you're using the correct Supabase project
- **Table conflicts**: If tables already exist, you can drop them first or modify the schema

### API Key Issues
- **AI not responding**: Check your OpenAI API key is correct
- **Rate limits**: OpenAI has usage limits on free accounts
- **Environment variables**: Restart your app after adding the API key

### UI Issues
- **Spirit section not showing**: Clear browser cache and restart
- **Chat not opening**: Check browser console for errors
- **Styles broken**: Ensure Tailwind CSS is working properly

## 📊 What Gets Created

The schema creates these tables:

1. **`project_spirits`** - Core spirit configuration
2. **`spirit_conversations`** - Chat history
3. **`spirit_insights`** - AI-generated insights
4. **`spirit_patterns`** - Learned patterns
5. **`spirit_actions`** - Suggested actions
6. **`path_stages`** - Project stage definitions

Plus indexes, triggers, and RLS policies for security.

## 🎯 Next Steps

Once setup is complete:

1. **Create spirits** for your existing projects
2. **Chat with them** to see how they understand your project context
3. **Review insights** they generate based on your project data
4. **Customize personalities** by editing spirit settings (coming soon)

## 🆘 Need Help?

If you run into issues:

1. Check the browser console for error messages
2. Verify your Supabase connection is working
3. Ensure your OpenAI API key has credits
4. Check that all database tables were created successfully

---

**Ready to give your projects their own AI consciousness? Let's get started! 🚀**
