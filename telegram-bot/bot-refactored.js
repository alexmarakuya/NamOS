// NamOS Financial Bot - Refactored and Cleaned Up
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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Conversation states
const STATES = {
  IDLE: 'idle',
  AREA: 'waiting_for_area',
  EXPENSE_TYPE: 'waiting_for_expense_type',
  AMOUNT: 'waiting_for_amount',
  DESCRIPTION: 'waiting_for_description',
  CATEGORY: 'waiting_for_category',
  TYPE: 'waiting_for_type',
  DATE: 'waiting_for_date',
  REIMBURSEMENT: 'waiting_for_reimbursement',
  CONFIRMING: 'confirming'
};

// Global state storage (in production, use Redis)
global.userStates = {};
global.pendingTransactions = {};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getUserState = (userId) => global.userStates[userId] || { state: STATES.IDLE };
const setUserState = (userId, state, data = {}) => { global.userStates[userId] = { state, ...data }; };
const clearUserState = (userId) => { delete global.userStates[userId]; };

const getContentType = (fileExt) => {
  const types = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'pdf': 'application/pdf'
  };
  return types[fileExt?.toLowerCase()] || 'application/octet-stream';
};

const formatDate = (date) => {
  if (date === 'today') return new Date().toISOString().split('T')[0];
  return date;
};

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

const getAreas = async () => {
  try {
    const { data, error } = await supabase.from('business_units').select('*').order('name');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching areas:', error);
    return [];
  }
};

const saveTransaction = async (transaction, businessUnitId, filePath = null) => {
  try {
    // Save transaction
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([{ ...transaction, business_unit_id: businessUnitId }])
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Handle file attachment if present
    if (filePath && fs.existsSync(filePath)) {
      await handleFileAttachment(transactionData.id, filePath);
    }

    return transactionData;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
};

const handleFileAttachment = async (transactionId, filePath) => {
  try {
    const fileName = path.basename(filePath);
    const fileExt = fileName.split('.').pop();
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fs.statSync(filePath).size;
    const storagePath = `${transactionId}/${Date.now()}-${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('transaction-attachments')
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(fileExt),
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return;
    }

    // Create attachment record
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('attachments')
      .insert([{
        transaction_id: transactionId,
        file_name: fileName,
        file_type: getContentType(fileExt),
        file_size: fileSize,
        storage_path: storagePath,
        upload_source: 'telegram'
      }])
      .select()
      .single();

    if (!attachmentError && attachmentData) {
      // Update transaction with primary attachment
      await supabase
        .from('transactions')
        .update({ primary_attachment_id: attachmentData.id })
        .eq('id', transactionId);
    }
  } catch (error) {
    console.error('File attachment error:', error);
    // Don't fail transaction if file handling fails
  }
};

// ============================================================================
// FILE PROCESSING FUNCTIONS
// ============================================================================

const downloadFile = async (ctx, fileId) => {
  try {
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const fileName = `temp_${Date.now()}_${path.basename(file.file_path)}`;
    const localPath = path.join(__dirname, 'temp', fileName);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(localPath);
      https.get(fileUrl, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(localPath);
        });
      }).on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

const extractTextFromImage = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    return text;
  } catch (error) {
    console.error('OCR error:', error);
    return '';
  }
};

const extractTextFromPDF = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    return '';
  }
};

const parseTransactionFromText = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Extract transaction details from this text and return ONLY a JSON object:
        
        ${text}
        
        Return format:
        {
          "amount": number,
          "description": "string",
          "category": "string",
          "type": "income" or "expense",
          "date": "YYYY-MM-DD"
        }`
      }],
      temperature: 0.1
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('AI parsing error:', error);
    return {
      amount: null,
      description: null,
      category: null,
      type: null,
      date: new Date().toISOString().split('T')[0]
    };
  }
};

// ============================================================================
// CONVERSATION FLOW FUNCTIONS
// ============================================================================

const startConversation = async (ctx, extractedData = null, filePath = null) => {
  const userId = ctx.from.id;
  const transaction = {
    amount: extractedData?.amount || null,
    description: extractedData?.description || null,
    category: extractedData?.category || null,
    type: extractedData?.type || null,
    date: extractedData?.date || null,
    reimbursementStatus: 'none',
    expenseType: null, // 'business' or 'personal'
    filePath
  };

  setUserState(userId, STATES.AREA, { transaction, extractedData });
  await askForArea(ctx);
};

