-- Project Spirits Schema
-- Extends the existing project management system with AI-powered project spirits
-- Run this after the main schema.sql and tasks-schema.sql

-- Create project_spirits table
CREATE TABLE IF NOT EXISTS project_spirits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Personality configuration
    personality_tone VARCHAR(20) NOT NULL DEFAULT 'professional' 
        CHECK (personality_tone IN ('professional', 'casual', 'creative', 'technical', 'consultative')),
    personality_focus_areas TEXT[] DEFAULT '{}',
    personality_communication_style TEXT,
    personality_expertise_level VARCHAR(10) NOT NULL DEFAULT 'mid'
        CHECK (personality_expertise_level IN ('junior', 'mid', 'senior', 'expert')),
    
    -- Project path tracking
    path_stage VARCHAR(20) NOT NULL DEFAULT 'planning'
        CHECK (path_stage IN ('discovery', 'planning', 'design', 'development', 'testing', 'review', 'delivery', 'maintenance')),
    path_progress INTEGER DEFAULT 0 CHECK (path_progress >= 0 AND path_progress <= 100),
    
    -- Client profile (stored as JSONB for flexibility)
    client_profile JSONB DEFAULT '{
        "communication_style": "professional",
        "preferred_frequency": "weekly",
        "timezone": "UTC",
        "response_time_expectation": "same_day",
        "decision_making_style": "collaborative",
        "risk_tolerance": "medium",
        "budget_sensitivity": "flexible",
        "preferred_communication_channels": ["email"],
        "red_flags": [],
        "success_metrics": [],
        "notes": ""
    }'::jsonb,
    
    -- Memory and state
    memory_summary TEXT DEFAULT '',
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one spirit per project
    UNIQUE(project_id)
);

-- Create spirit_conversations table for chat history
CREATE TABLE IF NOT EXISTS spirit_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    spirit_id UUID REFERENCES project_spirits(id) ON DELETE CASCADE NOT NULL,
    user_id VARCHAR(255) NOT NULL, -- Could be slack_user_id or system user
    user_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spirit_insights table for AI-generated insights
