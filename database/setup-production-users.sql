-- ============================================================================
-- Setup Production Users Script
-- ============================================================================
-- This script removes all test users and adds only Alex and PJ Silver
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 Starting production users setup...';
END $$;

-- ============================================================================
-- CLEAR ALL EXISTING TEAM MEMBERS
-- ============================================================================

-- Remove all existing team members
TRUNCATE TABLE team_members RESTART IDENTITY CASCADE;
RAISE NOTICE '✅ Cleared all existing team members';

-- ============================================================================
-- ADD PRODUCTION TEAM MEMBERS
-- ============================================================================

-- Add Alex
INSERT INTO team_members (
    slack_user_id,
    slack_username,
    full_name,
    email,
    role,
    hourly_rate,
    is_active,
    timezone
) VALUES (
    'U_ALEX_001',
    'alex',
    'Alex',
    'alex@alexduffner.com',
    'admin',
    150.00,
    true,
    'America/Los_Angeles'
);

-- Add PJ Silver (Paolo Silver)
INSERT INTO team_members (
    slack_user_id,
    slack_username,
    full_name,
    email,
    role,
    hourly_rate,
    is_active,
    timezone
) VALUES (
    'U_PJ_002',
    'pjsilver',
    'PJ Silver',
    'pj@example.com',
    'developer',
    120.00,
    true,
    'America/New_York'
);

RAISE NOTICE '✅ Added Alex and PJ Silver to team members';

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Show the new team members
SELECT 
    '🎯 Production Team Members:' as info,
    full_name,
    slack_username,
    email,
    role,
    hourly_rate,
    is_active
FROM team_members
ORDER BY full_name;

-- Summary
SELECT 
    'Total team members:' as summary,
    COUNT(*) as count
FROM team_members;

DO $$
BEGIN
    RAISE NOTICE '✅ Production users setup complete!';
    RAISE NOTICE '👥 Team: Alex (Admin) and PJ Silver (Developer)';
END $$;
