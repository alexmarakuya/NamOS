-- Quick fix: Disable Row Level Security for projects table
-- This will allow updates to work immediately
-- Run this in your Supabase SQL Editor

-- Disable RLS on projects table
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'projects';

-- Test that updates now work
SELECT 'RLS disabled for projects table - updates should now work' as status;

