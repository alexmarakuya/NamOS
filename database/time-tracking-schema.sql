-- Time Tracking Schema for Slack Bot
-- Run this after the main schema.sql to add time tracking functionality

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255),
    hourly_rate DECIMAL(10,2),
    business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Slack user ID
    user_name VARCHAR(255) NOT NULL, -- Slack username for display
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hours DECIMAL(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_billable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    slack_channel_id VARCHAR(255), -- Channel where the entry was logged
    slack_message_ts VARCHAR(255) -- Timestamp of the Slack message
);

-- Create team_members table for user management
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slack_user_id VARCHAR(255) UNIQUE NOT NULL,
    slack_username VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member', -- member, admin, manager
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_projects_business_unit ON projects(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_slack_user ON team_members(slack_user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at 
    BEFORE UPDATE ON time_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample projects
DO $$
DECLARE
    tech_id UUID;
    ecom_id UUID;
BEGIN
    -- Get business unit IDs
    SELECT id INTO tech_id FROM business_units WHERE name = 'Tech Consulting';
    SELECT id INTO ecom_id FROM business_units WHERE name = 'E-commerce Store';

    -- Insert sample projects
    INSERT INTO projects (name, description, client_name, hourly_rate, business_unit_id) VALUES
        ('Website Redesign', 'Complete redesign of client website with modern UI/UX', 'Acme Corp', 125.00, tech_id),
        ('Mobile App Development', 'iOS and Android app for inventory management', 'RetailCo', 150.00, tech_id),
        ('E-commerce Platform', 'Custom e-commerce solution with payment integration', 'ShopLocal', 135.00, ecom_id),
        ('Internal Tools', 'General internal development and maintenance', NULL, 100.00, tech_id)
    ON CONFLICT DO NOTHING;
END $$;

-- Create a view for time tracking reports
CREATE OR REPLACE VIEW time_tracking_summary AS
SELECT 
    te.user_id,
    te.user_name,
    p.name as project_name,
    p.client_name,
    bu.name as business_unit,
    DATE_TRUNC('week', te.date) as week_start,
    DATE_TRUNC('month', te.date) as month_start,
    te.date,
    SUM(te.hours) as total_hours,
    SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as billable_hours,
    SUM(CASE WHEN te.is_billable THEN te.hours * COALESCE(p.hourly_rate, tm.hourly_rate, 0) ELSE 0 END) as total_value
FROM time_entries te
LEFT JOIN projects p ON te.project_id = p.id
LEFT JOIN business_units bu ON p.business_unit_id = bu.id
LEFT JOIN team_members tm ON te.user_id = tm.slack_user_id
GROUP BY te.user_id, te.user_name, p.name, p.client_name, bu.name, 
         DATE_TRUNC('week', te.date), DATE_TRUNC('month', te.date), te.date;

-- Create a function to get user's daily summary
CREATE OR REPLACE FUNCTION get_user_daily_summary(
    p_user_id VARCHAR(255),
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_hours DECIMAL(5,2),
    billable_hours DECIMAL(5,2),
    project_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_summary AS (
        SELECT 
            SUM(te.hours) as day_total_hours,
            SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END) as day_billable_hours
        FROM time_entries te
        WHERE te.user_id = p_user_id AND te.date = p_date
    ),
    project_breakdown AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'project', COALESCE(p.name, 'No Project'),
                    'hours', te.hours,
                    'billable', te.is_billable,
                    'description', te.description
                )
            ) as breakdown
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        WHERE te.user_id = p_user_id AND te.date = p_date
    )
    SELECT 
        COALESCE(ds.day_total_hours, 0),
        COALESCE(ds.day_billable_hours, 0),
        COALESCE(pb.breakdown, '[]'::jsonb)
    FROM daily_summary ds
    CROSS JOIN project_breakdown pb;
END;
$$ LANGUAGE plpgsql;

