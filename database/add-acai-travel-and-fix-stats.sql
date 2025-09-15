-- Add status field, deadline field to projects table and add Acai Travel client with projects

-- First, add status and deadline fields to projects table if they don't exist
DO $$
BEGIN
    -- Check if status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'status'
    ) THEN
        -- Add status column
        ALTER TABLE projects ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'upcoming', 'completed', 'on_hold'));
        
        -- Update existing projects to have 'active' status if they're active
        UPDATE projects SET status = 'active' WHERE is_active = true;
        UPDATE projects SET status = 'completed' WHERE is_active = false;
        
        RAISE NOTICE '✅ Added status column to projects table';
    ELSE
        RAISE NOTICE '✅ Status column already exists in projects table';
    END IF;

    -- Check if deadline column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'deadline'
    ) THEN
        -- Add deadline column
        ALTER TABLE projects ADD COLUMN deadline TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE '✅ Added deadline column to projects table';
    ELSE
        RAISE NOTICE '✅ Deadline column already exists in projects table';
    END IF;
END $$;

-- Get business unit IDs for the new projects
DO $$
DECLARE
    tech_id UUID;
    ecom_id UUID;
BEGIN
    -- Get business unit IDs (create them if they don't exist)
    SELECT id INTO tech_id FROM business_units WHERE name = 'Tech Consulting';
    SELECT id INTO ecom_id FROM business_units WHERE name = 'E-commerce Store';
    
    -- If business units don't exist, create them
    IF tech_id IS NULL THEN
        INSERT INTO business_units (name, type, color) VALUES
            ('Tech Consulting', 'business', '#3B82F6')
        RETURNING id INTO tech_id;
        RAISE NOTICE '✅ Created Tech Consulting business unit';
    END IF;
    
    IF ecom_id IS NULL THEN
        INSERT INTO business_units (name, type, color) VALUES
            ('E-commerce Store', 'business', '#10B981')
        RETURNING id INTO ecom_id;
        RAISE NOTICE '✅ Created E-commerce Store business unit';
    END IF;

    -- Insert Acai Travel projects with deadlines
    INSERT INTO projects (name, description, client_name, hourly_rate, business_unit_id, status, is_active, deadline) VALUES
        ('Travel Booking Platform', 'Custom travel booking system with real-time availability', 'Acai Travel', 140.00, tech_id, 'active', true, NOW() + INTERVAL '45 days'),
        ('Mobile Travel App', 'iOS and Android app for travel bookings and itinerary management', 'Acai Travel', 155.00, tech_id, 'active', true, NOW() + INTERVAL '30 days'),
        ('Customer Portal', 'Self-service customer portal for booking management and support', 'Acai Travel', 120.00, tech_id, 'upcoming', true, NOW() + INTERVAL '90 days')
    ON CONFLICT DO NOTHING;

    -- Add a few more varied projects for better stats demonstration with deadlines
    INSERT INTO projects (name, description, client_name, hourly_rate, business_unit_id, status, is_active, deadline) VALUES
        ('Website Maintenance', 'Ongoing website updates and maintenance', 'Acme Corp', 95.00, tech_id, 'completed', false, NOW() - INTERVAL '10 days'),
        ('Analytics Dashboard', 'Business intelligence dashboard for sales data', 'RetailCo', 165.00, tech_id, 'upcoming', true, NOW() + INTERVAL '60 days'),
        ('Payment Integration', 'Stripe and PayPal integration for e-commerce', 'ShopLocal', 130.00, ecom_id, 'active', true, NOW() + INTERVAL '14 days')
    ON CONFLICT DO NOTHING;

    -- Update existing projects with sample deadlines if they don't have them
    UPDATE projects SET deadline = NOW() + INTERVAL '21 days' 
    WHERE name = 'Website Redesign' AND deadline IS NULL;
    
    UPDATE projects SET deadline = NOW() + INTERVAL '75 days' 
    WHERE name = 'Mobile App Development' AND deadline IS NULL;
    
    UPDATE projects SET deadline = NOW() + INTERVAL '35 days' 
    WHERE name = 'E-commerce Platform' AND deadline IS NULL;
    
    UPDATE projects SET deadline = NOW() + INTERVAL '180 days' 
    WHERE name = 'Internal Tools' AND deadline IS NULL;

    RAISE NOTICE '✅ Added Acai Travel projects and additional sample projects with deadlines';
    RAISE NOTICE '✅ Projects now have proper status values and deadlines for statistics';
END $$;

-- Verify the data
DO $$
DECLARE
    active_count INTEGER;
    upcoming_count INTEGER;
    completed_count INTEGER;
    projects_with_deadlines INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count FROM projects WHERE status = 'active' AND is_active = true;
    SELECT COUNT(*) INTO upcoming_count FROM projects WHERE status = 'upcoming' AND is_active = true;
    SELECT COUNT(*) INTO completed_count FROM projects WHERE status = 'completed';
    SELECT COUNT(*) INTO projects_with_deadlines FROM projects WHERE deadline IS NOT NULL;
    
    RAISE NOTICE '📊 Project Statistics:';
    RAISE NOTICE '   Active Projects: %', active_count;
    RAISE NOTICE '   Upcoming Projects: %', upcoming_count;
    RAISE NOTICE '   Completed Projects: %', completed_count;
    RAISE NOTICE '   Projects with Deadlines: %', projects_with_deadlines;
END $$;