const { App } = require('@slack/bolt');
const { TimeTrackingDB } = require('./supabase');
const { format, parseISO, startOfWeek, endOfWeek, startOfDay, subDays } = require('date-fns');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000
});

// Initialize database
const db = new TimeTrackingDB();

// Helper functions
function formatHours(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseTimeInput(timeStr) {
  // Parse various time formats with natural language support
  timeStr = timeStr.toLowerCase().trim();
  
  // Handle natural language expressions
  const naturalPatterns = [
    { pattern: /half\s*(?:an?\s*)?hour|30\s*min/, value: 0.5 },
    { pattern: /quarter\s*(?:of\s*an?\s*)?hour|15\s*min/, value: 0.25 },
    { pattern: /three\s*quarters?\s*(?:of\s*an?\s*)?hour|45\s*min/, value: 0.75 },
    { pattern: /an?\s*hour/, value: 1 },
    { pattern: /couple\s*(?:of\s*)?hours/, value: 2 },
    { pattern: /few\s*hours/, value: 3 },
    { pattern: /all\s*day/, value: 8 },
    { pattern: /half\s*day/, value: 4 }
  ];
  
  for (const { pattern, value } of naturalPatterns) {
    if (pattern.test(timeStr)) {
      return value;
    }
  }
  
  // Handle decimal hours (e.g., "2.5")
  if (/^\d+(\.\d+)?$/.test(timeStr)) {
    return parseFloat(timeStr);
  }
  
  // Handle "2h 30m" format with more flexibility
  const hoursMinutesMatch = timeStr.match(/(?:(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h))?\s*(?:(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m))?/);
  if (hoursMinutesMatch && (hoursMinutesMatch[1] || hoursMinutesMatch[2])) {
    const hours = parseFloat(hoursMinutesMatch[1] || 0);
    const minutes = parseFloat(hoursMinutesMatch[2] || 0);
    return hours + (minutes / 60);
  }
  
  // Handle "2:30" format
  const colonMatch = timeStr.match(/(\d+):(\d+)/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1]);
    const minutes = parseInt(colonMatch[2]);
    return hours + (minutes / 60);
  }
  
  // Handle written numbers
  const numberWords = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };
  
  for (const [word, num] of Object.entries(numberWords)) {
    if (timeStr.includes(word)) {
      if (timeStr.includes('hour')) return num;
      if (timeStr.includes('minute')) return num / 60;
    }
  }
  
  return null;
}

