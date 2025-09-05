const { App } = require('@slack/bolt');
const { TimeTrackingDB } = require('./supabase');
const { format, parseISO, startOfWeek, endOfWeek, startOfDay, subDays } = require('date-fns');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI (optional)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('🤖 OpenAI integration enabled');
} else {
  console.log('⚠️  OpenAI integration disabled (no API key provided)');
}

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

// AI-powered time entry parsing
async function parseTimeEntryWithAI(message, projects) {
  if (!openai) return null;
  
  try {
    const projectList = projects.map(p => {
      const client = p.client_name ? ` (${p.client_name})` : '';
      return `- ${p.name}${client}`;
    }).join('\n');

    const prompt = `Parse this time tracking message and extract structured information:

Message: "${message}"

Available projects:
${projectList}

Extract and return ONLY a JSON object with these fields:
{
  "hours": number (decimal hours, e.g. 2.5),
  "description": "work description",
  "project": "exact project name from list or null",
  "date": "YYYY-MM-DD or 'today'",
  "billable": true/false,
  "confidence": number (0-1)
}

Rules:
- If no specific project is mentioned, set project to null
- If date isn't specified, use "today"
- Default billable to true unless explicitly mentioned as non-billable
- Set confidence based on how clear the information is
- Only return the JSON object, no other text`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 200
    });

    const response = completion.choices[0].message.content.trim();
    
    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(response);
      
      // Find matching project
      if (parsed.project) {
        const matchingProject = projects.find(p => 
          p.name.toLowerCase() === parsed.project.toLowerCase()
        );
        if (matchingProject) {
          parsed.project_id = matchingProject.id;
        }
      }
      
      return parsed;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return null;
    }
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    return null;
  }
}

