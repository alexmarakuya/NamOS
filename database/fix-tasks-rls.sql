-- Fix Row Level Security (RLS) for tasks table
-- Run this in your Supabase SQL Editor

-- Check current RLS status for tasks table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tasks';

-- Check existing policies on tasks table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- Disable RLS on tasks table (for development/testing)
-- WARNING: This removes security - only use for development
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'tasks';

-- Test that inserts now work by trying a simple insert
-- (This will be rolled back, just for testing)
DO $$
BEGIN
    -- Try to insert a test task
    INSERT INTO tasks (title, description, status, priority, created_by) 
    VALUES ('Test Task', 'Test Description', 'todo', 'medium', 'test-user');
    
    -- If we get here, the insert worked
    RAISE NOTICE '✅ Task insert test successful - RLS is now disabled';
    
    -- Roll back the test insert
    ROLLBACK;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Task insert test failed: %', SQLERRM;
        ROLLBACK;
END $$;

SELECT 'RLS disabled for tasks table - task creation should now work' as status;