CREATE TABLE IF NOT EXISTS spirit_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    spirit_id UUID REFERENCES project_spirits(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('task_suggestion', 'risk_alert', 'opportunity', 'pattern', 'client_update')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spirit_patterns table for learning and pattern recognition
CREATE TABLE IF NOT EXISTS spirit_patterns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    spirit_id UUID REFERENCES project_spirits(id) ON DELETE CASCADE NOT NULL,
    pattern_type VARCHAR(20) NOT NULL 
        CHECK (pattern_type IN ('workflow', 'communication', 'timeline', 'resource')),
    description TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spirit_actions table for suggested/automated actions
CREATE TABLE IF NOT EXISTS spirit_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    spirit_id UUID REFERENCES project_spirits(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('task_create', 'status_update', 'client_notify', 'team_alert', 'schedule_meeting')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    suggested_data JSONB DEFAULT '{}',
    requires_approval BOOLEAN DEFAULT true,
    is_executed BOOLEAN DEFAULT false,
    executed_at TIMESTAMP WITH TIME ZONE,
    executed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create path_stages table for project stage definitions
CREATE TABLE IF NOT EXISTS path_stages (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    typical_duration_days INTEGER DEFAULT 7,
    key_deliverables TEXT[] DEFAULT '{}',
    success_criteria TEXT[] DEFAULT '{}',
    common_blockers TEXT[] DEFAULT '{}',
    next_stages TEXT[] DEFAULT '{}',
    automation_triggers TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default path stages
INSERT INTO path_stages (id, name, description, typical_duration_days, key_deliverables, success_criteria, next_stages) VALUES
('discovery', 'Discovery', 'Understanding client needs, requirements gathering, and project scoping', 5, 
 '["Requirements document", "Project scope", "Initial timeline"]',
 '["Clear requirements defined", "Stakeholders identified", "Success metrics established"]',
 '["planning"]'),
 
('planning', 'Planning', 'Detailed project planning, resource allocation, and timeline creation', 3,
 '["Project plan", "Resource allocation", "Detailed timeline", "Risk assessment"]',
 '["Tasks defined and prioritized", "Team assigned", "Timeline approved"]',
 '["design", "development"]'),
 
('design', 'Design', 'Creating designs, wireframes, prototypes, and getting client approval', 7,
 '["Wireframes", "Design mockups", "Prototypes", "Style guide"]',
 '["Designs approved by client", "Technical feasibility confirmed"]',
 '["development"]'),
 
('development', 'Development', 'Building the solution, coding, and implementation', 14,
 '["Core functionality", "Features implementation", "Integration work"]',
 '["Key features completed", "Code quality standards met"]',
 '["testing", "review"]'),
 
('testing', 'Testing', 'Quality assurance, bug fixes, and performance optimization', 5,
 '["Test cases", "Bug reports", "Performance metrics", "Security audit"]',
 '["All critical bugs fixed", "Performance targets met"]',
 '["review", "delivery"]'),
 
('review', 'Review', 'Client review, feedback incorporation, and final adjustments', 3,
 '["Review sessions", "Feedback documentation", "Final adjustments"]',
 '["Client approval received", "All feedback addressed"]',
 '["delivery"]'),
 
('delivery', 'Delivery', 'Final delivery, deployment, and handover to client', 2,
 '["Final deliverables", "Documentation", "Training materials", "Deployment"]',
 '["Solution deployed", "Client trained", "Documentation complete"]',
 '["maintenance"]'),
 
('maintenance', 'Maintenance', 'Ongoing support, updates, and maintenance', 30,
 '["Support documentation", "Update schedule", "Monitoring setup"]',
 '["Support processes established", "Client satisfied with ongoing service"]',
 '[]')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_spirits_project_id ON project_spirits(project_id);
CREATE INDEX IF NOT EXISTS idx_project_spirits_path_stage ON project_spirits(path_stage);
CREATE INDEX IF NOT EXISTS idx_project_spirits_is_active ON project_spirits(is_active);

CREATE INDEX IF NOT EXISTS idx_spirit_conversations_spirit_id ON spirit_conversations(spirit_id);
CREATE INDEX IF NOT EXISTS idx_spirit_conversations_created_at ON spirit_conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_spirit_insights_spirit_id ON spirit_insights(spirit_id);
CREATE INDEX IF NOT EXISTS idx_spirit_insights_type ON spirit_insights(type);
CREATE INDEX IF NOT EXISTS idx_spirit_insights_is_read ON spirit_insights(is_read);
CREATE INDEX IF NOT EXISTS idx_spirit_insights_created_at ON spirit_insights(created_at);

CREATE INDEX IF NOT EXISTS idx_spirit_patterns_spirit_id ON spirit_patterns(spirit_id);
CREATE INDEX IF NOT EXISTS idx_spirit_patterns_type ON spirit_patterns(pattern_type);

CREATE INDEX IF NOT EXISTS idx_spirit_actions_spirit_id ON spirit_actions(spirit_id);
CREATE INDEX IF NOT EXISTS idx_spirit_actions_is_executed ON spirit_actions(is_executed);
CREATE INDEX IF NOT EXISTS idx_spirit_actions_requires_approval ON spirit_actions(requires_approval);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_spirits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_project_spirits_updated_at 
    BEFORE UPDATE ON project_spirits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_project_spirits_updated_at();

-- Create function to automatically create a spirit when a project is created
CREATE OR REPLACE FUNCTION create_default_project_spirit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create spirit for active projects
    IF NEW.is_active = true THEN
        INSERT INTO project_spirits (
            project_id,
            name,
            personality_tone,
            personality_focus_areas,
            personality_communication_style,
            path_stage,
            path_progress
        ) VALUES (
            NEW.id,
            COALESCE(NEW.client_name || ' Project Spirit', NEW.name || ' Spirit'),
            CASE 
                WHEN NEW.client_name IS NOT NULL THEN 'professional'
                ELSE 'casual'
            END,
            ARRAY['task_management', 'timeline_tracking'],
            'Clear, helpful, and proactive project assistance',
            'planning',
            10
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-create spirits for new projects
CREATE TRIGGER create_project_spirit_trigger
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_default_project_spirit();

-- Create RLS policies for project spirits (following existing patterns)
ALTER TABLE project_spirits ENABLE ROW LEVEL SECURITY;
ALTER TABLE spirit_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spirit_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE spirit_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE spirit_actions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be restricted later based on your auth setup)
CREATE POLICY "Allow all operations on project_spirits" ON project_spirits FOR ALL USING (true);
CREATE POLICY "Allow all operations on spirit_conversations" ON spirit_conversations FOR ALL USING (true);
CREATE POLICY "Allow all operations on spirit_insights" ON spirit_insights FOR ALL USING (true);
CREATE POLICY "Allow all operations on spirit_patterns" ON spirit_patterns FOR ALL USING (true);
CREATE POLICY "Allow all operations on spirit_actions" ON spirit_actions FOR ALL USING (true);

-- Create a view for project spirits with related data
CREATE OR REPLACE VIEW project_spirits_with_data AS
SELECT 
    ps.*,
    p.name as project_name,
    p.client_name,
    p.status as project_status,
    p.deadline as project_deadline,
    
    -- Count related data
    (SELECT COUNT(*) FROM spirit_conversations sc WHERE sc.spirit_id = ps.id) as conversation_count,
    (SELECT COUNT(*) FROM spirit_insights si WHERE si.spirit_id = ps.id AND si.is_read = false) as unread_insights_count,
    (SELECT COUNT(*) FROM spirit_actions sa WHERE sa.spirit_id = ps.id AND sa.is_executed = false) as pending_actions_count,
    
    -- Latest activity
    (SELECT MAX(created_at) FROM spirit_conversations sc WHERE sc.spirit_id = ps.id) as last_conversation,
    (SELECT MAX(created_at) FROM spirit_insights si WHERE si.spirit_id = ps.id) as last_insight
    
FROM project_spirits ps
JOIN projects p ON ps.project_id = p.id
WHERE ps.is_active = true;

-- Grant permissions on the view
GRANT SELECT ON project_spirits_with_data TO anon, authenticated;
