const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const Tesseract = require('tesseract.js');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Initialize services
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Global storage for pending transactions (in production, use Redis or database)
global.pendingTransactions = {};

// Helper function to download file from Telegram
const downloadFile = async (ctx, fileId) => {
  try {
    const file = await ctx.telegram.getFile(fileId);
    const filePath = file.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    const fileName = `temp_${Date.now()}_${path.basename(filePath)}`;
    const localPath = path.join(__dirname, 'temp', fileName);
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(localPath);
      https.get(fileUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(localPath);
        });
      }).on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

// OCR function for images
const extractTextFromImage = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
};

// PDF text extraction
const extractTextFromPDF = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw error;
  }
};

// AI-powered transaction parsing
const parseTransactionFromText = async (text) => {
  try {
    const prompt = `
Extract transaction details from this text. Return a JSON object with these fields:
- amount: number (positive for income, negative for expenses)
- description: string (brief description)
- category: string (e.g., "Food", "Transportation", "Consulting", etc.)
- date: string (YYYY-MM-DD format, use today if not found)
- type: "income" or "expense"

Text to analyze:
${text}

Return only valid JSON, no other text:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validate and clean the result
    return {
      amount: Math.abs(parseFloat(result.amount) || 0),
      description: (result.description || '').substring(0, 255),
      category: (result.category || 'Other').substring(0, 100),
      date: result.date || new Date().toISOString().split('T')[0],
      type: result.type === 'income' ? 'income' : 'expense'
    };
  } catch (error) {
    console.error('AI parsing error:', error);
    throw error;
  }
};

// Get business units from Supabase
const getBusinessUnits = async () => {
  try {
    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching business units:', error);
    return [];
  }
};

// Save transaction to Supabase
const saveTransaction = async (transaction, businessUnitId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        business_unit_id: businessUnitId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
};

// Bot commands
bot.start((ctx) => {
  ctx.reply(`
🏦 *NamOS Financial Bot*

Welcome! I can help you add transactions by analyzing images and PDFs.

*Commands:*
• Send me a photo of a receipt
• Send me a PDF of an invoice
• /help - Show this message
• /units - List your business units

Just upload an image or PDF and I'll extract the transaction details for you! 📊
  `, { parse_mode: 'Markdown' });
});

bot.help((ctx) => {
  ctx.reply(`
*How to use NamOS Financial Bot:*

📸 *For Images:*
• Take a photo of a receipt or invoice
• Send it to me
• I'll extract: amount, description, category, date

📄 *For PDFs:*
• Upload a PDF invoice or statement
• I'll analyze the text and extract transaction details

✅ *What happens next:*
• I'll show you the extracted details
• You can choose which business unit to assign it to
• Confirm and I'll add it to your NamOS dashboard

💡 *Tips:*
• Make sure text is clear and readable
• Include the full receipt/invoice in the image
• PDFs work best with text-based documents

Need help? Just send me a document and I'll guide you through it!
  `, { parse_mode: 'Markdown' });
});

bot.command('units', async (ctx) => {
  try {
    const businessUnits = await getBusinessUnits();
    
    if (businessUnits.length === 0) {
      ctx.reply('No business units found. Please set up your business units in the NamOS dashboard first.');
      return;
    }

    const unitsList = businessUnits
      .map((unit, index) => `${index + 1}. ${unit.name} (${unit.type})`)
      .join('\n');

    ctx.reply(`*Your Business Units:*\n\n${unitsList}`, { parse_mode: 'Markdown' });
  } catch (error) {
    ctx.reply('Error fetching business units. Please try again later.');
  }
});

// Handle photo messages
bot.on('photo', async (ctx) => {
  const processingMsg = await ctx.reply('📸 Processing image... This may take a moment.');
  
  try {
    // Get the highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    
    // Download the image
    const imagePath = await downloadFile(ctx, photo.file_id);
    
    // Extract text using OCR
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      '🔍 Extracting text from image...'
    );
    
    const extractedText = await extractTextFromImage(imagePath);
    
    if (!extractedText.trim()) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        '❌ Could not extract text from image. Please try a clearer photo.'
      );
      return;
    }

    // Parse transaction details using AI
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '🤖 Analyzing transaction details...'
    );
    
    const transaction = await parseTransactionFromText(extractedText);
    
    // Get business units for selection
    const businessUnits = await getBusinessUnits();
    
    if (businessUnits.length === 0) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        '❌ No business units found. Please set up business units in your NamOS dashboard first.'
      );
      return;
    }

    // Store transaction temporarily
    const transactionKey = Date.now().toString();
    global.pendingTransactions[transactionKey] = transaction;

    // Create inline keyboard for business unit selection
    const keyboard = businessUnits.map((unit) => ([
      { 
        text: `${unit.name} (${unit.type})`, 
        callback_data: `unit_${unit.id}_${transactionKey}` 
      }
    ]));

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      `✅ *Transaction Details Extracted:*

💰 Amount: $${transaction.amount}
📝 Description: ${transaction.description}
🏷️ Category: ${transaction.category}
📅 Date: ${transaction.date}
📊 Type: ${transaction.type}

*Choose a business unit:*`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );

    // Clean up temp file
    fs.unlinkSync(imagePath);

  } catch (error) {
    console.error('Error processing image:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '❌ Error processing image. Please try again or contact support.'
    );
  }
});

// Handle PDF documents
bot.on('document', async (ctx) => {
  const document = ctx.message.document;
  
  // Check if it's a PDF
  if (!document.mime_type || document.mime_type !== 'application/pdf') {
    ctx.reply('📄 Please send a PDF file. Other document types are not supported yet.');
    return;
  }

  const processingMsg = await ctx.reply('📄 Processing PDF... This may take a moment.');
  
  try {
    // Download the PDF
    const pdfPath = await downloadFile(ctx, document.file_id);
    
    // Extract text from PDF
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '🔍 Extracting text from PDF...'
    );
    
    const extractedText = await extractTextFromPDF(pdfPath);
    
    if (!extractedText.trim()) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        '❌ Could not extract text from PDF. Please try a different file.'
      );
      return;
    }

    // Parse transaction details using AI
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '🤖 Analyzing transaction details...'
    );
    
    const transaction = await parseTransactionFromText(extractedText);
    
    // Get business units for selection
    const businessUnits = await getBusinessUnits();
    
    if (businessUnits.length === 0) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        '❌ No business units found. Please set up business units in your NamOS dashboard first.'
      );
      return;
    }

    // Store transaction temporarily
    const transactionKey = Date.now().toString();
    global.pendingTransactions[transactionKey] = transaction;

    // Create inline keyboard for business unit selection
    const keyboard = businessUnits.map((unit) => ([
      { 
        text: `${unit.name} (${unit.type})`, 
        callback_data: `unit_${unit.id}_${transactionKey}` 
      }
    ]));

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      `✅ *Transaction Details Extracted:*

💰 Amount: $${transaction.amount}
📝 Description: ${transaction.description}
🏷️ Category: ${transaction.category}
📅 Date: ${transaction.date}
📊 Type: ${transaction.type}

*Choose a business unit:*`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );

    // Clean up temp file
    fs.unlinkSync(pdfPath);

  } catch (error) {
    console.error('Error processing PDF:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '❌ Error processing PDF. Please try again or contact support.'
    );
  }
});

// Handle business unit selection
bot.on('callback_query', async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    
    if (callbackData.startsWith('unit_')) {
      const parts = callbackData.split('_');
      const businessUnitId = parts[1];
      const transactionKey = parts[2];
      
      // Get transaction from temporary storage
      const transaction = global.pendingTransactions[transactionKey];
      
      if (!transaction) {
        await ctx.answerCbQuery('Transaction expired. Please try again.');
        return;
      }
      
      // Save transaction to database
      const savedTransaction = await saveTransaction(transaction, businessUnitId);
      
      await ctx.editMessageText(
        `🎉 *Transaction Added Successfully!*

💰 Amount: $${transaction.amount}
📝 Description: ${transaction.description}
🏷️ Category: ${transaction.category}
📅 Date: ${transaction.date}
📊 Type: ${transaction.type}

The transaction has been added to your NamOS dashboard! 📊

Send me another receipt or PDF to add more transactions.`,
        { parse_mode: 'Markdown' }
      );
      
      // Clean up temporary storage
      delete global.pendingTransactions[transactionKey];
      
      await ctx.answerCbQuery('Transaction added successfully! 🎉');
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    await ctx.answerCbQuery('Error saving transaction. Please try again.');
  }
});

// Handle other message types
bot.on('message', (ctx) => {
  ctx.reply(`
📋 *Supported formats:*

📸 *Images:* Send a photo of a receipt or invoice
📄 *PDFs:* Upload a PDF document

I can't process this message type. Please send an image or PDF document for me to analyze.

Type /help for more information!
  `, { parse_mode: 'Markdown' });
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Something went wrong. Please try again later.');
});

// Start the bot
bot.launch();

console.log('🤖 NamOS Financial Bot is running...');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
