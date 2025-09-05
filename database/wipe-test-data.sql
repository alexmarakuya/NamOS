-- NamOS Database Wipe Script
-- This script safely removes all test data while preserving the database structure
-- Run this to prepare for real production data

-- ============================================================================
-- SAFETY CHECK: Verify we're in the right database
-- ============================================================================
DO $$
BEGIN
    -- Add any additional safety checks here if needed
    RAISE NOTICE 'Starting NamOS database wipe...';
END $$;

-- ============================================================================
-- CLEAR ALL TRANSACTION DATA
-- ============================================================================

-- First, clear attachments (they reference transactions)
TRUNCATE TABLE attachments RESTART IDENTITY CASCADE;
RAISE NOTICE 'Cleared all attachments';

-- Clear all transactions
TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
RAISE NOTICE 'Cleared all transactions';

-- ============================================================================
-- CLEAR BUSINESS UNITS (OPTIONAL - UNCOMMENT IF YOU WANT TO START FRESH)
-- ============================================================================

-- Uncomment the lines below if you want to completely reset business units too
-- WARNING: This will require you to recreate your business units

-- TRUNCATE TABLE business_units RESTART IDENTITY CASCADE;
-- RAISE NOTICE 'Cleared all business units';

-- ============================================================================
-- RESET SEQUENCES
-- ============================================================================

-- Reset auto-increment sequences to start fresh
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS attachments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS business_units_id_seq RESTART WITH 1; -- Uncomment if you cleared business units

-- ============================================================================
-- VERIFY CLEAN STATE
-- ============================================================================

-- Check that tables are empty
DO $$
DECLARE
    transaction_count INTEGER;
    attachment_count INTEGER;
    business_unit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO transaction_count FROM transactions;
    SELECT COUNT(*) INTO attachment_count FROM attachments;
    SELECT COUNT(*) INTO business_unit_count FROM business_units;
    
    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '  Transactions: % rows', transaction_count;
    RAISE NOTICE '  Attachments: % rows', attachment_count;
    RAISE NOTICE '  Business Units: % rows', business_unit_count;
    
    IF transaction_count = 0 AND attachment_count = 0 THEN
        RAISE NOTICE '✅ Database successfully wiped and ready for real data!';
    ELSE
        RAISE NOTICE '⚠️  Some data may remain. Please check manually.';
    END IF;
END $$;

-- ============================================================================
-- OPTIONAL: RECREATE ESSENTIAL BUSINESS UNITS
-- ============================================================================

-- Uncomment and modify these if you want to start with fresh business units
-- INSERT INTO business_units (name, type, created_at, updated_at) VALUES
-- ('Personal', 'personal', NOW(), NOW()),
-- ('Main Business', 'business', NOW(), NOW());

-- RAISE NOTICE 'Recreated essential business units';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

RAISE NOTICE '🧹 NamOS database wipe completed successfully!';
RAISE NOTICE '📊 Database is now ready for real production data';
RAISE NOTICE '⚠️  Remember to also clear Supabase Storage if needed';
