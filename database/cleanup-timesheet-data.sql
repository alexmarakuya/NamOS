-- Cleanup timesheet data: Remove time entries and internal projects, keep AmexGBT client
-- This script removes all time entries and internal projects but preserves AmexGBT client and its projects

-- Step 1: Remove all time entries
DELETE FROM time_entries;
TRUNCATE TABLE time_entries RESTART IDENTITY CASCADE;

-- Step 2: Remove internal projects (keep AmexGBT projects)
DELETE FROM projects WHERE client_name = 'Internal';

-- Step 3: Verify what remains
SELECT 
    'Projects remaining:' as info,
    client_name,
    name,
    description,
    hourly_rate
FROM projects 
ORDER BY client_name, name;

-- Step 4: Show team members (these are kept)
SELECT 
    'Team members:' as info,
    full_name,
    slack_username,
    role,
    hourly_rate,
    is_active
FROM team_members
ORDER BY full_name;

-- Summary
SELECT 
    (SELECT COUNT(*) FROM time_entries) as time_entries_count,
    (SELECT COUNT(*) FROM projects) as projects_count,
    (SELECT COUNT(*) FROM projects WHERE client_name = 'AmexGBT') as amexgbt_projects_count,
    (SELECT COUNT(*) FROM projects WHERE client_name = 'Internal') as internal_projects_count,
    (SELECT COUNT(*) FROM team_members) as team_members_count;