async function ensureUserExists(userId, client) {
  try {
    const existingUser = await db.getTeamMember(userId);
    if (!existingUser) {
      // Fetch user info from Slack and create/update in database
      const userInfo = await client.users.info({ user: userId });
      await db.createOrUpdateTeamMember(userId, userInfo.user);
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
  }
}

// Slash command: /log-time
app.command('/log-time', async ({ command, ack, respond, client }) => {
  console.log('🎯 Received /log-time command from user:', command.user_id);
  await ack();
  
  try {
    await ensureUserExists(command.user_id, client);
    
    // Start conversational flow
    await respond({
      text: `Hi! 👋 Let's log some time. How many hours did you work? 

You can say things like:
• "2.5 hours" 
• "1 hour 30 minutes"
• "half an hour"
• "all day"

Or just type the number: "2.5"`,
      response_type: 'ephemeral'
    });

    // Store conversation state (simple in-memory store)
    if (!global.conversationStates) {
      global.conversationStates = new Map();
    }
    
    global.conversationStates.set(command.user_id, {
      step: 'waiting_for_hours',
      channel: command.channel_id,
      started_at: Date.now(),
      data: {}
    });

    console.log('✅ Started conversational time logging flow for user:', command.user_id);
  } catch (error) {
    console.error('Error starting conversational flow:', error);
    await respond('Sorry, there was an error starting the time logging conversation.');
  }
});

// Handle project selection in modal
app.options('project_select', async ({ options, ack }) => {
  try {
    const projects = await db.getActiveProjects();
    const projectOptions = projects.map(project => ({
      text: {
        type: 'plain_text',
        text: project.client_name ? `${project.name} (${project.client_name})` : project.name
      },
      value: project.id
    }));
    
    // Add "No Project" option
    projectOptions.unshift({
      text: {
        type: 'plain_text',
        text: 'No Project'
      },
      value: 'none'
    });
    
    await ack({
      options: projectOptions
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    await ack({
      options: []
    });
  }
});

// Modal handler removed - now using conversational flow

// Slash command: /my-time
app.command('/my-time', async ({ command, ack, respond, client }) => {
  await ack();
  
  try {
    await ensureUserExists(command.user_id, client);
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const summary = await db.getUserDailySummary(command.user_id, today);
    const entries = await db.getUserTimeEntries(command.user_id, today, today);
    
    let responseText = `📊 *Your time for ${format(new Date(), 'MMM d, yyyy')}*\n\n`;
    responseText += `*Total Hours:* ${formatHours(summary.total_hours || 0)}\n`;
    responseText += `*Billable Hours:* ${formatHours(summary.billable_hours || 0)}\n\n`;
    
    if (entries.length > 0) {
      responseText += '*Today\'s Entries:*\n';
      entries.forEach((entry, index) => {
        const projectText = entry.projects?.name || 'No Project';
        const clientText = entry.projects?.client_name ? ` (${entry.projects.client_name})` : '';
        responseText += `${index + 1}. ${formatHours(entry.hours)} - ${projectText}${clientText} ${entry.is_billable ? '💰' : ''}\n`;
        responseText += `   _${entry.description}_\n\n`;
      });
    } else {
      responseText += '_No time entries for today yet._';
    }
    
    await respond({
      text: responseText,
      response_type: 'ephemeral'
    });
    
  } catch (error) {
    console.error('Error fetching user time:', error);
    await respond('Sorry, there was an error fetching your time entries.');
  }
});

// Slash command: /team-time
app.command('/team-time', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const teamSummary = await db.getTeamDailySummary(today);
    
    let responseText = `👥 *Team time for ${format(new Date(), 'MMM d, yyyy')}*\n\n`;
    
    if (teamSummary.length > 0) {
      teamSummary.forEach(member => {
        responseText += `*${member.user_name}:* ${formatHours(member.total_hours)} total`;
        if (member.billable_hours > 0) {
          responseText += ` (${formatHours(member.billable_hours)} billable)`;
        }
        responseText += '\n';
      });
      
      const totalHours = teamSummary.reduce((sum, member) => sum + member.total_hours, 0);
      const totalBillable = teamSummary.reduce((sum, member) => sum + member.billable_hours, 0);
      
      responseText += `\n*Team Total:* ${formatHours(totalHours)} (${formatHours(totalBillable)} billable)`;
    } else {
      responseText += '_No time entries logged by the team today._';
    }
    
    await respond({
      text: responseText,
      response_type: 'in_channel'
    });
    
  } catch (error) {
    console.error('Error fetching team time:', error);
    await respond('Sorry, there was an error fetching team time entries.');
  }
});

// Enhanced natural language patterns for time logging
const timeLoggingPatterns = [
  // "log 2.5 working on project"
  /^log\s+([\d\.\:]+(?:h(?:ours?)?|m(?:ins?|inutes?)?|\s*)+)\s+(.+)$/i,
  // "spent 2 hours working on project"  
  /^(?:i\s+)?spent\s+(.*?)\s+(?:on\s+|working\s+on\s+)?(.+)$/i,
  // "worked 3 hours on project"
  /^(?:i\s+)?worked\s+(.*?)\s+(?:on\s+)?(.+)$/i,
  // "put in 2.5 hours for project"
  /^(?:i\s+)?put\s+in\s+(.*?)\s+(?:for\s+|on\s+)?(.+)$/i,
  // "logged 1.5 hours debugging"
  /^(?:i\s+)?logged\s+(.*?)\s+(.+)$/i,
  // "did 2 hours of coding"
  /^(?:i\s+)?did\s+(.*?)\s+(?:of\s+)?(.+)$/i
];

// Quick time logging with enhanced natural language
app.message(new RegExp(timeLoggingPatterns.map(p => p.source).join('|'), 'i'), async ({ message, say, client }) => {
  console.log('🎯 Received natural language time log:', message.text);
  try {
    await ensureUserExists(message.user, client);
    
    // Try to match against all patterns
    let timeStr = null;
    let description = null;
    
    for (const pattern of timeLoggingPatterns) {
      const match = message.text.match(pattern);
      if (match) {
        timeStr = match[1];
        description = match[2];
        break;
      }
    }
    
    const hours = parseTimeInput(timeStr);
    if (!hours || hours <= 0 || hours > 24) {
      await say(`❌ Invalid time format. Try something like "log 2.5 working on project" or "log 2h 30m debugging"`);
      return;
    }
    
    // Log time with default values
    const timeEntry = {
      user_id: message.user,
      user_name: message.user, // Will be updated with actual username
      project_id: null,
      description: description.trim(),
      hours: hours,
      date: format(new Date(), 'yyyy-MM-dd'),
      is_billable: true,
      slack_channel_id: message.channel,
      slack_message_ts: message.ts
    };
    
    // Get user info for proper username
    const userInfo = await client.users.info({ user: message.user });
    timeEntry.user_name = userInfo.user.username || userInfo.user.name;
    
    const savedEntry = await db.logTime(timeEntry);
    
    // Generate a more conversational response
    const responses = [
      `✅ Got it! Logged ${formatHours(hours)} for "${description}"`,
      `✅ Nice work! ${formatHours(hours)} logged for "${description}"`,
      `✅ Time tracked! Added ${formatHours(hours)} for "${description}"`,
      `✅ Perfect! Logged ${formatHours(hours)} working on "${description}"`,
      `✅ Done! ${formatHours(hours)} added to your timesheet for "${description}"`
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    await say(response);
    
  } catch (error) {
    console.error('Error with quick time logging:', error);
    await say('❌ Failed to log time. Please try again or use `/log-time` for the full form.');
  }
});

// Conversational time logging handler
app.message(async ({ message, say, client }) => {
  // Skip if this is a bot message or already handled by other patterns
  if (message.subtype || !global.conversationStates) return;
  
  const state = global.conversationStates.get(message.user);
  if (!state) return; // No active conversation
  
  // Check if conversation is too old (timeout after 10 minutes)
  if (Date.now() - state.started_at > 10 * 60 * 1000) {
    global.conversationStates.delete(message.user);
    return;
  }
  
  console.log('🎯 Handling conversational flow step:', state.step, 'for user:', message.user);
  
  try {
    switch (state.step) {
      case 'waiting_for_hours':
        const hours = parseTimeInput(message.text);
        if (!hours || hours <= 0 || hours > 24) {
          await say(`❌ I didn't understand that time format. Try something like:
• "2.5 hours"
• "1 hour 30 minutes" 
• "half an hour"
• "2h 30m"

How many hours did you work?`);
          return;
        }
        
        state.data.hours = hours;
        state.step = 'waiting_for_description';
        
        await say(`✅ Got it! ${formatHours(hours)} logged. 

Now, what did you work on? Describe what you did:`);
        break;
        
      case 'waiting_for_description':
        if (message.text.trim().length < 3) {
          await say(`Please provide a bit more detail about what you worked on. What did you do during those ${formatHours(state.data.hours)}?`);
          return;
        }
        
        state.data.description = message.text.trim();
        state.step = 'waiting_for_date';
        
        await say(`Perfect! Working on "${state.data.description}"

What date was this for? You can say:
• "today" 
• "yesterday"
• "Monday" 
• "2024-01-15"
• Or just hit enter for today`);
        break;
        
      case 'waiting_for_date':
        let date;
        const dateText = message.text.trim().toLowerCase();
        
        if (!dateText || dateText === 'today' || dateText === 'enter') {
          date = format(new Date(), 'yyyy-MM-dd');
        } else if (dateText === 'yesterday') {
          date = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
          date = dateText;
        } else {
          // Try parsing day names
          const dayMatch = dateText.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
          if (dayMatch) {
            // Find the most recent occurrence of this day
            const today = new Date();
            const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayMatch[1]);
            const currentDay = today.getDay();
            let daysBack = currentDay - targetDay;
            if (daysBack <= 0) daysBack += 7;
            date = format(subDays(today, daysBack), 'yyyy-MM-dd');
          } else {
            await say(`❌ I didn't understand that date. Try:
• "today" or "yesterday"
• A day name like "Monday"  
• A date like "2024-01-15"

What date was this work for?`);
            return;
          }
        }
        
        state.data.date = date;
        state.step = 'waiting_for_billable';
        
        await say(`📅 Date set to ${date}

Is this billable time? Reply with:
• "yes" or "billable" 
• "no" or "not billable"
• Or just hit enter for billable (default)`);
        break;
        
      case 'waiting_for_billable':
        const billableText = message.text.trim().toLowerCase();
        let isBillable = true; // Default to billable
        
        if (billableText === 'no' || billableText === 'not billable' || billableText === 'non-billable') {
          isBillable = false;
        }
        
        // Save the time entry
        const timeEntry = {
          user_id: message.user,
          description: state.data.description,
          hours: state.data.hours,
          date: state.data.date,
          is_billable: isBillable,
          slack_channel_id: message.channel,
          slack_message_ts: message.ts
        };
        
        // Get user info for proper username
        const userInfo = await client.users.info({ user: message.user });
        timeEntry.user_name = userInfo.user.username || userInfo.user.name;
        
        await ensureUserExists(message.user, client);
        const savedEntry = await db.logTime(timeEntry);
        
        // Clear conversation state
        global.conversationStates.delete(message.user);
        
        const billableLabel = isBillable ? '💰 billable' : '📝 non-billable';
        await say(`🎉 Perfect! Time entry saved:

📊 **${formatHours(state.data.hours)}** ${billableLabel}
📝 ${state.data.description}
📅 ${state.data.date}

Great work! You can start another entry anytime with \`/log-time\` or just say "spent 2 hours coding"`);
        break;
    }
    
  } catch (error) {
    console.error('Error in conversational flow:', error);
    global.conversationStates.delete(message.user);
    await say('❌ Sorry, something went wrong. Please try starting over with `/log-time`');
  }
});

// General conversational responses
app.message(/^(hi|hello|hey)\s*(?:there|bot)?!?$/i, async ({ say, message }) => {
  const greetings = [
    `Hey there! 👋 I'm your time tracking assistant. Try typing "log 2 hours coding" or use \`/time-help\` to see what I can do!`,
    `Hello! 🤖 Ready to help you track time. You can say things like "spent 1.5 hours on meetings" or use \`/log-time\` for more options.`,
    `Hi! ⏰ I'm here to make time tracking easy. Try "worked 3 hours debugging" or \`/my-time\` to see your daily summary.`
  ];
  await say(greetings[Math.floor(Math.random() * greetings.length)]);
});

app.message(/^(thanks?|thank\s*you)\s*(?:bot)?!?$/i, async ({ say }) => {
  const responses = [
    `You're welcome! 😊 Keep up the great work!`,
    `Happy to help! 🎉 Time tracking made easy!`,
    `Anytime! 👍 I'm here whenever you need to log time.`,
    `No problem! ⚡ Glad I could help with your time tracking.`
  ];
  await say(responses[Math.floor(Math.random() * responses.length)]);
});

app.message(/^(help|what\s*can\s*you\s*do)\s*\??$/i, async ({ say }) => {
  await say(`🤖 I can help you track time in lots of ways! Here are some examples:

**Natural Language:**
• "spent 2 hours coding"
• "worked 1.5 hours on design"  
• "put in half an hour debugging"
• "did 3 hours of meetings"
• "logged an hour writing docs"

**Quick Format:**
• "log 2.5 project work"
• "log 1h 30m client call"

**Slash Commands:**
• \`/log-time\` - Full logging form
• \`/my-time\` - Your daily summary
• \`/team-time\` - Team overview
• \`/time-help\` - Complete help

Just talk to me naturally! I understand lots of different ways to express time. 😊`);
});

app.message(/^(status|summary|how.*doing)\s*\??$/i, async ({ message, say }) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const summary = await db.getUserDailySummary(message.user, today);
    
    if (summary.total_hours > 0) {
      await say(`📊 Today you've logged ${formatHours(summary.total_hours)} total (${formatHours(summary.billable_hours)} billable). Great job! 🎉`);
    } else {
      await say(`📊 No time logged yet today. Ready to get started? Try "spent 1 hour on project" or use \`/log-time\`! 💪`);
    }
  } catch (error) {
    await say(`I'd love to give you a status update, but I'm having trouble accessing your data right now. Try \`/my-time\` instead! 🤖`);
  }
});

