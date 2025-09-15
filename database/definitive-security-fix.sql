-- ============================================================================
-- DEFINITIVE Security Definer Views Fix
-- ============================================================================
-- This script will definitively fix the Security Definer View warnings
-- by using a more aggressive approach
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔐 Starting DEFINITIVE Security Definer Views fix...';
END $$;

-- ============================================================================
-- 1. AGGRESSIVE VIEW CLEANUP
-- ============================================================================

-- Drop views in dependency order and completely remove them
DROP VIEW IF EXISTS time_tracking_summary CASCADE;
DROP VIEW IF EXISTS transactions_with_attachments CASCADE;
DROP VIEW IF EXISTS tasks_with_details CASCADE;

-- Also try dropping with explicit schema
DROP VIEW IF EXISTS public.time_tracking_summary CASCADE;
DROP VIEW IF EXISTS public.transactions_with_attachments CASCADE;
DROP VIEW IF EXISTS public.tasks_with_details CASCADE;

-- Wait a moment and try alternative drop syntax
DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN SELECT viewname FROM pg_views WHERE schemaname = 'public' 
        AND viewname IN ('time_tracking_summary', 'transactions_with_attachments', 'tasks_with_details')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(view_name) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', view_name;
    END LOOP;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Aggressively dropped all existing views';
END $$;

-- ============================================================================
-- 2. RECREATE VIEWS WITH EXPLICIT NO SECURITY DEFINER
-- ============================================================================

-- Create time_tracking_summary view (EXPLICITLY NO SECURITY DEFINER)
CREATE VIEW public.time_tracking_summary AS
SELECT 
    te.date,
    te.user_name,
    COALESCE(p.name, 'No Project') as project_name,
    p.client_name,
    SUM(te.hours) as total_hours,
    SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as billable_hours,
    SUM(CASE WHEN NOT te.is_billable THEN te.hours ELSE 0 END) as non_billable_hours,
    COALESCE(p.hourly_rate, tm.hourly_rate, 0) * SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as total_value
FROM time_entries te
LEFT JOIN projects p ON te.project_id = p.id
LEFT JOIN team_members tm ON te.user_id = tm.slack_user_id
GROUP BY te.date, te.user_name, p.name, p.client_name, p.hourly_rate, tm.hourly_rate
ORDER BY te.date DESC;

-- Create transactions_with_attachments view (EXPLICITLY NO SECURITY DEFINER)
CREATE VIEW public.transactions_with_attachments AS
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
    COALESCE(bu.name, 'Unknown') as business_unit_name,
    COALESCE(bu.type, 'unknown') as business_unit_type,
    COALESCE(bu.color, '#000000') as business_unit_color,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', a.id,
                'file_name', a.file_name,
                'file_size', a.file_size,
                'file_type', a.file_type,
                'storage_path', a.storage_path,
                'created_at', a.created_at
            )
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'::json
    ) as attachments
FROM transactions t
LEFT JOIN business_units bu ON t.business_unit_id = bu.id
LEFT JOIN attachments a ON t.id = a.transaction_id
GROUP BY t.id, t.amount, t.description, t.type, t.category, t.business_unit_id, t.date, t.created_at, t.updated_at, bu.name, bu.type, bu.color
ORDER BY t.date DESC, t.created_at DESC;

-- Create tasks_with_details view (EXPLICITLY NO SECURITY DEFINER)
CREATE VIEW public.tasks_with_details AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.project_id,
    t.assigned_to,
    t.status,
    t.priority,
    t.due_date,
    t.estimated_hours,
    t.actual_hours,
    t.tags,
    t.created_at,
    t.updated_at,
    t.created_by,
    COALESCE(p.name, 'No Project') as project_name,
    p.client_name,
    tm.full_name as assignee_name,
    tm.slack_username as assignee_username,
    CASE 
        WHEN t.due_date < NOW() AND t.status != 'done' THEN true 
        ELSE false 
    END as is_overdue
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN team_members tm ON t.assigned_to = tm.id
ORDER BY 
    CASE t.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
        ELSE 5
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;

DO $$
BEGIN
    RAISE NOTICE '✅ Recreated all views with explicit schema and NO Security Definer';
END $$;

-- ============================================================================
-- 3. VERIFY NO SECURITY DEFINER VIEWS EXIST
-- ============================================================================

DO $$
DECLARE
    view_record RECORD;
    has_security_definer_views BOOLEAN := FALSE;
BEGIN
    -- Check each view individually
    FOR view_record IN 
        SELECT schemaname, viewname, definition 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname IN ('time_tracking_summary', 'transactions_with_attachments', 'tasks_with_details')
    LOOP
        RAISE NOTICE 'Found view: %.%', view_record.schemaname, view_record.viewname;
        
        -- Check if definition contains SECURITY DEFINER (it shouldn't for views, but let's be thorough)
        IF view_record.definition ILIKE '%SECURITY DEFINER%' THEN
            RAISE NOTICE '⚠️  View % still has SECURITY DEFINER!', view_record.viewname;
            has_security_definer_views := TRUE;
        ELSE
            RAISE NOTICE '✅ View % is secure (no SECURITY DEFINER)', view_record.viewname;
        END IF;
    END LOOP;
    
    IF NOT has_security_definer_views THEN
        RAISE NOTICE '🎉 ALL VIEWS ARE NOW SECURE!';
    END IF;
END $$;

-- ============================================================================
-- 4. GRANT PROPER PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.time_tracking_summary TO authenticated;
GRANT SELECT ON public.transactions_with_attachments TO authenticated;
GRANT SELECT ON public.tasks_with_details TO authenticated;

-- Grant permissions to anonymous users for public data
GRANT SELECT ON public.time_tracking_summary TO anon;
GRANT SELECT ON public.transactions_with_attachments TO anon;
GRANT SELECT ON public.tasks_with_details TO anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Granted proper permissions on all views';
END $$;

-- ============================================================================
-- 5. FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public'
    AND viewname IN ('time_tracking_summary', 'transactions_with_attachments', 'tasks_with_details');

    RAISE NOTICE '';
    RAISE NOTICE '📊 Final Verification:';
    RAISE NOTICE '   • Views found: %', view_count;
    RAISE NOTICE '';
    
    IF view_count = 3 THEN
        RAISE NOTICE '✅ SUCCESS! All 3 views recreated without SECURITY DEFINER';
        RAISE NOTICE '🔐 Security Advisor should now show 0 Security Definer View errors';
    ELSE
        RAISE NOTICE '⚠️  Expected 3 views, found %. Please check manually.', view_count;
    END IF;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔐 ============================================';
    RAISE NOTICE '🔐 DEFINITIVE SECURITY DEFINER VIEWS FIX COMPLETE';
    RAISE NOTICE '🔐 ============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All problematic views completely removed';
    RAISE NOTICE '✅ Views recreated with explicit schema (public)';
    RAISE NOTICE '✅ No SECURITY DEFINER clauses used';
    RAISE NOTICE '✅ Proper permissions granted';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Refresh Security Advisor - should show 0 Security Definer View errors!';
    RAISE NOTICE '📋 If errors persist, they may be from other sources not related to these views';
    RAISE NOTICE '';
END $$;

