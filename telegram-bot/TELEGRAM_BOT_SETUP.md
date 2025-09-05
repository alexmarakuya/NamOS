# 🤖 NamOS Telegram Bot Setup Guide

This bot can extract transaction details from images and PDFs, then automatically add them to your NamOS financial dashboard!

## 🚀 Features

- **📸 Image OCR**: Extract text from receipt/invoice photos
- **📄 PDF Parsing**: Analyze PDF invoices and statements  
- **🤖 AI Analysis**: Use GPT to extract transaction details
- **💾 Auto-Save**: Directly add transactions to your Supabase database
- **🏢 Business Units**: Choose which business unit to assign transactions to

## 📋 Prerequisites

1. **Telegram Account** - You'll need Telegram to create and use the bot
2. **OpenAI API Key** - For AI-powered transaction parsing
3. **Your existing Supabase credentials** - Same as your NamOS dashboard

## 🛠️ Step 1: Create Telegram Bot

### 1.1 Talk to BotFather
1. Open Telegram and search for `@BotFather`
2. Start a chat and send `/newbot`
3. Choose a name: `NamOS Financial Bot`
4. Choose a username: `namosfin_bot` (or similar, must be unique)
5. **Save the Bot Token** - you'll need this!

### 1.2 Configure Bot Settings
Send these commands to BotFather:
```
/setdescription
[Select your bot]
Smart financial assistant that extracts transaction details from receipts and invoices

/setabouttext  
[Select your bot]
NamOS Financial Bot - Upload receipts and invoices to automatically add transactions to your dashboard

/setcommands
[Select your bot]
start - Start the bot and see instructions
help - Show detailed help
units - List your business units
```

## 🔑 Step 2: Get API Keys

### 2.1 OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login and go to API Keys
3. Create a new secret key
4. **Save the key** - you'll need this!

### 2.2 Your Supabase Credentials
Use the same credentials from your main NamOS app:
- Supabase URL
- Supabase Anon Key

## ⚙️ Step 3: Configure Environment

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your actual values:**
   ```bash
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   
   # Supabase Configuration (same as your main app)
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-openai-key-here
   
   # Server Configuration
   PORT=3002
   ```

## 🚀 Step 4: Run the Bot

### Development Mode:
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

You should see: `🤖 NamOS Financial Bot is running...`

## 📱 Step 5: Test Your Bot

1. **Find your bot** in Telegram (search for the username you created)
2. **Start the bot** by sending `/start`
3. **Test with an image**:
   - Take a photo of a receipt
   - Send it to the bot
   - Watch it extract transaction details!

## 🎯 How It Works

### 📸 For Images:
1. **Upload** a photo of a receipt/invoice
2. **OCR** extracts text using Tesseract.js
3. **AI** analyzes text and identifies:
   - Amount
   - Description  
   - Category
   - Date
   - Type (income/expense)
4. **Choose** business unit from your list
5. **Confirm** and it's added to your dashboard!

### 📄 For PDFs:
1. **Upload** a PDF invoice/statement
2. **Parser** extracts text content
3. **AI** analyzes and extracts transaction details
4. **Same flow** as images from there

## 💡 Tips for Best Results

### 📸 Image Tips:
- **Good lighting** - avoid shadows
- **Clear text** - make sure amounts and dates are visible
- **Full receipt** - include the entire document
- **Straight angle** - avoid tilted photos

### 📄 PDF Tips:
- **Text-based PDFs** work best (not scanned images)
- **Clear formatting** - invoices and statements work great
- **Single transactions** per document work better

## 🔧 Troubleshooting

### Bot Not Responding:
- Check your `TELEGRAM_BOT_TOKEN` is correct
- Ensure the bot is running (`npm start`)
- Check console for error messages

### OCR Not Working:
- Try clearer, better-lit photos
- Ensure text is readable in the image
- Check that Tesseract.js installed correctly

### AI Parsing Issues:
- Verify your `OPENAI_API_KEY` is valid
- Check you have API credits available
- Try with clearer, more standard receipts

### Database Errors:
- Confirm Supabase credentials are correct
- Ensure business units exist in your database
- Check Supabase dashboard for connection issues

## 🎉 Usage Examples

### Example Workflow:
1. **Lunch Receipt**: Photo of restaurant receipt
   - Bot extracts: "$25.50, Lunch at Mario's, Food, 2024-01-15"
   - You select: "Personal" business unit
   - Added as expense to your dashboard

2. **Client Invoice**: PDF invoice you sent
   - Bot extracts: "$5000, Web Development Project, Consulting, 2024-01-15"  
   - You select: "Tech Consulting" business unit
   - Added as income to your dashboard

## 🚀 Advanced Features

### Multiple Business Units:
- Bot automatically fetches your business units from Supabase
- Choose the right one for each transaction
- Keeps your finances organized

### Smart Categorization:
- AI suggests appropriate categories
- Learns from common transaction types
- Consistent with your existing data

### Date Detection:
- Extracts dates from receipts
- Falls back to today's date if not found
- Maintains accurate financial records

## 🔒 Security & Privacy

- **Local Processing**: OCR happens on your server
- **Secure API**: Uses encrypted connections
- **No Data Storage**: Images/PDFs are deleted after processing
- **Your Database**: Data goes directly to your Supabase

## 📞 Support

If you encounter issues:
1. Check the console logs for detailed errors
2. Verify all API keys are correct and active
3. Test with simple, clear receipts first
4. Ensure your NamOS dashboard is working properly

---

**🎉 Once set up, you can add transactions to your financial dashboard just by sending photos to your Telegram bot!**
