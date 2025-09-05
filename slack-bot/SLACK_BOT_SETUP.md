# Slack Time Tracking Bot Setup

This bot helps teams log and track work hours directly from Slack with integration to your Supabase database.

## Features

- **Quick Time Logging**: Log time with natural language commands
- **Full Time Entry Form**: Detailed logging with projects, billing status, and dates
- **Daily Summaries**: View personal and team time summaries
- **Project Management**: Link time entries to specific projects and clients
- **Billable Hour Tracking**: Track which hours are billable vs non-billable
- **Multiple Time Formats**: Support for decimal hours, "2h 30m", and "2:30" formats

## Prerequisites

1. **Supabase Database**: Your existing database with the time tracking schema
2. **Slack App**: A Slack app with bot permissions
3. **Node.js**: Version 16 or higher

## Setup Instructions

### 1. Database Setup

First, run the time tracking schema on your Supabase database:

```bash
# From the project root
psql -h your-supabase-host -U postgres -d postgres -f database/time-tracking-schema.sql
```

Or execute the SQL file content in your Supabase SQL editor.

### 2. Create Slack App

1. Go to [Slack API](https://api.slack.com/apps) and click "Create New App"
2. Choose "From scratch"
3. Name your app (e.g., "Time Tracker") and select your workspace
4. Configure the following:

#### Bot Token Scopes (OAuth & Permissions):
```
chat:write
commands
users:read
```

#### Slash Commands (Slash Commands section):
Create these commands:
- `/log-time` - Request URL: `https://your-domain.com/slack/events`
- `/my-time` - Request URL: `https://your-domain.com/slack/events`  
- `/team-time` - Request URL: `https://your-domain.com/slack/events`
- `/time-help` - Request URL: `https://your-domain.com/slack/events`

#### Event Subscriptions:
- Enable Events: On
- Request URL: `https://your-domain.com/slack/events`
- Subscribe to bot events: `message.channels`, `message.groups`, `message.im`

#### Socket Mode (for development):
- Enable Socket Mode: On
- Generate App-Level Token with `connections:write` scope

### 3. Environment Setup

1. Copy the environment template:
```bash
cd slack-bot
cp env.example .env
```

2. Fill in your environment variables:
```env
# Get these from your Slack app settings
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token

# Your existing Supabase credentials
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional configuration
PORT=3000
NODE_ENV=development
DEFAULT_TIMEZONE=America/New_York
```

### 4. Install Dependencies

```bash
cd slack-bot
npm install
```

### 5. Run the Bot

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

## Usage

### Quick Time Logging
In any channel, type:
```
log 2.5 working on website redesign
log 1h 30m debugging API issues
log 45m team meeting
```

### Slash Commands
- `/log-time` - Opens a detailed time entry form
- `/my-time` - Shows your time summary for today
- `/team-time` - Shows team time summary for today
- `/time-help` - Displays help information

### Time Formats Supported
- Decimal hours: `2.5`, `1.25`
- Hours and minutes: `2h 30m`, `1h 15m`
- Colon format: `2:30`, `1:15`

## Project Management

Projects are managed through your main application. The bot will automatically fetch active projects from the database for time logging.

To add projects, use your main financial dashboard or add them directly to the `projects` table in Supabase.

## Deployment

### Using PM2 (Recommended for production)
```bash
npm install -g pm2
pm2 start bot.js --name "slack-time-bot"
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
Make sure to set all environment variables in your production environment.

## Troubleshooting

### Common Issues

1. **Bot not responding to commands**
   - Check that Socket Mode is enabled for development
   - Verify environment variables are correct
   - Check bot token scopes include required permissions

2. **Database connection errors**
   - Verify Supabase URL and key are correct
   - Ensure time tracking schema has been applied
   - Check network connectivity to Supabase

3. **Slash commands not working**
   - Verify slash commands are configured in Slack app
   - Check request URL is correct (for production deployment)
   - Ensure bot is installed in your workspace

### Logs
The bot logs important events and errors to the console. Check logs if you encounter issues:
```bash
# If using PM2
pm2 logs slack-time-bot

# If running directly
npm run dev
```

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify all setup steps have been completed
3. Test database connectivity separately
4. Check Slack app configuration matches requirements