const askForArea = async (ctx) => {
  const areas = await getAreas();
  if (areas.length === 0) {
    await ctx.reply('❌ No areas found. Please set up areas in your dashboard first.');
    clearUserState(ctx.from.id);
    return;
  }

  const keyboard = areas.map(area => {
    let emoji = '🏢';
    let description = '';
    
    if (area.name === 'NAM Studio') {
      emoji = '🏢';
      description = ' (Thai Company - Business)';
    } else if (area.name === 'NAM Space') {
      emoji = '🚀';
      description = ' (Project - Mixed)';
    } else if (area.name === 'Kin House') {
      emoji = '🏠';
      description = ' (Home/Office - Mixed)';
    } else if (area.name === 'Marakuya LLC') {
      emoji = '🇺🇸';
      description = ' (US LLC - Business)';
    }
    
    return [{ text: `${emoji} ${area.name}${description}`, callback_data: `area_${area.id}` }];
  });

  const message = '*🏢 Which area is this expense for?*\n\n' +
    '🏢 **NAM Studio**: Thai company (all business expenses)\n' +
    '🚀 **NAM Space**: Project within NAM Studio (mixed)\n' +
    '🏠 **Kin House**: Home/Office space (mixed)\n' +
    '🇺🇸 **Marakuya LLC**: US LLC with foreign income (business)\n\n' +
    'Select the appropriate area:';

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

const askForExpenseType = async (ctx) => {
  const userId = ctx.from.id;
  const userState = getUserState(userId);
  const areaName = userState.transaction?.areaName;
  
  // Only ask for NAM Space and Kin House (mixed areas)
  if (areaName === 'NAM Studio' || areaName === 'Marakuya LLC') {
    // NAM Studio and Marakuya LLC are always business
    userState.transaction.expenseType = 'business';
    setUserState(userId, STATES.AMOUNT, userState);
    await askForAmount(ctx, userState.extractedData);
    return;
  }
  
  const keyboard = [
    [{ text: '💼 Business Expense', callback_data: 'exptype_business' }],
    [{ text: '👤 Personal Expense', callback_data: 'exptype_personal' }]
  ];

  let message = '';
  if (areaName === 'NAM Space') {
    message = '🚀 *NAM Space - Is this a business or personal expense?*\n\n' +
      '💼 **Business**: Project development, equipment, consulting\n' +
      '👤 **Personal**: Personal expenses related to the project\n\n' +
      'Select expense type:';
  } else if (areaName === 'Kin House') {
    message = '🏠 *Kin House - Is this a business or personal expense?*\n\n' +
      '💼 **Business**: Home office utilities, rent, equipment\n' +
      '👤 **Personal**: Personal living, food, shopping\n\n' +
      'Select expense type:';
  } else {
    message = '*Is this a business or personal expense?*\n\nSelect expense type:';
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

const askForAmount = async (ctx, extractedData = null) => {
  let message = '💰 *What\'s the transaction amount?*\n\n';
  let keyboard = [];
  
  if (extractedData?.amount) {
    message += `I extracted: *$${extractedData.amount}*\n\n`;
    message += 'Choose an option:';
    keyboard = [
      [{ text: `✅ Use $${extractedData.amount}`, callback_data: 'amount_confirm' }],
      [{ text: '✏️ Enter Different Amount', callback_data: 'amount_custom' }]
    ];
  } else {
    message += 'Please enter the amount (e.g., 25.50)';
  }
  
  const options = { parse_mode: 'Markdown' };
  if (keyboard.length > 0) {
    options.reply_markup = { inline_keyboard: keyboard };
  }
  
  await ctx.reply(message, options);
};

const askForDescription = async (ctx, extractedData = null) => {
  let message = '📝 *What\'s this transaction for?*\n\n';
  let keyboard = [];
  
  if (extractedData?.description) {
    message += `I extracted: *${extractedData.description}*\n\n`;
    message += 'Choose an option:';
    keyboard = [
      [{ text: `✅ Use "${extractedData.description}"`, callback_data: 'desc_confirm' }],
      [{ text: '✏️ Enter Different Description', callback_data: 'desc_custom' }]
    ];
  } else {
    message += 'Please describe the transaction (e.g., "Coffee at Starbucks")';
  }
  
  const options = { parse_mode: 'Markdown' };
  if (keyboard.length > 0) {
    options.reply_markup = { inline_keyboard: keyboard };
  }
  
  await ctx.reply(message, options);
};

const askForCategory = async (ctx, extractedData = null) => {
  const userId = ctx.from.id;
  const userState = getUserState(userId);
  const areaName = userState.transaction?.areaName;
  const expenseType = userState.transaction?.expenseType;
  
  // Customize categories based on area AND expense type
  let categories;
  let categoryMessage = '';
  
  if (areaName === 'NAM Studio') {
    // NAM Studio is always business
    categoryMessage = '🏢 **NAM Studio** - Standardized categories for Thai tax compliance:';
    categories = [
      { text: '🏢 Office Rent & Utilities', callback_data: 'cat_Office Rent & Utilities' },
      { text: '💼 Professional Services', callback_data: 'cat_Professional Services' },
      { text: '💻 Software & Technology', callback_data: 'cat_Software & Technology' },
      { text: '📱 Marketing & Advertising', callback_data: 'cat_Marketing & Advertising' },
      { text: '✈️ Business Travel', callback_data: 'cat_Business Travel' },
      { text: '📄 Office Supplies & Equipment', callback_data: 'cat_Office Supplies & Equipment' },
      { text: '📞 Telecommunications', callback_data: 'cat_Telecommunications' },
      { text: '🎓 Training & Development', callback_data: 'cat_Training & Development' },
      { text: '🍽️ Business Meals & Entertainment', callback_data: 'cat_Business Meals & Entertainment' },
      { text: '🛡️ Insurance & Licenses', callback_data: 'cat_Insurance & Licenses' },
      { text: '✏️ Custom Business Category', callback_data: 'cat_custom' }
    ];
  } else if (areaName === 'Marakuya LLC') {
    // Marakuya LLC is always business - US tax categories
    categoryMessage = '🇺🇸 **Marakuya LLC** - US tax compliance categories:';
    categories = [
      { text: '💰 Foreign Income Received', callback_data: 'cat_Foreign Income Received' },
      { text: '✈️ US Business Travel', callback_data: 'cat_US Business Travel' },
      { text: '💼 US Professional Services', callback_data: 'cat_US Professional Services' },
      { text: '💻 US Software & Technology', callback_data: 'cat_US Software & Technology' },
      { text: '📱 US Marketing & Advertising', callback_data: 'cat_US Marketing & Advertising' },
      { text: '🏢 US Office & Equipment', callback_data: 'cat_US Office & Equipment' },
      { text: '🏦 US Banking & Finance', callback_data: 'cat_US Banking & Finance' },
      { text: '📞 US Telecommunications', callback_data: 'cat_US Telecommunications' },
      { text: '🎓 US Training & Education', callback_data: 'cat_US Training & Education' },
      { text: '🛡️ US Business Insurance', callback_data: 'cat_US Business Insurance' },
      { text: '📊 US Tax & Compliance', callback_data: 'cat_US Tax & Compliance' },
      { text: '💹 Foreign Exchange Loss', callback_data: 'cat_Foreign Exchange Loss' },
      { text: '💸 Foreign Exchange Gain', callback_data: 'cat_Foreign Exchange Gain' },
      { text: '✏️ Custom US Category', callback_data: 'cat_custom' }
    ];
  } else if (areaName === 'NAM Space') {
    if (expenseType === 'business') {
      categoryMessage = '🚀 **NAM Space Business** - Project business expenses:';
      categories = [
        { text: '🚀 Project Development', callback_data: 'cat_Project Development' },
        { text: '📱 Project Marketing', callback_data: 'cat_Project Marketing' },
        { text: '🔧 Project Equipment', callback_data: 'cat_Project Equipment' },
        { text: '💼 Project Consulting', callback_data: 'cat_Project Consulting' },
        { text: '🏢 Office Rent & Utilities', callback_data: 'cat_Office Rent & Utilities' },
        { text: '💻 Software & Technology', callback_data: 'cat_Software & Technology' },
        { text: '✈️ Business Travel', callback_data: 'cat_Business Travel' },
        { text: '✏️ Custom Business Category', callback_data: 'cat_custom' }
      ];
    } else {
      categoryMessage = '🚀 **NAM Space Personal** - Personal expenses related to project:';
      categories = [
        { text: '🍽️ Food & Dining', callback_data: 'cat_Food & Dining' },
        { text: '⛽ Transportation', callback_data: 'cat_Transportation' },
        { text: '🛍️ Shopping & Retail', callback_data: 'cat_Shopping & Retail' },
        { text: '🎨 Entertainment', callback_data: 'cat_Entertainment' },
        { text: '👤 Personal Development', callback_data: 'cat_Personal Development' },
        { text: '✏️ Custom Personal Category', callback_data: 'cat_custom' }
      ];
    }
  } else if (areaName === 'Kin House') {
    if (expenseType === 'business') {
      categoryMessage = '🏠 **Kin House Business** - Home office business expenses:';
      categories = [
        { text: '🏢 Home Office Utilities', callback_data: 'cat_Home Office Utilities' },
        { text: '🏠 Home Office Rent', callback_data: 'cat_Home Office Rent' },
        { text: '💻 Office Equipment', callback_data: 'cat_Office Equipment' },
        { text: '📞 Internet & Phone', callback_data: 'cat_Internet & Phone' },
        { text: '📄 Office Supplies', callback_data: 'cat_Office Supplies' },
        { text: '✏️ Custom Business Category', callback_data: 'cat_custom' }
      ];
    } else {
      categoryMessage = '🏠 **Kin House Personal** - Personal living expenses:';
      categories = [
        { text: '🔧 Home Maintenance', callback_data: 'cat_Home Maintenance' },
        { text: '👤 Personal Living Expenses', callback_data: 'cat_Personal Living Expenses' },
        { text: '⚡ Shared Utilities', callback_data: 'cat_Shared Utilities' },
        { text: '🏠 Home Improvements', callback_data: 'cat_Home Improvements' },
        { text: '🍽️ Food & Dining', callback_data: 'cat_Food & Dining' },
        { text: '🛍️ Shopping & Retail', callback_data: 'cat_Shopping & Retail' },
        { text: '🎨 Entertainment', callback_data: 'cat_Entertainment' },
        { text: '✏️ Custom Personal Category', callback_data: 'cat_custom' }
      ];
    }
  } else {
    categoryMessage = 'Please select a category:';
    categories = [
      { text: '💼 Business Expense', callback_data: 'cat_Business Expense' },
      { text: '👤 Personal Expense', callback_data: 'cat_Personal Expense' },
      { text: '✏️ Custom Category', callback_data: 'cat_custom' }
    ];
  }

  const keyboard = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = [categories[i]];
    if (categories[i + 1]) row.push(categories[i + 1]);
    keyboard.push(row);
  }

  let message = `🏷️ *What category is this transaction?*\n\n${categoryMessage}\n\n`;
  if (extractedData?.category) {
    message += `I extracted: *${extractedData.category}*\n\n`;
    message += 'Choose a category below or select "Custom Category":';
  } else {
    message += 'Select the appropriate category:';
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
  let keyboard = [];
  
  if (extractedData?.date) {
    message += `I extracted: *${extractedData.date}*\n\n`;
    message += 'Choose an option:';
    keyboard = [
      [{ text: `✅ Use ${extractedData.date}`, callback_data: 'date_confirm' }],
      [{ text: '📅 Today', callback_data: 'date_today' }],
      [{ text: '📅 Yesterday', callback_data: 'date_yesterday' }],
      [{ text: '✏️ Enter Different Date', callback_data: 'date_custom' }]
    ];
  } else {
    message += 'Choose a date option:';
    keyboard = [
      [{ text: '📅 Today', callback_data: 'date_today' }],
      [{ text: '📅 Yesterday', callback_data: 'date_yesterday' }],
      [{ text: '✏️ Enter Specific Date', callback_data: 'date_custom' }]
    ];
  }
  
  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

const askForReimbursement = async (ctx) => {
  const userId = ctx.from.id;
  const userState = getUserState(userId);
  const areaName = userState.transaction?.areaName;
  const category = userState.transaction?.category;
  
  // Only ask for reimbursement for Kin House or certain categories
  const needsReimbursementCheck = 
    areaName === 'Kin House' || 
    ['Home Maintenance', 'Shared Utilities', 'Home Improvements'].includes(category);
  
  if (!needsReimbursementCheck) {
    // Skip reimbursement for business expenses
    setUserState(userId, STATES.CONFIRMING, { transaction: userState.transaction });
    await showConfirmation(ctx);
    return;
  }
  
  const keyboard = [
    [{ text: '🏢 No Reimbursement', callback_data: 'reimb_none' }],
    [{ text: '🏠 Landlord Reimbursable', callback_data: 'reimb_landlord_pending' }],
    [{ text: '💼 Company Reimbursable', callback_data: 'reimb_company_pending' }]
  ];

  const message = '💳 *Is this expense reimbursable?*\n\n' +
    '🏠 **Landlord**: Maintenance, utilities, improvements\n' +
    '💼 **Company**: Business expenses paid personally\n' +
    '🏢 **No Reimbursement**: Personal expense\n\n' +
    'Select reimbursement type:';

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

const showConfirmation = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userState = getUserState(userId);
    const transaction = userState.transaction;

    if (!transaction) {
      await ctx.reply('❌ Session expired. Please start again with /add');
      return;
    }

    const keyboard = [
      [
        { text: '✅ Confirm & Save', callback_data: 'confirm_save' },
        { text: '❌ Cancel', callback_data: 'confirm_cancel' }
      ]
    ];

    const expenseTypeEmoji = transaction.expenseType === 'business' ? '💼' : '👤';
    
    let message = '📋 *Please confirm your transaction:*\n\n';
    message += `🏢 Area: ${transaction.areaName}\n`;
    if (transaction.expenseType) {
      message += `${expenseTypeEmoji} Expense Type: ${transaction.expenseType?.charAt(0).toUpperCase() + transaction.expenseType?.slice(1)}\n`;
    }
    message += `💰 Amount: $${transaction.amount}\n`;
    message += `📝 Description: ${transaction.description}\n`;
    message += `🏷️ Category: ${transaction.category}\n`;
    message += `📊 Type: ${transaction.type}\n`;
    message += `📅 Date: ${transaction.date}\n`;
    
    if (transaction.reimbursementStatus && transaction.reimbursementStatus !== 'none') {
      let reimbursementText = 'Unknown';
      if (transaction.reimbursementStatus === 'landlord_pending') reimbursementText = '🏠 Landlord Reimbursable';
      if (transaction.reimbursementStatus === 'company_pending') reimbursementText = '💼 Company Reimbursable';
      message += `💳 Reimbursement: ${reimbursementText}\n`;
    }

    if (transaction.filePath) {
      message += `📎 Attachment: Yes\n`;
    }

    message += '\n*Is this correct?*';

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    console.error('Error in showConfirmation:', error);
    await ctx.reply('❌ Error showing confirmation. Please try /add again.');
  }
};

// ============================================================================
// BOT COMMANDS
// ============================================================================

bot.start((ctx) => {
  ctx.reply(`🏦 *NamOS Financial Bot*

Welcome! I can help you add business and personal transactions.

*How to use:*
• Send me a photo of a receipt
• Send me a PDF invoice  
• Use /add for manual entry

*Smart Features:*
💼 Business transactions → Choose from areas
👤 Personal transactions → Smart area assignment
🏷️ Custom categories for business vs personal
🇺🇸 US LLC foreign income tracking

*Commands:*
/start - Show this message
/add - Add transaction manually
/help - Show help
/cancel - Cancel current operation`, { parse_mode: 'Markdown' });
});

bot.command('add', async (ctx) => {
  clearUserState(ctx.from.id);
  await ctx.reply('📝 *Let\'s add a new transaction!*\n\nI\'ll ask you a few questions.', { parse_mode: 'Markdown' });
  await startConversation(ctx);
});

bot.command('cancel', (ctx) => {
  clearUserState(ctx.from.id);
  ctx.reply('❌ Operation cancelled. Use /add to start again!');
});

bot.help((ctx) => {
  ctx.reply(`*NamOS Financial Bot Help*

📸 *Photo*: Send receipt image for auto-extraction
📄 *PDF*: Send invoice PDF for auto-extraction  
✏️ */add*: Manual transaction entry
❌ */cancel*: Cancel current operation

*Areas:*
🏢 *NAM Studio*: Thai company (business only)
🚀 *NAM Space*: Project within NAM Studio (mixed)
🏠 *Kin House*: Home/Office space (mixed)
🇺🇸 *Marakuya LLC*: US LLC with foreign income (business only)

*Categories*:
• Thai: Office, Professional, Software, Marketing, Travel...
• US LLC: Foreign Income, US Travel, US Professional Services...
• Personal: Food, Housing, Shopping, Entertainment, Health...

The bot will guide you through each step!`, { parse_mode: 'Markdown' });
});

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

// Handle text messages during conversation
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userState = getUserState(userId);
  const text = ctx.message.text.toLowerCase().trim();

  if (userState.state === STATES.IDLE || text.startsWith('/')) return;

  try {
    const { transaction, extractedData } = userState;

    switch (userState.state) {
      case STATES.AMOUNT:
        if (userState.waitingForCustomAmount) {
          const amount = parseFloat(text);
          if (isNaN(amount) || amount <= 0) {
            await ctx.reply('❌ Please enter a valid amount (e.g., 25.50)');
            return;
          }
          transaction.amount = amount;
          setUserState(userId, STATES.DESCRIPTION, { transaction, extractedData });
          await askForDescription(ctx, extractedData);
        } else if (text === 'yes' && extractedData?.amount) {
          transaction.amount = extractedData.amount;
          setUserState(userId, STATES.DESCRIPTION, { transaction, extractedData });
          await askForDescription(ctx, extractedData);
        } else {
          const amount = parseFloat(text);
          if (isNaN(amount) || amount <= 0) {
            await ctx.reply('❌ Please enter a valid amount (e.g., 25.50)');
            return;
          }
          transaction.amount = amount;
          setUserState(userId, STATES.DESCRIPTION, { transaction, extractedData });
          await askForDescription(ctx, extractedData);
        }
        break;

      case STATES.DESCRIPTION:
        if (userState.waitingForCustomDescription) {
          if (text.length < 3) {
            await ctx.reply('❌ Please enter a more detailed description');
            return;
          }
          transaction.description = ctx.message.text.trim();
          setUserState(userId, STATES.CATEGORY, { transaction, extractedData });
          await askForCategory(ctx, extractedData);
        } else if (text === 'yes' && extractedData?.description) {
          transaction.description = extractedData.description;
          setUserState(userId, STATES.CATEGORY, { transaction, extractedData });
          await askForCategory(ctx, extractedData);
        } else {
          if (text.length < 3) {
            await ctx.reply('❌ Please enter a more detailed description');
            return;
          }
          transaction.description = ctx.message.text.trim();
          setUserState(userId, STATES.CATEGORY, { transaction, extractedData });
          await askForCategory(ctx, extractedData);
        }
        break;

      case STATES.CATEGORY:
        if (userState.waitingForCustomCategory) {
          if (text.length < 2) {
            await ctx.reply('❌ Please enter a valid category');
            return;
          }
          transaction.category = ctx.message.text.trim();
          setUserState(userId, STATES.TYPE, { transaction, extractedData });
          await askForType(ctx, extractedData);
        }
        break;

      case STATES.DATE:
        if (userState.waitingForCustomDate) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(text)) {
            await ctx.reply('❌ Please enter date in YYYY-MM-DD format (e.g., 2024-01-15)');
            return;
          }
          transaction.date = text;
          
          // Auto-assign personal transactions to personal business unit
          if (transaction.transactionType === 'personal') {
            const businessUnits = await getBusinessUnits();
            const personalUnit = businessUnits.find(unit => unit.type === 'personal');
            
            if (personalUnit) {
              transaction.areaId = personalUnit.id;
              transaction.areaName = personalUnit.name;
              setUserState(userId, STATES.CONFIRMING, { transaction });
              await showConfirmation(ctx);
            } else {
              await ctx.reply('❌ No personal business unit found. Please set up a personal unit in your dashboard first.');
              clearUserState(userId);
            }
          } else {
            // For business transactions, show business unit selection
            setUserState(userId, STATES.BUSINESS_UNIT, { transaction, extractedData });
            await askForBusinessUnit(ctx);
          }
        } else {
          let date;
          if (text === 'yes' && extractedData?.date) {
            date = extractedData.date;
          } else if (text === 'today') {
            date = new Date().toISOString().split('T')[0];
          } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(text)) {
              await ctx.reply('❌ Please use the buttons above or enter date in YYYY-MM-DD format');
              return;
            }
            date = text;
          }
          transaction.date = date;
          
          // Auto-assign personal transactions to personal business unit
          if (transaction.transactionType === 'personal') {
            const businessUnits = await getBusinessUnits();
            const personalUnit = businessUnits.find(unit => unit.type === 'personal');
            
            if (personalUnit) {
              transaction.areaId = personalUnit.id;
              transaction.areaName = personalUnit.name;
              setUserState(userId, STATES.CONFIRMING, { transaction });
              await showConfirmation(ctx);
            } else {
              await ctx.reply('❌ No personal business unit found. Please set up a personal unit in your dashboard first.');
              clearUserState(userId);
            }
          } else {
            // For business transactions, show business unit selection
            setUserState(userId, STATES.BUSINESS_UNIT, { transaction, extractedData });
            await askForBusinessUnit(ctx);
          }
        }
        break;

      default:
        await ctx.reply('❌ Please use the buttons or type /cancel to start over.');
    }
  } catch (error) {
    console.error('Error handling text:', error);
    await ctx.reply('❌ Something went wrong. Please try /cancel and start again.');
  }
});