// AI-enhanced project detection
async function detectProjectWithAI(description, projects) {
  if (!openai) {
    // Fallback to rule-based detection
    return detectProjectFromDescription(description, projects);
  }
  
  try {
    const projectList = projects.map(p => {
      const client = p.client_name ? ` (${p.client_name})` : '';
      return `- ${p.name}${client}: ${p.description || 'No description'}`;
    }).join('\n');

    const prompt = `Based on this work description, suggest the most relevant project:

Work description: "${description}"

Available projects:
${projectList}

Return ONLY a JSON object:
{
  "bestMatch": "exact project name or null",
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150
    });

    const response = completion.choices[0].message.content.trim();
    const parsed = JSON.parse(response);
    
    if (parsed.bestMatch) {
      const matchingProject = projects.find(p => 
        p.name.toLowerCase() === parsed.bestMatch.toLowerCase()
      );
      
      if (matchingProject) {
        return {
          bestMatch: matchingProject,
          confidence: parsed.confidence,
          alternatives: []
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('AI project detection error:', error);
    // Fallback to rule-based detection
    return detectProjectFromDescription(description, projects);
  }
}

// Smart project detection based on description keywords
function detectProjectFromDescription(description, projects) {
  if (!projects || projects.length === 0) return null;
  
  const desc = description.toLowerCase();
  const scores = [];
  
  projects.forEach(project => {
    let score = 0;
    const projectName = project.name.toLowerCase();
    const clientName = project.client_name ? project.client_name.toLowerCase() : '';
    
    // Exact project name match gets highest score
    if (desc.includes(projectName)) {
      score += 100;
    }
    
    // Client name match gets high score
    if (clientName && desc.includes(clientName)) {
      score += 80;
    }
    
    // Partial word matches
    const projectWords = projectName.split(/\s+/);
    const clientWords = clientName.split(/\s+/);
    const descWords = desc.split(/\s+/);
    
    projectWords.forEach(word => {
      if (word.length > 2 && descWords.some(dWord => dWord.includes(word) || word.includes(dWord))) {
        score += 20;
      }
    });
    
    clientWords.forEach(word => {
      if (word.length > 2 && descWords.some(dWord => dWord.includes(word) || word.includes(dWord))) {
        score += 15;
      }
    });
    
    // Common work type keywords
    const workTypeKeywords = {
      'website': ['web', 'site', 'frontend', 'ui', 'design'],
      'api': ['backend', 'server', 'database', 'endpoint'],
      'mobile': ['app', 'ios', 'android', 'mobile'],
      'marketing': ['campaign', 'social', 'content', 'seo'],
      'meeting': ['call', 'discussion', 'planning', 'standup'],
      'bug': ['fix', 'debug', 'issue', 'problem'],
      'feature': ['new', 'implement', 'add', 'create']
    };
    
    // Check if project name contains work type keywords
    Object.entries(workTypeKeywords).forEach(([workType, keywords]) => {
      if (projectName.includes(workType)) {
        keywords.forEach(keyword => {
          if (desc.includes(keyword)) {
            score += 10;
          }
        });
      }
    });
    
    scores.push({ project, score });
  });
  
  // Sort by score and return the best match if it's above threshold
  scores.sort((a, b) => b.score - a.score);
  
  if (scores.length > 0 && scores[0].score >= 20) {
    return {
      bestMatch: scores[0].project,
      confidence: Math.min(scores[0].score / 100, 1),
      alternatives: scores.slice(1, 3).filter(s => s.score >= 10).map(s => s.project)
    };
  }
  
  return null;
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

// AI-powered natural language time logging
app.message(async ({ message, say, client }) => {
  // Skip if this is a bot message, already handled, or in a conversation
  if (message.subtype || message.bot_id) return;
  
  const state = global.conversationStates?.get(message.user);
  if (state) return; // User is in a conversation flow
  
  // Skip if it's a simple greeting or command we handle elsewhere
  const text = message.text.toLowerCase();
  if (/^(hi|hello|hey|thanks|help|status|summary)\s*/.test(text)) return;
  if (text.startsWith('/')) return; // Skip slash commands
  
  console.log('🤖 Analyzing message with AI:', message.text);
  
  try {
    await ensureUserExists(message.user, client);
    
    // Try AI parsing first
    if (openai) {
      const projects = await db.getActiveProjects();
      const aiResult = await parseTimeEntryWithAI(message.text, projects || []);
      
      if (aiResult && aiResult.confidence > 0.7 && aiResult.hours) {
        console.log('🎯 AI parsed time entry:', aiResult);
        
        // Process the date
        let date = format(new Date(), 'yyyy-MM-dd');
        if (aiResult.date && aiResult.date !== 'today') {
          try {
            date = aiResult.date;
          } catch (e) {
            // Keep default date if parsing fails
          }
        }
        
        // Create time entry
        const timeEntry = {
          user_id: message.user,
          description: aiResult.description,
          hours: aiResult.hours,
          date: date,
          is_billable: aiResult.billable !== false,
          project_id: aiResult.project_id || null,
          slack_channel_id: message.channel,
          slack_message_ts: message.ts
        };
        
        // Get user info
        const userInfo = await client.users.info({ user: message.user });
        timeEntry.user_name = userInfo.user.username || userInfo.user.name;
        
        const savedEntry = await db.logTime(timeEntry);
        
        // Generate AI-enhanced response
        let response = `🤖 **AI Parsed**: Logged ${formatHours(aiResult.hours)} for "${aiResult.description}"`;
        
        if (aiResult.project_id) {
          const project = projects.find(p => p.id === aiResult.project_id);
          if (project) {
            const clientInfo = project.client_name ? ` (${project.client_name})` : '';
            response += `\n🎯 **Project**: ${project.name}${clientInfo}`;
          }
        }
        
        if (date !== format(new Date(), 'yyyy-MM-dd')) {
          response += `\n📅 **Date**: ${date}`;
        }
        
        response += `\n💰 **Billable**: ${aiResult.billable !== false ? 'Yes' : 'No'}`;
        
        await say(response);
        return;
      }
    }
    
    // Fallback to pattern matching for time logging
    const timeLoggingPatterns = [
      /^log\s+([\d\.\:]+(?:h(?:ours?)?|m(?:ins?|inutes?)?|\s*)+)\s+(.+)$/i,
      /^(?:i\s+)?spent\s+(.*?)\s+(?:on\s+|working\s+on\s+)?(.+)$/i,
      /^(?:i\s+)?worked\s+(.*?)\s+(?:on\s+)?(.+)$/i,
      /^(?:i\s+)?put\s+in\s+(.*?)\s+(?:for\s+|on\s+)?(.+)$/i,
      /^(?:i\s+)?logged\s+(.*?)\s+(.+)$/i,
      /^(?:i\s+)?did\s+(.*?)\s+(?:of\s+)?(.+)$/i
    ];
    
    // Check if message matches time logging patterns
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
    
    if (!timeStr || !description) return; // Not a time logging message
    
    console.log('🎯 Fallback pattern matching for time log:', message.text);
    
    const hours = parseTimeInput(timeStr);
    if (!hours || hours <= 0 || hours > 24) {
      await say(`❌ Invalid time format. Try something like "log 2.5 working on project" or "log 2h 30m debugging"`);
      return;
    }
    
    // Try smart project detection for quick logging
    let detectedProjectId = null;
    try {
      const projects = await db.getActiveProjects();
      if (projects && projects.length > 0) {
        const detection = await detectProjectWithAI(description, projects);
        if (detection && detection.confidence >= 0.6) {
          detectedProjectId = detection.bestMatch.id;
        }
      }
    } catch (error) {
      console.error('Error in smart project detection for quick logging:', error);
    }

    // Log time with smart project detection
    const timeEntry = {
      user_id: message.user,
      user_name: message.user, // Will be updated with actual username
      project_id: detectedProjectId,
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
    
    // Generate a more conversational response with project info
    const baseResponses = [
      `✅ Got it! Logged ${formatHours(hours)} for "${description}"`,
      `✅ Nice work! ${formatHours(hours)} logged for "${description}"`,
      `✅ Time tracked! Added ${formatHours(hours)} for "${description}"`,
      `✅ Perfect! Logged ${formatHours(hours)} working on "${description}"`,
      `✅ Done! ${formatHours(hours)} added to your timesheet for "${description}"`
    ];
    
    let response = baseResponses[Math.floor(Math.random() * baseResponses.length)];
    
    // Add project info if one was detected
    if (detectedProjectId) {
      try {
        const projects = await db.getActiveProjects();
        const detectedProject = projects.find(p => p.id === detectedProjectId);
        if (detectedProject) {
          const clientInfo = detectedProject.client_name ? ` (${detectedProject.client_name})` : '';
          response += `\n🎯 **Auto-detected project**: ${detectedProject.name}${clientInfo}`;
        }
      } catch (error) {
        console.error('Error getting project info for response:', error);
      }
    }
    
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
        state.step = 'waiting_for_project';
        
        // Fetch available projects and use smart detection
        try {
          const projects = await db.getActiveProjects();
          if (projects && projects.length > 0) {
            // Try AI-enhanced project detection
            const detection = await detectProjectWithAI(state.data.description, projects);
            
            if (detection && detection.confidence >= 0.8) {
              // High confidence - auto-select the project
              state.data.project_id = detection.bestMatch.id;
              state.step = 'waiting_for_date';
              
              const clientInfo = detection.bestMatch.client_name ? ` (${detection.bestMatch.client_name})` : '';
              await say(`Perfect! Working on "${state.data.description}"

🎯 **Smart Detection**: I think this is for **${detection.bestMatch.name}**${clientInfo}

What date was this for? You can say:
• "today" 
• "yesterday"
• "Monday" 
• "2024-01-15"
• Or just hit enter for today`);
            } else if (detection && detection.confidence >= 0.3) {
              // Medium confidence - suggest but let user choose
              let projectMessage = `Perfect! Working on "${state.data.description}"

🤖 **Smart Suggestion**: This looks like it might be for **${detection.bestMatch.name}**`;
              
              if (detection.bestMatch.client_name) {
                projectMessage += ` (${detection.bestMatch.client_name})`;
              }
              
              projectMessage += `\n\nChoose a project:\n**0.** ${detection.bestMatch.name}`;
              if (detection.bestMatch.client_name) {
                projectMessage += ` (${detection.bestMatch.client_name})`;
              }
              projectMessage += ` ⭐ *Suggested*\n`;
              
              projects.forEach((project, index) => {
                if (project.id !== detection.bestMatch.id) {
                  const clientInfo = project.client_name ? ` (${project.client_name})` : '';
                  projectMessage += `**${index + 1}.** ${project.name}${clientInfo}\n`;
                }
              });
              
              projectMessage += `\nType the **number** of the project, or "none" for no specific project.`;
              
              // Store projects and detection for reference
              state.data.availableProjects = projects;
              state.data.suggestedProject = detection.bestMatch;
              await say(projectMessage);
            } else {
              // Low/no confidence - show all projects normally
              let projectMessage = `Perfect! Working on "${state.data.description}"\n\nWhich project should this time be logged to?\n\n`;
              
              projects.forEach((project, index) => {
                const clientInfo = project.client_name ? ` (${project.client_name})` : '';
                projectMessage += `**${index + 1}.** ${project.name}${clientInfo}\n`;
              });
              
              projectMessage += `\nType the **number** of the project, or "none" if this doesn't belong to a specific project.`;
              
              // Store projects for reference
              state.data.availableProjects = projects;
              await say(projectMessage);
            }
          } else {
            // No projects available, skip to date
            state.step = 'waiting_for_date';
            await say(`Perfect! Working on "${state.data.description}"\n\nWhat date was this for? You can say:\n• "today"\n• "yesterday"\n• "Monday"\n• "2024-01-15"\n• Or just hit enter for today`);
          }
        } catch (error) {
          console.error('Error fetching projects:', error);
          // Skip project selection if there's an error
          state.step = 'waiting_for_date';
          await say(`Perfect! Working on "${state.data.description}"\n\nWhat date was this for? You can say:\n• "today"\n• "yesterday"\n• "Monday"\n• "2024-01-15"\n• Or just hit enter for today`);
        }
        break;
        
      case 'waiting_for_project':
        const projectInput = message.text.trim().toLowerCase();
        const availableProjects = state.data.availableProjects || [];
        const suggestedProject = state.data.suggestedProject;
        
        if (projectInput === 'none' || projectInput === 'no project') {
          state.data.project_id = null;
          state.step = 'waiting_for_date';
          await say(`📋 No specific project selected.\n\nWhat date was this for? You can say:\n• "today"\n• "yesterday"\n• "Monday"\n• "2024-01-15"\n• Or just hit enter for today`);
        } else {
          const projectNumber = parseInt(projectInput);
          
          if (projectNumber === 0 && suggestedProject) {
            // User selected the suggested project (option 0)
            state.data.project_id = suggestedProject.id;
            state.step = 'waiting_for_date';
            
            const clientInfo = suggestedProject.client_name ? ` (${suggestedProject.client_name})` : '';
            await say(`🎯 Great choice! Selected **${suggestedProject.name}**${clientInfo} ⭐\n\nWhat date was this for? You can say:\n• "today"\n• "yesterday"\n• "Monday"\n• "2024-01-15"\n• Or just hit enter for today`);
          } else if (projectNumber && projectNumber >= 1 && projectNumber <= availableProjects.length) {
            // Find the project, accounting for suggested project taking slot 0
            let selectedProject;
            if (suggestedProject) {
              // Filter out suggested project and get the nth remaining project
              const otherProjects = availableProjects.filter(p => p.id !== suggestedProject.id);
              selectedProject = otherProjects[projectNumber - 1];
            } else {
              selectedProject = availableProjects[projectNumber - 1];
            }
            
            if (selectedProject) {
              state.data.project_id = selectedProject.id;
              state.step = 'waiting_for_date';
              
              const clientInfo = selectedProject.client_name ? ` (${selectedProject.client_name})` : '';
              await say(`🎯 Project selected: **${selectedProject.name}**${clientInfo}\n\nWhat date was this for? You can say:\n• "today"\n• "yesterday"\n• "Monday"\n• "2024-01-15"\n• Or just hit enter for today`);
            } else {
              const maxNumber = suggestedProject ? availableProjects.length : availableProjects.length;
              await say(`❌ Please enter a valid project number (${suggestedProject ? '0-' : '1-'}${maxNumber}) or "none" for no specific project.`);
            }
          } else {
            const maxNumber = suggestedProject ? availableProjects.length : availableProjects.length;
            const minNumber = suggestedProject ? 0 : 1;
            await say(`❌ Please enter a valid project number (${minNumber}-${maxNumber}) or "none" for no specific project.`);
          }
        }
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
          project_id: state.data.project_id || null,
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
        
        // Find project name for display
        let projectInfo = '';
        if (state.data.project_id && state.data.availableProjects) {
          const selectedProject = state.data.availableProjects.find(p => p.id === state.data.project_id);
          if (selectedProject) {
            const clientInfo = selectedProject.client_name ? ` (${selectedProject.client_name})` : '';
            projectInfo = `\n🎯 ${selectedProject.name}${clientInfo}`;
          }
        }
        
        await say(`🎉 Perfect! Time entry saved:

📊 **${formatHours(state.data.hours)}** ${billableLabel}
📝 ${state.data.description}${projectInfo}
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
  const aiStatus = openai ? '🤖 **AI-Powered**' : '🔧 **Rule-Based**';
  
  await say(`${aiStatus} I can help you track time in lots of ways! Here are some examples:

**Natural Language (${openai ? 'AI-Enhanced' : 'Pattern-Based'}):**
• "spent 2 hours coding"
• "worked 1.5 hours on design"  
• "put in half an hour debugging"
• "did 3 hours of meetings"
• "logged an hour writing docs"
${openai ? '• "I worked from 9 to 5 on the website project with a lunch break"' : ''}

**Conversational Logging:**
• \`/log-time\` - I'll ask you step by step:
  1. How many hours?
  2. What did you work on?
  3. Which project? (${openai ? '🤖 AI suggestions!' : '🔍 Smart matching!'})
  4. What date?
  5. Billable or not?

**Quick Format:**
• "log 2.5 project work"
• "log 1h 30m client call"

**Other Commands:**
• \`/my-time\` - Your daily summary
• \`/team-time\` - Team overview
• \`/time-help\` - Complete help

${openai ? '🧠 **AI Features**: I can understand complex time descriptions, detect projects intelligently, and parse natural language with high accuracy!' : '⚡ **Smart Features**: I use pattern matching and keyword detection to understand your time entries!'}

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

