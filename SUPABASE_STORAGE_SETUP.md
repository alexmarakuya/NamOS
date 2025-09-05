# 📎 Supabase Storage Setup for File Attachments

This guide will help you set up Supabase Storage to handle file attachments for your NamOS Financial Dashboard.

## 🗄️ Step 1: Run Database Schema Updates

First, update your database schema to support file attachments:

1. **In your Supabase dashboard**, go to **SQL Editor**
2. **Click "New Query"**
3. **Copy and paste** the entire contents of `database/add-file-attachments.sql`
4. **Click "Run"** to create the new tables and functions

This will create:
- `attachments` table for file metadata
- Updated `transactions` table with attachment reference
- Storage policies and helper functions

## 📦 Step 2: Create Storage Bucket

1. **In your Supabase dashboard**, go to **Storage**
2. **Click "New Bucket"**
3. **Bucket name**: `transaction-attachments`
4. **Make bucket public**: ✅ **Enable** (so files can be accessed via URLs)
5. **Click "Create bucket"**

## 🔒 Step 3: Configure Storage Policies

The SQL script automatically creates basic storage policies, but you may want to adjust them:

### Current Policies (Public Access):
- **Read**: Anyone can view attachments
- **Write**: Anyone can upload attachments
- **Update**: Anyone can modify attachments
- **Delete**: Anyone can delete attachments

### For Production (Recommended):
You may want to add authentication-based policies later. For now, public access works for development.

## 📁 Step 4: Test File Upload

After running the SQL and creating the bucket, test the setup:

1. **Restart your Telegram bot**: `npm start`
2. **Send a photo** to your bot
3. **Check Supabase Storage** → `transaction-attachments` bucket
4. **Verify the file** was uploaded successfully

## 🎯 What's Supported

### File Types:
- **Images**: JPG, PNG, GIF
- **Documents**: PDF, DOC, DOCX
- **Size limit**: Up to 50MB per file (Supabase default)

### Storage Structure:
```
transaction-attachments/
├── {transaction-id}/
│   ├── {timestamp}-receipt.jpg
│   ├── {timestamp}-invoice.pdf
│   └── ...
```

### Database Records:
Each file creates records in:
- **`attachments` table**: File metadata and storage path
- **`transactions` table**: Reference to primary attachment

## 🔧 Troubleshooting

### Storage Bucket Issues:
- **Bucket not found**: Ensure you created `transaction-attachments` bucket
- **Upload fails**: Check bucket is public and policies are set
- **Files not visible**: Verify public access is enabled

### Database Issues:
- **Attachment table not found**: Run the SQL schema update
- **Foreign key errors**: Ensure transactions table exists first

### Bot Issues:
- **File upload fails**: Check Supabase credentials in bot `.env`
- **Storage errors**: Verify bucket name matches in bot code

## 📊 Viewing Attachments in Dashboard

The dashboard components will automatically show:
- **📎 Attachment indicators** on transactions with files
- **File previews** for images
- **Download links** for documents
- **Upload capability** in Add Transaction modal

## 🚀 Advanced Features

### Multiple Attachments:
- Each transaction can have multiple files
- Primary attachment is highlighted
- All attachments are preserved

### File Management:
- **Automatic cleanup** when transactions are deleted
- **Unique file paths** prevent conflicts
- **Metadata tracking** for audit trails

### Security:
- **Row Level Security** ready for user authentication
- **File access control** via Supabase policies
- **Secure uploads** with validation

## 📱 Bot Integration

Your Telegram bot now:
- **Saves original images/PDFs** to Supabase Storage
- **Creates attachment records** automatically
- **Links files to transactions** seamlessly
- **Shows attachment info** in confirmation messages

## 🎉 You're Ready!

Once you've completed these steps:
1. ✅ Database schema updated
2. ✅ Storage bucket created
3. ✅ Bot restarted
4. ✅ Test upload successful

Your NamOS system now has complete file attachment support! 🎯

**Send a photo to your Telegram bot and watch it automatically save the original image with the transaction!** 📸✨
