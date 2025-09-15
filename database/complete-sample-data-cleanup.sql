-- ============================================================================
-- NamOS Complete Sample Data Cleanup Script
-- ============================================================================
-- This script removes ALL sample data from the database
-- Run this in Supabase SQL Editor to clean everything for production use
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 Starting complete NamOS sample data cleanup...';
END $$;

-- ============================================================================
-- CLEAR ALL SAMPLE DATA
-- ============================================================================

-- Clear file attachments first (they reference other tables)
TRUNCATE TABLE IF EXISTS attachments RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all file attachments';

-- Clear all transactions
TRUNCATE TABLE IF EXISTS transactions RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all transactions';

-- Clear time tracking data
TRUNCATE TABLE IF EXISTS time_entries RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all time entries';

-- Clear tasks and related data
TRUNCATE TABLE IF EXISTS tasks RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all tasks';

-- Clear projects
TRUNCATE TABLE IF EXISTS projects RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all projects';

-- Clear team members
TRUNCATE TABLE IF EXISTS team_members RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all team members';

-- Clear business units (areas)
TRUNCATE TABLE IF EXISTS business_units RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all business units/areas';

-- ============================================================================
-- RESET ALL SEQUENCES
-- ============================================================================

-- Reset all auto-increment sequences to start fresh
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS business_units_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS time_entries_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tasks_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS projects_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS team_members_id_seq RESTART WITH 1;

RAISE NOTICE '🔄 Reset all ID sequences';

-- ============================================================================
-- CLEAR SUPABASE STORAGE (if exists)
-- ============================================================================

-- Note: This SQL cannot directly clear storage files
-- You'll need to manually clear the "transaction-attachments" bucket in Supabase Storage
-- Or run the force-clear-storage.js script

-- ============================================================================
-- VERIFY CLEAN STATE
-- ============================================================================

DO $$
DECLARE
    transaction_count INTEGER := 0;
    attachment_count INTEGER := 0;
    business_unit_count INTEGER := 0;
    time_entry_count INTEGER := 0;
    task_count INTEGER := 0;
    project_count INTEGER := 0;
    team_member_count INTEGER := 0;
BEGIN
    -- Count remaining records in each table
    SELECT COUNT(*) INTO transaction_count FROM transactions;
    SELECT COUNT(*) INTO attachment_count FROM attachments;
    SELECT COUNT(*) INTO business_unit_count FROM business_units;
    
    -- Check if tables exist before counting
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        SELECT COUNT(*) INTO time_entry_count FROM time_entries;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        SELECT COUNT(*) INTO task_count FROM tasks;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        SELECT COUNT(*) INTO project_count FROM projects;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        SELECT COUNT(*) INTO team_member_count FROM team_members;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Verification Results:';
    RAISE NOTICE '   • Transactions: % rows', transaction_count;
    RAISE NOTICE '   • Attachments: % rows', attachment_count;
    RAISE NOTICE '   • Business Units: % rows', business_unit_count;
    RAISE NOTICE '   • Time Entries: % rows', time_entry_count;
    RAISE NOTICE '   • Tasks: % rows', task_count;
    RAISE NOTICE '   • Projects: % rows', project_count;
    RAISE NOTICE '   • Team Members: % rows', team_member_count;
    RAISE NOTICE '';
    
    IF transaction_count = 0 AND attachment_count = 0 AND business_unit_count = 0 
       AND time_entry_count = 0 AND task_count = 0 AND project_count = 0 
       AND team_member_count = 0 THEN
        RAISE NOTICE '✅ ALL SAMPLE DATA SUCCESSFULLY REMOVED!';
        RAISE NOTICE '🎉 Database is now completely clean and ready for production';
    ELSE
        RAISE NOTICE '⚠️  Some data may remain. Please check manually.';
    END IF;
END $$;

-- ============================================================================
-- COMPLETION NOTES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 ============================================';
    RAISE NOTICE '🧹 SAMPLE DATA CLEANUP COMPLETED';
    RAISE NOTICE '🧹 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Manually clear Supabase Storage buckets if needed';
    RAISE NOTICE '   2. Remove mock data from React components';
    RAISE NOTICE '   3. Set up your real business units/areas';
    RAISE NOTICE '   4. Deploy the cleaned application';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your NamOS system is ready for real data!';
    RAISE NOTICE '';
END $$;
