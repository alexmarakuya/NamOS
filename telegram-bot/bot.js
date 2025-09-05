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

// Global storage for pending transactions and conversation states (in production, use Redis or database)
global.pendingTransactions = {};
global.conversationStates = {};

// Conversation state constants
const CONVERSATION_STATES = {
  IDLE: 'idle',
  WAITING_FOR_AMOUNT: 'waiting_for_amount',
  WAITING_FOR_DESCRIPTION: 'waiting_for_description',
  WAITING_FOR_CATEGORY: 'waiting_for_category',
  WAITING_FOR_TYPE: 'waiting_for_type',
  WAITING_FOR_DATE: 'waiting_for_date',
  WAITING_FOR_BUSINESS_UNIT: 'waiting_for_business_unit',
  CONFIRMING: 'confirming'
};

// Helper function to get user conversation state
const getUserState = (userId) => {
  return global.conversationStates[userId] || { state: CONVERSATION_STATES.IDLE };
};

// Helper function to set user conversation state
const setUserState = (userId, state, data = {}) => {
  global.conversationStates[userId] = { state, ...data };
};

// Helper function to clear user conversation state
const clearUserState = (userId) => {
  delete global.conversationStates[userId];
};

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

// Save transaction with file attachment to Supabase
const saveTransactionWithFile = async (transaction, businessUnitId, filePath) => {
  try {
    // Add transaction first
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        business_unit_id: businessUnitId
      }])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // If we have a file, upload it to Supabase Storage and create attachment record
    if (filePath && transactionData) {
      const fileName = path.basename(filePath);
      const fileExt = fileName.split('.').pop();
      const fileBuffer = fs.readFileSync(filePath);
      const fileSize = fs.statSync(filePath).size;
      
      // Generate unique storage path
      const storagePath = `${transactionData.id}/${Date.now()}-${fileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('transaction-attachments')
        .upload(storagePath, fileBuffer, {
          contentType: getContentType(fileExt),
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Don't fail the transaction if file upload fails
      } else {
        // Create attachment record (with error handling for missing table)
        try {
          const { data: attachmentData, error: attachmentError } = await supabase
            .from('attachments')
            .insert([{
              transaction_id: transactionData.id,
              file_name: fileName,
              file_type: getContentType(fileExt),
              file_size: fileSize,
              storage_path: storagePath,
              upload_source: 'telegram'
            }])
            .select()
            .single();

          if (!attachmentError && attachmentData) {
            // Update transaction with primary attachment reference
            try {
              await supabase
                .from('transactions')
                .update({ primary_attachment_id: attachmentData.id })
                .eq('id', transactionData.id);
            } catch (updateError) {
              console.log('Could not update primary_attachment_id - column may not exist yet');
            }
          }
        } catch (attachmentTableError) {
          console.log('Attachments table not found - file uploaded but not tracked in database');
          console.log('Please run the database schema update to enable file tracking');
        }
      }
    }

    return transactionData;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
};

// Helper function to get content type from file extension
const getContentType = (fileExt) => {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeTypes[fileExt?.toLowerCase()] || 'application/octet-stream';
};

// Interactive transaction creation functions
const startInteractiveTransaction = async (ctx, extractedData = null, filePath = null) => {
  const userId = ctx.from.id;
  
  // Initialize transaction data
  const transactionData = {
    amount: extractedData?.amount || null,
    description: extractedData?.description || null,
    category: extractedData?.category || null,
    type: extractedData?.type || null,
    date: extractedData?.date || null,
    filePath: filePath
  };
  
  setUserState(userId, CONVERSATION_STATES.WAITING_FOR_AMOUNT, { transaction: transactionData, extractedData });
  
  await askForAmount(ctx, extractedData);
};

const askForAmount = async (ctx, extractedData = null) => {
  let message = '💰 *What\'s the transaction amount?*\n\n';
  
  if (extractedData?.amount) {
    message += `I extracted: *$${extractedData.amount}*\n\n`;
    message += '• Type the correct amount (e.g., 25.50)\n';
    message += '• Or type "yes" to confirm $' + extractedData.amount;
  } else {
    message += 'Please enter the amount (e.g., 25.50)';
  }
  
  await ctx.reply(message, { parse_mode: 'Markdown' });
};

const askForDescription = async (ctx, extractedData = null) => {
  let message = '📝 *What\'s this transaction for?*\n\n';
  
  if (extractedData?.description) {
    message += `I extracted: *${extractedData.description}*\n\n`;
    message += '• Type a better description\n';
    message += '• Or type "yes" to confirm';
  } else {
    message += 'Please describe the transaction (e.g., "Coffee at Starbucks", "Client payment")';
  }
  
  await ctx.reply(message, { parse_mode: 'Markdown' });
};

const askForCategory = async (ctx, extractedData = null) => {
  // Common categories for different transaction types
  const commonCategories = [
    // Income categories
    { text: '💼 Consulting', callback_data: 'cat_Consulting' },
    { text: '💰 Sales Revenue', callback_data: 'cat_Sales Revenue' },
    { text: '🏦 Investment Income', callback_data: 'cat_Investment Income' },
    { text: '🎓 Training/Speaking', callback_data: 'cat_Training' },
    { text: '💡 Other Income', callback_data: 'cat_Other Income' },
    
    // Expense categories
    { text: '🍽️ Food & Dining', callback_data: 'cat_Food' },
    { text: '⛽ Transportation', callback_data: 'cat_Transportation' },
    { text: '🏢 Office Supplies', callback_data: 'cat_Office Supplies' },
    { text: '💻 Software/Tech', callback_data: 'cat_Software' },
    { text: '📱 Marketing', callback_data: 'cat_Marketing' },
    { text: '🏠 Rent/Utilities', callback_data: 'cat_Rent' },
    { text: '📚 Education', callback_data: 'cat_Education' },
    { text: '🏥 Healthcare', callback_data: 'cat_Healthcare' },
    { text: '✈️ Travel', callback_data: 'cat_Travel' },
    { text: '✏️ Custom Category', callback_data: 'cat_custom' }
  ];

  // Create keyboard with categories in rows of 2
  const keyboard = [];
  for (let i = 0; i < commonCategories.length; i += 2) {
    const row = [commonCategories[i]];
    if (commonCategories[i + 1]) {
      row.push(commonCategories[i + 1]);
    }
    keyboard.push(row);
  }
  
  let message = '🏷️ *What category is this transaction?*\n\n';
  
  if (extractedData?.category) {
    message += `I extracted: *${extractedData.category}*\n\n`;
    message += 'Choose a category below or select "Custom Category" to enter your own:';
  } else {
    message += 'Please select a category:';
  }
  
  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

const askForType = async (ctx, extractedData = null) => {
  const keyboard = [
    [{ text: '💰 Income', callback_data: 'type_income' }],
    [{ text: '💸 Expense', callback_data: 'type_expense' }]
  ];
  
  let message = '📊 *Is this income or an expense?*\n\n';
  
  if (extractedData?.type) {
    message += `I extracted: *${extractedData.type}*\n\n`;
    message += 'Please confirm or choose the correct type:';
  } else {
    message += 'Please select the transaction type:';
  }
  
  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

const askForDate = async (ctx, extractedData = null) => {
  let message = '📅 *When did this transaction occur?*\n\n';
  
  if (extractedData?.date) {
    message += `I extracted: *${extractedData.date}*\n\n`;
    message += '• Type a different date (YYYY-MM-DD)\n';
    message += '• Type "today" for today\n';
    message += '• Or type "yes" to confirm';
  } else {
    message += 'Please enter the date:\n';
    message += '• Format: YYYY-MM-DD (e.g., 2024-01-15)\n';
    message += '• Or type "today" for today\'s date';
  }
  
  await ctx.reply(message, { parse_mode: 'Markdown' });
};

const askForBusinessUnit = async (ctx) => {
  const businessUnits = await getBusinessUnits();
  
  if (businessUnits.length === 0) {
    await ctx.reply('❌ No business units found. Please set up business units in your NamOS dashboard first.');
    clearUserState(ctx.from.id);
    return;
  }
  
  const keyboard = businessUnits.map((unit) => ([
    { text: `${unit.name} (${unit.type})`, callback_data: `bu_${unit.id}` }
  ]));
  
  await ctx.reply(
    '*🏢 Which business unit is this for?*\n\nPlease select:',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    }
  );
};

const showConfirmation = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userState = getUserState(userId);
    const transaction = userState.transaction;
    
    console.log('showConfirmation - User State:', JSON.stringify(userState, null, 2));
    console.log('showConfirmation - Transaction:', JSON.stringify(transaction, null, 2));
    
    if (!transaction) {
      console.error('No transaction in user state for confirmation');
      await ctx.reply('❌ Session expired. Please start again with /add');
      return;
    }
    
    const keyboard = [
      [
        { text: '✅ Confirm & Save', callback_data: 'confirm_save' },
        { text: '❌ Cancel', callback_data: 'confirm_cancel' }
      ],
      [{ text: '✏️ Edit Details', callback_data: 'confirm_edit' }]
    ];
    
    let message = '📋 *Please confirm your transaction:*\n\n';
    message += `💰 Amount: $${transaction.amount || 'N/A'}\n`;
    message += `📝 Description: ${transaction.description || 'N/A'}\n`;
    message += `🏷️ Category: ${transaction.category || 'N/A'}\n`;
    message += `📊 Type: ${transaction.type || 'N/A'}\n`;
    message += `📅 Date: ${transaction.date || 'N/A'}\n`;
    message += `🏢 Business Unit: ${transaction.businessUnitName || 'N/A'}\n`;
    
    if (transaction.filePath) {
      try {
        message += `📎 Attachment: ${path.basename(transaction.filePath)}\n`;
      } catch (pathError) {
        console.error('Error getting filename:', pathError);
        message += `📎 Attachment: File attached\n`;
      }
    }
    
    message += '\n*Is this correct?*';
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    console.error('Error in showConfirmation:', error);
    await ctx.reply('❌ Error showing confirmation. Please try again with /add');
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
🏦 *NamOS Financial Bot - Help*

*How to use:*
📸 Send a photo of a receipt or invoice
📄 Send a PDF document
✏️ Use /add to manually add a transaction
🤖 I'll guide you through the process step by step

*Commands:*
/start - Start the bot
/help - Show this help message
/add - Manually add a transaction
/units - List your business units
/cancel - Cancel current operation

*Supported files:*
• Images: JPG, PNG, GIF
• Documents: PDF

*What I can do:*
• Extract details from receipts automatically
• Ask questions to fill missing information
• Guide you through manual entry
• Save original files as attachments

Just send me a photo or use /add to get started! 📱✨
  `, { parse_mode: 'Markdown' });
});

