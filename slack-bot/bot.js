const { App } = require('@slack/bolt');
const { TimeTrackingDB } = require('./supabase');
const { format, parseISO, startOfWeek, endOfWeek, startOfDay } = require('date-fns');
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
  // Parse various time formats: "2.5", "2h 30m", "2:30", etc.
  timeStr = timeStr.toLowerCase().trim();
  
  // Handle decimal hours (e.g., "2.5")
  if (/^\d+(\.\d+)?$/.test(timeStr)) {
    return parseFloat(timeStr);
  }
  
  // Handle "2h 30m" format
  const hoursMinutesMatch = timeStr.match(/(?:(\d+)h?)?\s*(?:(\d+)m?)?/);
  if (hoursMinutesMatch) {
    const hours = parseInt(hoursMinutesMatch[1] || 0);
    const minutes = parseInt(hoursMinutesMatch[2] || 0);
    return hours + (minutes / 60);
  }
  
  // Handle "2:30" format
  const colonMatch = timeStr.match(/(\d+):(\d+)/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1]);
    const minutes = parseInt(colonMatch[2]);
    return hours + (minutes / 60);
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
    
    // Show modal for time logging
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'log_time_modal',
        title: {
          type: 'plain_text',
          text: 'Log Time Entry'
        },
        submit: {
          type: 'plain_text',
          text: 'Log Time'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'hours_block',
            element: {
              type: 'plain_text_input',
              action_id: 'hours_input',
              placeholder: {
                type: 'plain_text',
                text: 'e.g., 2.5, 2h 30m, or 2:30'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Hours Worked'
            }
          },
          {
            type: 'input',
            block_id: 'description_block',
            element: {
              type: 'plain_text_input',
              action_id: 'description_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'What did you work on?'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Description'
            }
          },
          {
            type: 'input',
            block_id: 'project_block',
            element: {
              type: 'external_select',
              action_id: 'project_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select a project'
              },
              min_query_length: 0
            },
            label: {
              type: 'plain_text',
              text: 'Project'
            },
            optional: true
          },
          {
            type: 'input',
            block_id: 'date_block',
            element: {
              type: 'datepicker',
              action_id: 'date_input',
              initial_date: format(new Date(), 'yyyy-MM-dd')
            },
            label: {
              type: 'plain_text',
              text: 'Date'
            }
          },
          {
            type: 'input',
            block_id: 'billable_block',
            element: {
              type: 'checkboxes',
              action_id: 'billable_checkbox',
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: 'This time is billable'
                  },
                  value: 'billable'
                }
              ],
              initial_options: [
                {
                  text: {
                    type: 'plain_text',
                    text: 'This time is billable'
                  },
                  value: 'billable'
                }
              ]
            },
            label: {
              type: 'plain_text',
              text: 'Billing'
            },
            optional: true
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error opening time log modal:', error);
    await respond('Sorry, there was an error opening the time logging form.');
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

// Handle time logging modal submission
app.view('log_time_modal', async ({ ack, body, view, client }) => {
  try {
    const values = view.state.values;
    const hoursInput = values.hours_block.hours_input.value;
    const description = values.description_block.description_input.value;
    const projectId = values.project_block.project_select.selected_option?.value;
    const date = values.date_block.date_input.selected_date;
    const isBillable = values.billable_block.billable_checkbox.selected_options?.length > 0;
    
    // Parse hours
    const hours = parseTimeInput(hoursInput);
    if (!hours || hours <= 0 || hours > 24) {
      await ack({
        response_action: 'errors',
        errors: {
          hours_block: 'Please enter a valid time between 0 and 24 hours'
        }
      });
      return;
    }
    
    if (!description?.trim()) {
      await ack({
        response_action: 'errors',
        errors: {
          description_block: 'Description is required'
        }
      });
      return;
    }
    
    await ack();
    
    // Create time entry
    const timeEntry = {
      user_id: body.user.id,
      user_name: body.user.username || body.user.name,
      project_id: projectId === 'none' ? null : projectId,
      description: description.trim(),
      hours: hours,
      date: date,
      is_billable: isBillable,
      slack_channel_id: body.user.id, // DM channel
      slack_message_ts: new Date().getTime().toString()
    };
    
    const savedEntry = await db.logTime(timeEntry);
    
    // Send confirmation message
    const projectText = savedEntry.projects?.name || 'No Project';
    const clientText = savedEntry.projects?.client_name ? ` (${savedEntry.projects.client_name})` : '';
    
    await client.chat.postMessage({
      channel: body.user.id,
      text: `✅ Time logged successfully!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Time logged successfully!*\n\n` +
                  `*Hours:* ${formatHours(hours)}\n` +
                  `*Project:* ${projectText}${clientText}\n` +
                  `*Date:* ${format(parseISO(date), 'MMM d, yyyy')}\n` +
                  `*Billable:* ${isBillable ? 'Yes' : 'No'}\n` +
                  `*Description:* ${description}`
          }
        }
      ]
    });
    
  } catch (error) {
    console.error('Error logging time:', error);
    await ack({
      response_action: 'errors',
      errors: {
        hours_block: 'Failed to log time. Please try again.'
      }
    });
  }
});

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

// Quick time logging with natural language
app.message(/^log (\d+(?:\.\d+)?|\d+h?\s*\d*m?|\d+:\d+)\s+(.+)$/i, async ({ message, say, client }) => {
  console.log('🎯 Received quick time log message:', message.text);
  try {
    await ensureUserExists(message.user, client);
    
    const match = message.text.match(/^log (\d+(?:\.\d+)?|\d+h?\s*\d*m?|\d+:\d+)\s+(.+)$/i);
    const timeStr = match[1];
    const description = match[2];
    
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
    
    await say(`✅ Logged ${formatHours(hours)} for "${description}"`);
    
  } catch (error) {
    console.error('Error with quick time logging:', error);
    await say('❌ Failed to log time. Please try again or use `/log-time` for the full form.');
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

