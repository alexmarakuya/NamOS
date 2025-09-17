-- Fix Row Level Security (RLS) policies for projects table
-- Run this in your Supabase SQL Editor

-- First, let's check if RLS is enabled and what policies exist
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'projects';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- Disable RLS temporarily to allow updates (for development/testing)
-- WARNING: This removes security - only use for development
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- OR, if you want to keep RLS enabled, create permissive policies:
-- Enable RLS first
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for authenticated users
-- DROP POLICY IF EXISTS "Allow all for authenticated users" ON projects;
-- CREATE POLICY "Allow all for authenticated users" ON projects
--   FOR ALL USING (true) WITH CHECK (true);

-- OR create specific policies for each operation:
-- DROP POLICY IF EXISTS "Allow select for authenticated users" ON projects;
-- CREATE POLICY "Allow select for authenticated users" ON projects
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Allow insert for authenticated users" ON projects;
-- CREATE POLICY "Allow insert for authenticated users" ON projects
--   FOR INSERT WITH CHECK (true);

-- DROP POLICY IF EXISTS "Allow update for authenticated users" ON projects;
-- CREATE POLICY "Allow update for authenticated users" ON projects
--   FOR UPDATE USING (true) WITH CHECK (true);

-- DROP POLICY IF EXISTS "Allow delete for authenticated users" ON projects;
-- CREATE POLICY "Allow delete for authenticated users" ON projects
--   FOR DELETE USING (true);

-- Verify the changes
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'projects';

-- Test the update with a simple query
-- UPDATE projects SET name = name WHERE id = '7eec4739-08b9-4ca3-b25e-10ee83fa46a2';

RAISE NOTICE '✅ RLS policies updated for projects table';
RAISE NOTICE '⚠️  RLS has been DISABLED for development. Enable it later with proper policies for production.';