// New command to manually add a transaction
bot.command('add', async (ctx) => {
  const userId = ctx.from.id;
  clearUserState(userId); // Clear any existing state
  
  await ctx.reply(`
📝 *Let's add a new transaction manually!*

I'll ask you a few questions to get all the details.

Ready? Let's start! 🚀
  `, { parse_mode: 'Markdown' });
  
  await startInteractiveTransaction(ctx);
});

// Cancel command
bot.command('cancel', async (ctx) => {
  const userId = ctx.from.id;
  const userState = getUserState(userId);
  
  if (userState.state === CONVERSATION_STATES.IDLE) {
    await ctx.reply('Nothing to cancel! 😊');
    return;
  }
  
  clearUserState(userId);
  await ctx.reply('❌ Operation cancelled. Type /add to start a new transaction or send me a photo!');
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

    // Start interactive flow with extracted data
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      `✅ *I've extracted some details from your receipt!*

Let me walk you through confirming and completing the transaction details.`,
      { parse_mode: 'Markdown' }
    );

    // Start interactive transaction with extracted data
    await startInteractiveTransaction(ctx, transaction, imagePath);

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

    // Start interactive flow with extracted data
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      `✅ *I've extracted some details from your PDF!*

Let me walk you through confirming and completing the transaction details.`,
      { parse_mode: 'Markdown' }
    );

    // Start interactive transaction with extracted data
    await startInteractiveTransaction(ctx, transaction, pdfPath);

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
// Handle text messages during conversation flow
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userState = getUserState(userId);
  const messageText = ctx.message.text.toLowerCase().trim();
  
  // Skip if user is idle or if it's a command
  if (userState.state === CONVERSATION_STATES.IDLE || messageText.startsWith('/')) {
    return;
  }
  
  try {
    const transaction = userState.transaction;
    const extractedData = userState.extractedData;
    
    switch (userState.state) {
      case CONVERSATION_STATES.WAITING_FOR_AMOUNT:
        if (messageText === 'yes' && extractedData?.amount) {
          transaction.amount = extractedData.amount;
        } else {
          const amount = parseFloat(messageText);
          if (isNaN(amount) || amount <= 0) {
            await ctx.reply('❌ Please enter a valid amount (e.g., 25.50)');
            return;
          }
          transaction.amount = amount;
        }
        
        setUserState(userId, CONVERSATION_STATES.WAITING_FOR_DESCRIPTION, { transaction, extractedData });
        await askForDescription(ctx, extractedData);
        break;
        
      case CONVERSATION_STATES.WAITING_FOR_DESCRIPTION:
        if (messageText === 'yes' && extractedData?.description) {
          transaction.description = extractedData.description;
        } else {
          if (messageText.length < 3) {
            await ctx.reply('❌ Please enter a more detailed description (at least 3 characters)');
            return;
          }
          transaction.description = ctx.message.text.trim();
        }
        
        setUserState(userId, CONVERSATION_STATES.WAITING_FOR_CATEGORY, { transaction, extractedData });
        await askForCategory(ctx, extractedData);
        break;
        
      case CONVERSATION_STATES.WAITING_FOR_CATEGORY:
        // Check if user is entering a custom category
        if (userState.waitingForCustomCategory) {
          if (messageText.length < 2) {
            await ctx.reply('❌ Please enter a valid category (at least 2 characters)');
            return;
          }
          transaction.category = ctx.message.text.trim();
          setUserState(userId, CONVERSATION_STATES.WAITING_FOR_TYPE, { transaction, extractedData });
          await ctx.reply(`✅ Category set to: *${transaction.category}*`, { parse_mode: 'Markdown' });
          await askForType(ctx, extractedData);
        } else {
          // This shouldn't happen since we now use buttons, but handle just in case
          if (messageText === 'yes' && extractedData?.category) {
            transaction.category = extractedData.category;
            setUserState(userId, CONVERSATION_STATES.WAITING_FOR_TYPE, { transaction, extractedData });
            await askForType(ctx, extractedData);
          } else {
            await ctx.reply('Please use the category buttons above to select a category.');
          }
        }
        break;
        
      case CONVERSATION_STATES.WAITING_FOR_DATE:
        let date;
        if (messageText === 'yes' && extractedData?.date) {
          date = extractedData.date;
        } else if (messageText === 'today') {
          date = new Date().toISOString().split('T')[0];
        } else {
          // Validate date format YYYY-MM-DD
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(messageText)) {
            await ctx.reply('❌ Please enter date in YYYY-MM-DD format (e.g., 2024-01-15) or type "today"');
            return;
          }
          
          const parsedDate = new Date(messageText);
          if (isNaN(parsedDate.getTime())) {
            await ctx.reply('❌ Please enter a valid date in YYYY-MM-DD format');
            return;
          }
          
          date = messageText;
        }
        
        transaction.date = date;
        setUserState(userId, CONVERSATION_STATES.WAITING_FOR_BUSINESS_UNIT, { transaction, extractedData });
        await askForBusinessUnit(ctx);
        break;
        
      default:
        await ctx.reply('❌ I didn\'t understand that. Please use the buttons or type /cancel to start over.');
    }
  } catch (error) {
    console.error('Error handling text message:', error);
    await ctx.reply('❌ Something went wrong. Please try again or type /cancel to start over.');
  }
});

