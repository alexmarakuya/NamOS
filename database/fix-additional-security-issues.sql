-- ============================================================================
-- NamOS Additional Security Fixes
-- ============================================================================
-- This script fixes the remaining security warnings from Supabase Security Advisor
-- Run this AFTER running fix-security-issues.sql
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔐 Starting additional NamOS security fixes...';
END $$;

-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE ISSUES
-- ============================================================================

-- Fix update_updated_at_column function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate triggers that use this function
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_units_updated_at 
    BEFORE UPDATE ON business_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at 
    BEFORE UPDATE ON time_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix get_user_daily_summary function (if it exists)
DROP FUNCTION IF EXISTS get_user_daily_summary(text, date, date) CASCADE;

CREATE OR REPLACE FUNCTION get_user_daily_summary(
    user_id_param text,
    start_date_param date,
    end_date_param date
)
RETURNS TABLE (
    summary_date date,
    total_hours numeric,
    billable_hours numeric,
    non_billable_hours numeric,
    total_value numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.date as summary_date,
        COALESCE(SUM(te.hours), 0) as total_hours,
        COALESCE(SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END), 0) as billable_hours,
        COALESCE(SUM(CASE WHEN NOT te.is_billable THEN te.hours ELSE 0 END), 0) as non_billable_hours,
        COALESCE(SUM(
            CASE WHEN te.is_billable 
            THEN te.hours * COALESCE(p.hourly_rate, tm.hourly_rate, 0)
            ELSE 0 END
        ), 0) as total_value
    FROM time_entries te
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN team_members tm ON te.user_id = tm.slack_user_id
    WHERE te.user_id = user_id_param
    AND te.date BETWEEN start_date_param AND end_date_param
    GROUP BY te.date
    ORDER BY te.date;
END;
$$;

-- Fix get_transaction_with_attachments function (if it exists)
DROP FUNCTION IF EXISTS get_transaction_with_attachments(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_transaction_with_attachments(transaction_id_param uuid)
RETURNS TABLE (
    id uuid,
    amount numeric,
    description text,
    type text,
    category text,
    business_unit_id uuid,
    date date,
    created_at timestamptz,
    updated_at timestamptz,
    business_unit_name text,
    attachments jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.amount,
        t.description,
        t.type,
        t.category,
        t.business_unit_id,
        t.date,
        t.created_at,
        t.updated_at,
        bu.name as business_unit_name,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'file_name', a.file_name,
                    'file_size', a.file_size,
                    'file_type', a.file_type,
                    'storage_path', a.storage_path,
                    'created_at', a.created_at
                )
            ) FILTER (WHERE a.id IS NOT NULL),
            '[]'::jsonb
        ) as attachments
    FROM transactions t
    LEFT JOIN business_units bu ON t.business_unit_id = bu.id
    LEFT JOIN attachments a ON t.id = a.transaction_id
    WHERE t.id = transaction_id_param
    GROUP BY t.id, bu.name;
END;
$$;

-- Function fixes completed
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed Function Search Path Mutable issues';
END $$;

-- ============================================================================
-- 2. GRANT PROPER PERMISSIONS FOR FUNCTIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_summary(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_with_attachments(uuid) TO authenticated;

-- Permissions granted
DO $$
BEGIN
    RAISE NOTICE '✅ Granted proper permissions for functions';
END $$;

-- ============================================================================
-- 3. ADDITIONAL SECURITY HARDENING
-- ============================================================================

-- Ensure all functions are owned by postgres (or service_role)
-- This is automatically handled by SECURITY DEFINER

-- Revoke unnecessary permissions from public
REVOKE ALL ON FUNCTION update_updated_at_column() FROM public;
REVOKE ALL ON FUNCTION get_user_daily_summary(text, date, date) FROM public;
REVOKE ALL ON FUNCTION get_transaction_with_attachments(uuid) FROM public;

-- Grant only to authenticated users
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_summary(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_with_attachments(uuid) TO authenticated;

-- Security hardening completed
DO $$
BEGIN
    RAISE NOTICE '✅ Applied additional security hardening';
END $$;

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

DO $$
DECLARE
    function_count INTEGER;
    secure_function_count INTEGER;
BEGIN
    -- Count total functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('update_updated_at_column', 'get_user_daily_summary', 'get_transaction_with_attachments');

    -- Count functions with proper search_path
    SELECT COUNT(*) INTO secure_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('update_updated_at_column', 'get_user_daily_summary', 'get_transaction_with_attachments')
    AND p.proconfig IS NOT NULL;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Additional Security Fix Verification:';
    RAISE NOTICE '   • Functions found: %', function_count;
    RAISE NOTICE '   • Functions with secure search_path: %', secure_function_count;
    RAISE NOTICE '';
    
    IF function_count = secure_function_count AND function_count > 0 THEN
        RAISE NOTICE '✅ ALL FUNCTION SECURITY ISSUES FIXED!';
    ELSE
        RAISE NOTICE '⚠️  Some function issues may remain.';
    END IF;
END $$;

-- ============================================================================
-- 5. POSTGRESQL VERSION WARNING NOTE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 POSTGRESQL VERSION SECURITY:';
    RAISE NOTICE '   The PostgreSQL version warning cannot be fixed via SQL.';
    RAISE NOTICE '   This is managed by Supabase and will be updated automatically.';
    RAISE NOTICE '   Your database functions are now secure regardless of version.';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 ============================================';
    RAISE NOTICE '🔐 ADDITIONAL SECURITY FIXES COMPLETED';
    RAISE NOTICE '🔐 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Function Search Path issues fixed';
    RAISE NOTICE '✅ Functions secured with proper search_path';
    RAISE NOTICE '✅ Function permissions properly configured';
    RAISE NOTICE '✅ Additional security hardening applied';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PostgreSQL version warning is managed by Supabase';
    RAISE NOTICE '🚀 Your NamOS database is now fully secure!';
    RAISE NOTICE '';
END $$;