// Help command
app.command('/time-help', async ({ ack, respond }) => {
  console.log('🎯 Received /time-help command');
  try {
    await ack();
    console.log('✅ Acknowledged /time-help command');
  
  const helpText = `🕐 *Time Tracking Bot Help*\n\n` +
    `*Commands:*\n` +
    `• \`/log-time\` - Open the full time logging form\n` +
    `• \`/my-time\` - View your time entries for today\n` +
    `• \`/team-time\` - View team time summary for today\n` +
    `• \`/time-help\` - Show this help message\n\n` +
    `*Quick Logging:*\n` +
    `Type \`log [time] [description]\` in any channel:\n` +
    `• \`log 2.5 working on website redesign\`\n` +
    `• \`log 1h 30m debugging API issues\`\n` +
    `• \`log 45m team meeting\`\n\n` +
    `*Time Formats:*\n` +
    `• Decimal hours: \`2.5\`, \`1.25\`\n` +
    `• Hours and minutes: \`2h 30m\`, \`1h 15m\`\n` +
    `• Colon format: \`2:30\`, \`1:15\`\n\n` +
    `*Tips:*\n` +
    `• Use the full form (\`/log-time\`) to specify projects and billing\n` +
    `• Quick logging defaults to billable time with no project\n` +
    `• All times are logged for today unless specified otherwise`;
  
    await respond({
      text: helpText,
      response_type: 'in_channel'
    });
    console.log('✅ Sent help response to Slack');
  } catch (error) {
    console.error('❌ Error in /time-help command:', error);
    try {
      await respond({
        text: 'Sorry, there was an error processing your request.',
        response_type: 'ephemeral'
      });
    } catch (respondError) {
      console.error('❌ Error sending error response:', respondError);
    }
  }
});

// Error handling
app.error((error) => {
  console.error('Slack app error:', error);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await app.stop();
    console.log('Slack bot stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack Time Tracking Bot is running!');
    console.log('Available commands:');
    console.log('  /log-time - Open time logging form');
    console.log('  /my-time - View your daily time');
    console.log('  /team-time - View team daily summary');
    console.log('  /time-help - Show help');
    console.log('  "log [time] [description]" - Quick time logging');
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

