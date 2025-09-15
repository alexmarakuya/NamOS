-- Add missing columns to projects table
-- Run this in your Supabase SQL Editor

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'status'
    ) THEN
        ALTER TABLE projects ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'upcoming', 'completed', 'on_hold'));
        
        -- Update existing projects to have 'active' status if they're active
        UPDATE projects SET status = 'active' WHERE is_active = true;
        UPDATE projects SET status = 'completed' WHERE is_active = false;
        
        RAISE NOTICE '✅ Added status column to projects table';
    ELSE
        RAISE NOTICE '✅ Status column already exists in projects table';
    END IF;
END $$;

-- Add deadline column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'deadline'
    ) THEN
        ALTER TABLE projects ADD COLUMN deadline TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE '✅ Added deadline column to projects table';
    ELSE
        RAISE NOTICE '✅ Deadline column already exists in projects table';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('status', 'deadline')
ORDER BY column_name;