bot.on('callback_query', async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const userState = getUserState(userId);
    
    // Handle category selection
    if (callbackData.startsWith('cat_')) {
      const category = callbackData.split('_')[1];
      const transaction = userState.transaction;
      const extractedData = userState.extractedData;
      
      if (category === 'custom') {
        // User wants to enter custom category
        setUserState(userId, CONVERSATION_STATES.WAITING_FOR_CATEGORY, { transaction, extractedData, waitingForCustomCategory: true });
        await ctx.editMessageText('✏️ *Please type your custom category:*\n\nFor example: "Client Gifts", "Equipment Repair", etc.', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
        return;
      }
      
      // Standard category selected - map callback data to display names
      const categoryMap = {
        'Consulting': 'Consulting',
        'Sales Revenue': 'Sales Revenue',
        'Investment Income': 'Investment Income',
        'Training': 'Training/Speaking',
        'Other Income': 'Other Income',
        'Food': 'Food & Dining',
        'Transportation': 'Transportation',
        'Office Supplies': 'Office Supplies',
        'Software': 'Software/Tech',
        'Marketing': 'Marketing',
        'Rent': 'Rent/Utilities',
        'Education': 'Education',
        'Healthcare': 'Healthcare',
        'Travel': 'Travel'
      };
      
      const categoryName = categoryMap[category] || category;
      transaction.category = categoryName;
      setUserState(userId, CONVERSATION_STATES.WAITING_FOR_TYPE, { transaction, extractedData });
      
      await ctx.editMessageText(`✅ Category set to: *${categoryName}*`, { parse_mode: 'Markdown' });
      await askForType(ctx, extractedData);
      await ctx.answerCbQuery();
      return;
    }
    
    // Handle transaction type selection
    if (callbackData.startsWith('type_')) {
      const type = callbackData.split('_')[1];
      const transaction = userState.transaction;
      const extractedData = userState.extractedData;
      
      transaction.type = type;
      setUserState(userId, CONVERSATION_STATES.WAITING_FOR_DATE, { transaction, extractedData });
      
      await ctx.editMessageText(`✅ Transaction type set to: *${type}*`, { parse_mode: 'Markdown' });
      await askForDate(ctx, extractedData);
      await ctx.answerCbQuery();
      return;
    }
    
    // Handle business unit selection for new conversation flow
    if (callbackData.startsWith('bu_')) {
      try {
        const businessUnitId = callbackData.split('_')[1];
        const transaction = userState.transaction;
        
        if (!transaction) {
          console.error('No transaction in user state for business unit selection');
          await ctx.answerCbQuery('Session expired. Please start again with /add');
          return;
        }
        
        // Get business unit name
        const businessUnits = await getBusinessUnits();
        const selectedUnit = businessUnits.find(unit => unit.id === businessUnitId);
        
        if (!selectedUnit) {
          await ctx.answerCbQuery('Business unit not found. Please try again.');
          return;
        }
        
        transaction.businessUnitId = businessUnitId;
        transaction.businessUnitName = selectedUnit.name;
        
        setUserState(userId, CONVERSATION_STATES.CONFIRMING, { transaction });
        
        await ctx.editMessageText(`✅ Business unit set to: *${selectedUnit.name}*`, { parse_mode: 'Markdown' });
        await showConfirmation(ctx);
        await ctx.answerCbQuery();
        return;
      } catch (error) {
        console.error('Error in business unit selection:', error);
        await ctx.answerCbQuery('Error processing selection. Please try again.');
        return;
      }
    }
    
    // Handle confirmation actions
    if (callbackData.startsWith('confirm_')) {
      const action = callbackData.split('_')[1];
      const transaction = userState.transaction;
      
      switch (action) {
        case 'save':
          // Save the transaction
          const savedTransaction = await saveTransactionWithFile(
            {
              amount: transaction.amount,
              description: transaction.description,
              category: transaction.category,
              type: transaction.type,
              date: transaction.date
            },
            transaction.businessUnitId,
            transaction.filePath
          );
          
          await ctx.editMessageText(
            `🎉 *Transaction Added Successfully!*

💰 Amount: $${transaction.amount}
📝 Description: ${transaction.description}
🏷️ Category: ${transaction.category}
📅 Date: ${transaction.date}
📊 Type: ${transaction.type}
🏢 Business Unit: ${transaction.businessUnitName}

✅ Added to your NamOS dashboard!

Send me another receipt, PDF, or type /add to add more transactions.`,
            { parse_mode: 'Markdown' }
          );
          
          // Clean up temp file
          if (transaction.filePath && fs.existsSync(transaction.filePath)) {
            fs.unlinkSync(transaction.filePath);
          }
          
          clearUserState(userId);
          await ctx.answerCbQuery('Transaction saved successfully! 🎉');
          break;
          
        case 'cancel':
          // Clean up temp file
          if (transaction.filePath && fs.existsSync(transaction.filePath)) {
            fs.unlinkSync(transaction.filePath);
          }
          
          clearUserState(userId);
          await ctx.editMessageText('❌ Transaction cancelled. Type /add to start a new transaction or send me a photo!');
          await ctx.answerCbQuery('Transaction cancelled');
          break;
          
        case 'edit':
          // Restart the flow
          setUserState(userId, CONVERSATION_STATES.WAITING_FOR_AMOUNT, { transaction, extractedData: null });
          await ctx.editMessageText('✏️ *Let\'s edit the transaction details.*', { parse_mode: 'Markdown' });
          await askForAmount(ctx);
          await ctx.answerCbQuery('Editing transaction');
          break;
      }
      return;
    }
    
    // Legacy business unit selection (for old format)
    if (callbackData.startsWith('unit_')) {
      const parts = callbackData.split('_');
      const businessUnitId = parts[1];
      const transactionKey = parts[2];
      
      // Get transaction data from temporary storage
      const transactionData = global.pendingTransactions[transactionKey];
      
      if (!transactionData) {
        await ctx.answerCbQuery('Transaction expired. Please try again.');
        return;
      }
      
      const { transaction, filePath } = transactionData;
      
      // Save transaction with file to database
      const savedTransaction = await saveTransactionWithFile(transaction, businessUnitId, filePath);
      
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
      
      // Clean up temporary storage and temp file
      delete global.pendingTransactions[transactionKey];
      
      // Clean up temp file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
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
