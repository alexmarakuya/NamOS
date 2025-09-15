-- Tasks Management Schema - MVP Version
-- Focused on essential task management features only

-- Create tasks table (simplified)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    tags TEXT[], -- Array of tags for simple categorization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL, -- Simple user identifier
    CONSTRAINT positive_estimated_hours CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    CONSTRAINT positive_actual_hours CHECK (actual_hours >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for tasks with related data (MVP essentials only)
CREATE OR REPLACE VIEW tasks_with_details AS
SELECT 
    t.*,
    p.name as project_name,
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
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;

-- Schema is ready for production data
-- No sample data inserted - use the application to add real tasks

-- MVP Features Included:
-- ✅ Basic task CRUD operations
-- ✅ Project and team member relationships  
-- ✅ Status and priority management
-- ✅ Due dates and hour tracking
-- ✅ Simple tagging system
-- ✅ Automatic timestamps
-- ✅ Performance indexes

-- MVP Features Excluded (can be added later):
-- ❌ Task comments system
-- ❌ Task time logging integration  
-- ❌ Task file attachments
-- ❌ Task dependencies
-- ❌ Task templates
-- ❌ Activity logging