// Handle callback queries (button presses)
bot.on('callback_query', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userState = getUserState(userId);
    const data = ctx.callbackQuery.data;

    // Transaction type selection (business/personal)
    if (data.startsWith('transtype_')) {
      const transactionType = data.split('_')[1]; // 'business' or 'personal'
      const { transaction, extractedData } = userState;
      
      transaction.transactionType = transactionType;
      setUserState(userId, STATES.AMOUNT, { transaction, extractedData });
      
      const typeEmoji = transactionType === 'business' ? '💼' : '👤';
      await ctx.editMessageText(`✅ Transaction Type: *${typeEmoji} ${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}*`, { parse_mode: 'Markdown' });
      await askForAmount(ctx, extractedData);
      await ctx.answerCbQuery();
    }

    // Amount confirmation/custom
    if (data.startsWith('amount_')) {
      const action = data.split('_')[1];
      const { transaction, extractedData } = userState;
      
      if (action === 'confirm') {
        transaction.amount = extractedData.amount;
        setUserState(userId, STATES.DESCRIPTION, { transaction, extractedData });
        await ctx.editMessageText(`✅ Amount: *$${transaction.amount}*`, { parse_mode: 'Markdown' });
        await askForDescription(ctx, extractedData);
      } else if (action === 'custom') {
        setUserState(userId, STATES.AMOUNT, { transaction, extractedData, waitingForCustomAmount: true });
        await ctx.editMessageText('💰 *Please type the correct amount:*\n\nExample: 25.50', { parse_mode: 'Markdown' });
      }
      await ctx.answerCbQuery();
    }
    
    // Description confirmation/custom
    else if (data.startsWith('desc_')) {
      const action = data.split('_')[1];
      const { transaction, extractedData } = userState;
      
      if (action === 'confirm') {
        transaction.description = extractedData.description;
        setUserState(userId, STATES.CATEGORY, { transaction, extractedData });
        await ctx.editMessageText(`✅ Description: *${transaction.description}*`, { parse_mode: 'Markdown' });
        await askForCategory(ctx, extractedData);
      } else if (action === 'custom') {
        setUserState(userId, STATES.DESCRIPTION, { transaction, extractedData, waitingForCustomDescription: true });
        await ctx.editMessageText('📝 *Please type a description:*\n\nExample: "Coffee at Starbucks"', { parse_mode: 'Markdown' });
      }
      await ctx.answerCbQuery();
    }
    
    // Date selection
    else if (data.startsWith('date_')) {
      const action = data.split('_')[1];
      const { transaction, extractedData } = userState;
      
      if (action === 'confirm') {
        transaction.date = extractedData.date;
      } else if (action === 'today') {
        transaction.date = new Date().toISOString().split('T')[0];
      } else if (action === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        transaction.date = yesterday.toISOString().split('T')[0];
      } else if (action === 'custom') {
        setUserState(userId, STATES.DATE, { transaction, extractedData, waitingForCustomDate: true });
        await ctx.editMessageText('📅 *Please enter the date:*\n\nFormat: YYYY-MM-DD (e.g., 2024-01-15)', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
        return;
      }
      
      await ctx.editMessageText(`✅ Date: *${transaction.date}*`, { parse_mode: 'Markdown' });
      
      // Auto-assign personal transactions to personal business unit
      if (transaction.transactionType === 'personal') {
        const businessUnits = await getBusinessUnits();
        const personalUnit = businessUnits.find(unit => unit.type === 'personal');
        
        if (personalUnit) {
          transaction.businessUnitId = personalUnit.id;
          transaction.businessUnitName = personalUnit.name;
          setUserState(userId, STATES.CONFIRMING, { transaction });
          await showConfirmation(ctx);
        } else {
          await ctx.reply('❌ No personal business unit found. Please set up a personal unit in your dashboard first.');
          clearUserState(userId);
        }
      } else {
        // For business transactions, show business unit selection
        setUserState(userId, STATES.BUSINESS_UNIT, { transaction, extractedData });
        await askForBusinessUnit(ctx);
      }
      await ctx.answerCbQuery();
    }

    // Expense type selection (business/personal)
    else if (data.startsWith('exptype_')) {
      const expenseType = data.split('_')[1]; // 'business' or 'personal'
      const { transaction, extractedData } = userState;
      
      transaction.expenseType = expenseType;
      setUserState(userId, STATES.AMOUNT, { transaction, extractedData });
      
      const typeEmoji = expenseType === 'business' ? '💼' : '👤';
      await ctx.editMessageText(`✅ Expense Type: *${typeEmoji} ${expenseType.charAt(0).toUpperCase() + expenseType.slice(1)}*`, { parse_mode: 'Markdown' });
      await askForAmount(ctx, extractedData);
      await ctx.answerCbQuery();
    }

    // Category selection
    else if (data.startsWith('cat_')) {
      const category = data.split('_')[1];
      const { transaction, extractedData } = userState;

      if (category === 'custom') {
        setUserState(userId, STATES.CATEGORY, { transaction, extractedData, waitingForCustomCategory: true });
        await ctx.editMessageText('✏️ *Please type your custom category:*', { parse_mode: 'Markdown' });
      } else {
        transaction.category = category;
        setUserState(userId, STATES.TYPE, { transaction, extractedData });
        await ctx.editMessageText(`✅ Category: *${category}*`, { parse_mode: 'Markdown' });
        await askForType(ctx, extractedData);
      }
      await ctx.answerCbQuery();
    }

    // Type selection
    else if (data.startsWith('type_')) {
      const type = data.split('_')[1];
      const { transaction, extractedData } = userState;
      
      transaction.type = type;
      setUserState(userId, STATES.DATE, { transaction, extractedData });
      await ctx.editMessageText(`✅ Type: *${type}*`, { parse_mode: 'Markdown' });
      await askForDate(ctx, extractedData);
      await ctx.answerCbQuery();
    }

    // Area selection
    else if (data.startsWith('area_')) {
      const areaId = data.split('_')[1];
      const { transaction } = userState;

      const areas = await getAreas();
      const selectedArea = areas.find(area => area.id === areaId);

      if (selectedArea) {
        transaction.areaId = areaId;
        transaction.areaName = selectedArea.name;
        setUserState(userId, STATES.EXPENSE_TYPE, { transaction, extractedData });
        await ctx.editMessageText(`✅ Area: *${selectedArea.name}*`, { parse_mode: 'Markdown' });
        await askForExpenseType(ctx);
      }
      await ctx.answerCbQuery();
    }

    // Reimbursement selection
    else if (data.startsWith('reimb_')) {
      const reimbursementStatus = data.split('_').slice(1).join('_'); // Handle 'landlord_pending' etc.
      const { transaction } = userState;
      
      transaction.reimbursementStatus = reimbursementStatus;
      setUserState(userId, STATES.CONFIRMING, { transaction });
      
      let statusText = 'No Reimbursement';
      if (reimbursementStatus === 'landlord_pending') statusText = '🏠 Landlord Reimbursable';
      if (reimbursementStatus === 'company_pending') statusText = '💼 Company Reimbursable';
      
      await ctx.editMessageText(`✅ Reimbursement: *${statusText}*`, { parse_mode: 'Markdown' });
      await showConfirmation(ctx);
      await ctx.answerCbQuery();
    }

    // Confirmation actions
    else if (data.startsWith('confirm_')) {
      const action = data.split('_')[1];
      const { transaction } = userState;

      if (action === 'save') {
        const savedTransaction = await saveTransaction(
          {
            amount: transaction.amount,
            description: transaction.description,
            category: transaction.category,
            type: transaction.type,
            date: transaction.date
          },
          transaction.areaId,
          transaction.filePath
        );

        const expenseTypeEmoji = transaction.expenseType === 'business' ? '💼' : '👤';
        
        let successMessage = `🎉 *Transaction Added Successfully!*

🏢 Area: ${transaction.areaName}
`;
        if (transaction.expenseType) {
          successMessage += `${expenseTypeEmoji} Type: ${transaction.expenseType?.charAt(0).toUpperCase() + transaction.expenseType?.slice(1)}
`;
        }
        successMessage += `💰 Amount: $${transaction.amount}
📝 Description: ${transaction.description}

✅ Added to your NamOS dashboard!`;
        
        await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });

        // Clean up temp file
        if (transaction.filePath && fs.existsSync(transaction.filePath)) {
          fs.unlinkSync(transaction.filePath);
        }
        clearUserState(userId);
      } else if (action === 'cancel') {
        if (transaction.filePath && fs.existsSync(transaction.filePath)) {
          fs.unlinkSync(transaction.filePath);
        }
        clearUserState(userId);
        await ctx.editMessageText('❌ Transaction cancelled.');
      }
      await ctx.answerCbQuery();
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    await ctx.answerCbQuery('Error processing request. Please try again.');
  }
});

