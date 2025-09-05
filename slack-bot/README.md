# Slack Time Tracking Bot

A powerful Slack bot that helps teams log and track work hours with seamless integration to your existing Supabase database.

## Quick Start

1. **Setup Database**:
   ```bash
   # Apply the time tracking schema to your Supabase database
   psql -h your-supabase-host -U postgres -d postgres -f ../database/time-tracking-schema.sql
   ```

2. **Configure Environment**:
   ```bash
   cp env.example .env
   # Edit .env with your Slack and Supabase credentials
   ```

3. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

## Commands

### Slash Commands
- `/log-time` - Open detailed time entry form
- `/my-time` - View your daily time summary  
- `/team-time` - View team daily summary
- `/time-help` - Show help

### Quick Logging
Type in any channel:
```
log 2.5 working on website redesign
log 1h 30m debugging issues
log 45m team meeting
```

## Features

✅ **Multiple Time Formats**: 2.5, 2h 30m, 2:30  
✅ **Project Integration**: Link time to specific projects  
✅ **Billable Tracking**: Mark time as billable/non-billable  
✅ **Team Summaries**: See daily team productivity  
✅ **Natural Language**: Quick logging with simple commands  
✅ **Database Integration**: Uses your existing Supabase setup  

## Setup

See [SLACK_BOT_SETUP.md](./SLACK_BOT_SETUP.md) for detailed setup instructions.

## Architecture

```
Slack App ↔ Bot (Node.js) ↔ Supabase Database
                ↓
    Your Financial Dashboard
```

The bot integrates with your existing financial dashboard database, sharing projects and business units for comprehensive time tracking.
