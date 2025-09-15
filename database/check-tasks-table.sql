-- Check if tasks table exists and its structure
-- Run this in your Supabase SQL Editor

-- Check if tasks table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'tasks'
) as tasks_table_exists;

-- Show table structure if it exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any existing tasks
SELECT COUNT(*) as task_count FROM tasks;

-- Show a few sample tasks if any exist
SELECT id, title, status, priority, project_id, assigned_to, created_at 
FROM tasks 
LIMIT 5;