// Handle photo messages
bot.on('photo', async (ctx) => {
  const processingMsg = await ctx.reply('📸 Processing image...');

  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const imagePath = await downloadFile(ctx, photo.file_id);

    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '🔍 Extracting text...');
    const extractedText = await extractTextFromImage(imagePath);

    if (!extractedText.trim()) {
      await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '❌ Could not extract text. Try a clearer photo.');
      return;
    }

    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '🤖 Analyzing details...');
    const transaction = await parseTransactionFromText(extractedText);

    const businessUnits = await getBusinessUnits();
    if (businessUnits.length === 0) {
      await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '❌ No business units found. Set up business units first.');
      return;
    }

    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '✅ *Details extracted!*\n\nLet me guide you through confirming them.', { parse_mode: 'Markdown' });
    await startConversation(ctx, transaction, imagePath);

  } catch (error) {
    console.error('Error processing image:', error);
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '❌ Error processing image. Please try again.');
  }
});

// Handle PDF documents
bot.on('document', async (ctx) => {
  const document = ctx.message.document;
  
  if (document.mime_type !== 'application/pdf') {
    ctx.reply('📄 Please send a PDF file only.');
    return;
  }

  const processingMsg = await ctx.reply('📄 Processing PDF...');

  try {
    const pdfPath = await downloadFile(ctx, document.file_id);

    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '🔍 Extracting text...');
    const extractedText = await extractTextFromPDF(pdfPath);

    if (!extractedText.trim()) {
      await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '❌ Could not extract text from PDF.');
      return;
    }

    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '🤖 Analyzing details...');
    const transaction = await parseTransactionFromText(extractedText);

    const businessUnits = await getBusinessUnits();
    if (businessUnits.length === 0) {
      await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '❌ No business units found. Set up business units first.');
      return;
    }

    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '✅ *Details extracted!*\n\nLet me guide you through confirming them.', { parse_mode: 'Markdown' });
    await startConversation(ctx, transaction, pdfPath);

  } catch (error) {
    console.error('Error processing PDF:', error);
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '❌ Error processing PDF. Please try again.');
  }
});

// ============================================================================
// BOT STARTUP
// ============================================================================

console.log('🚀 Starting NamOS Financial Bot...');

bot.launch().then(() => {
  console.log('🤖 NamOS Financial Bot is running!');
}).catch((error) => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
