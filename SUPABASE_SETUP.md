# 🗄️ Supabase Database Setup Guide

This guide will help you set up a Supabase database for your Financial Dashboard.

## 📋 Step 1: Create a Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign up/sign in
2. **Click "New Project"**
3. **Fill in project details:**
   - Organization: Choose or create one
   - Project name: `financial-dashboard` (or your preferred name)
   - Database password: Choose a strong password
   - Region: Choose closest to your location
4. **Click "Create new project"**
5. **Wait for setup to complete** (usually 2-3 minutes)

## 🔑 Step 2: Get Your Project Credentials

1. **In your Supabase dashboard**, go to **Settings > API**
2. **Copy these values:**
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Project API keys > anon public** (the `anon` key, not the `service_role` key)

## ⚙️ Step 3: Configure Your App

1. **Update your `.env` file** with your actual credentials:
   ```bash
   PORT=3001

   # Supabase Configuration
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. **Restart your development server:**
   ```bash
   npm start
   ```

## 🏗️ Step 4: Set Up Database Schema

1. **In your Supabase dashboard**, go to **SQL Editor**
2. **Click "New Query"**
3. **Copy and paste the entire contents** of `database/schema.sql` into the query editor
4. **Click "Run"** to execute the schema creation

This will create:
- `business_units` table for your different businesses/personal categories
- `transactions` table for all your financial transactions
- Sample data to get you started
- Proper indexes and triggers for performance

## 🔒 Step 5: Set Up Row Level Security (Optional but Recommended)

If you plan to have user authentication later, you can set up RLS:

1. **In Supabase dashboard**, go to **Authentication > Settings**
2. **Enable Row Level Security** on both tables
3. **Add policies** as needed (for now, you can skip this for development)

## 🧪 Step 6: Test the Connection

1. **Open your app** at `http://localhost:3001`
2. **Check the browser console** for any connection errors
3. **The app should now load data from your Supabase database!**

## 🚀 Step 7: Next Steps

Once connected, you can:
- **Add real transactions** through the UI (when we implement the form)
- **Create new business units**
- **View real-time data** from your database
- **Set up authentication** for multi-user access
- **Deploy to production** with environment variables

## 🛠️ Troubleshooting

**Connection Issues:**
- Verify your `.env` variables are correct
- Make sure you're using the `anon` key, not the `service_role` key
- Check that your project URL doesn't have a trailing slash

**Database Issues:**
- Ensure the schema was created successfully in SQL Editor
- Check the Tables view in Supabase to see your tables
- Verify sample data was inserted

**App Issues:**
- Restart your development server after updating `.env`
- Check browser console for detailed error messages
- Ensure all npm packages are installed

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for error messages
2. Verify your Supabase project is running (green status in dashboard)
3. Ensure your API keys are correct and active

---

**🎉 Once set up, your Financial Dashboard will be powered by a real PostgreSQL database with real-time capabilities!**
