# 👥 Setup Production Users

## Quick Setup Instructions

### 1. 🌐 Open Your Application
Your app is now running at: **http://localhost:3002**

### 2. 🗄️ Setup Database Users

**Copy and paste this SQL script in your Supabase SQL Editor:**

```sql
-- Clear all existing team members and add Alex + PJ Silver
TRUNCATE TABLE team_members RESTART IDENTITY CASCADE;

-- Add Alex (Admin)
INSERT INTO team_members (
    slack_user_id,
    slack_username,
    full_name,
    email,
    role,
    hourly_rate,
    is_active,
    timezone
) VALUES (
    'U_ALEX_001',
    'alex',
    'Alex',
    'alex@alexduffner.com',
    'admin',
    150.00,
    true,
    'America/Los_Angeles'
);

-- Add PJ Silver (Developer)
INSERT INTO team_members (
    slack_user_id,
    slack_username,
    full_name,
    email,
    role,
    hourly_rate,
    is_active,
    timezone
) VALUES (
    'U_PJ_002',
    'pjsilver',
    'PJ Silver',
    'pj@example.com',
    'developer',
    120.00,
    true,
    'America/New_York'
);

-- Verify the setup
SELECT 
    full_name,
    slack_username,
    email,
    role,
    hourly_rate,
    is_active
FROM team_members
ORDER BY full_name;
```

### 3. 🎯 Access User Management

1. **Open** http://localhost:3002
2. **Click** the Settings gear icon (⚙️) in the left navigation
3. **Select** "User Management"
4. **You should see** Alex and PJ Silver in the clean, simplified user list

### 4. ✨ What You'll See

- **Clean header**: "Users" with "Add User" button
- **No statistics**: Removed the stat cards as requested
- **No secondary navigation**: Simplified to just the user list
- **Consistent styling**: Buttons match the rest of your app
- **Search functionality**: Search by name, email, role, or username
- **Settings dropdown**: No text wrapping, proper sizing

### 5. 🔧 Features Available

- **Add User**: Click "Add User" to create new team members
- **Edit User**: Click the edit icon to modify user details
- **Delete User**: Click the delete icon (with safety checks)
- **Search**: Use the search bar to find specific users
- **Role Management**: Admin, Manager, Developer, Designer, Member

---

**🎉 Your simplified user management system is ready to use!**
