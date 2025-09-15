-- Clear Time Entries Script
-- This script removes all time entries while preserving clients, projects, and team members

-- First, let's check what we have before deletion
SELECT 'Before deletion:' as status;
SELECT 'Time entries count:' as table_name, COUNT(*) as count FROM time_entries;
SELECT 'Projects count:' as table_name, COUNT(*) as count FROM projects;
SELECT 'Team members count:' as table_name, COUNT(*) as count FROM team_members;

-- Delete all time entries
DELETE FROM time_entries;

-- Verify deletion
SELECT 'After deletion:' as status;
SELECT 'Time entries count:' as table_name, COUNT(*) as count FROM time_entries;
SELECT 'Projects count:' as table_name, COUNT(*) as count FROM projects;
SELECT 'Team members count:' as table_name, COUNT(*) as count FROM team_members;

-- Show remaining data
SELECT 'Remaining projects:' as info;
SELECT id, name, client_name FROM projects ORDER BY client_name, name;

SELECT 'Remaining team members:' as info;
SELECT id, slack_username, full_name FROM team_members ORDER BY full_name;
