-- Tasks Management Schema
-- This schema extends the existing time tracking system with task management capabilities

-- Create tasks table
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
    tags TEXT[], -- Array of tags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL, -- Could be slack_user_id or system user
    CONSTRAINT positive_estimated_hours CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    CONSTRAINT positive_actual_hours CHECK (actual_hours >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Create task comments table for task discussions
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- slack_user_id or system user
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Create task time logs table to link tasks with time entries
CREATE TABLE IF NOT EXISTS task_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, time_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_time_entry_id ON task_time_logs(time_entry_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at 
    BEFORE UPDATE ON task_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample tasks for demonstration
INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, due_date, estimated_hours, tags, created_by) 
SELECT 
    'Design user authentication flow',
    'Create wireframes and user flow for the login/signup process',
    p.id,
    tm.id,
    'in_progress',
    'high',
    CURRENT_DATE + INTERVAL '10 days',
    8.0,
    ARRAY['design', 'auth', 'frontend'],
    'system'
FROM projects p 
CROSS JOIN team_members tm 
WHERE p.name = 'AI Studios' 
  AND tm.slack_username = 'alex'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, due_date, estimated_hours, tags, created_by) 
SELECT 
    'Implement API endpoints',
    'Build REST API for user management and authentication',
    p.id,
    tm.id,
    'todo',
    'medium',
    CURRENT_DATE + INTERVAL '15 days',
    12.0,
    ARRAY['backend', 'api', 'auth'],
    'system'
FROM projects p 
CROSS JOIN team_members tm 
WHERE p.name = 'Travel Toolbox' 
  AND tm.slack_username = 'pjgsilva93'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, estimated_hours, tags, created_by) 
SELECT 
    'Write unit tests',
    'Add comprehensive test coverage for authentication module',
    p.id,
    tm.id,
    'backlog',
    'low',
    6.0,
    ARRAY['testing', 'quality'],
    'system'
FROM projects p 
CROSS JOIN team_members tm 
WHERE p.name = 'Consulting Group' 
  AND tm.slack_username = 'alex'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, due_date, estimated_hours, actual_hours, tags, created_by) 
SELECT 
    'Deploy to staging',
    'Set up staging environment and deploy latest changes',
    p.id,
    tm.id,
    'done',
    'medium',
    CURRENT_DATE - INTERVAL '2 days',
    4.0,
    3.0,
    ARRAY['devops', 'deployment'],
    'system'
FROM projects p 
CROSS JOIN team_members tm 
WHERE p.name = 'TOM/ADB' 
  AND tm.slack_username = 'pjgsilva93'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, status, priority, due_date, estimated_hours, tags, created_by) 
VALUES 
    ('Review project requirements', 'Go through client requirements and create technical specifications', 'review', 'high', CURRENT_DATE + INTERVAL '3 days', 2.0, ARRAY['planning', 'requirements'], 'system'),
    ('Update documentation', 'Update API documentation and user guides', 'todo', 'low', CURRENT_DATE + INTERVAL '20 days', 4.0, ARRAY['documentation'], 'system')
ON CONFLICT DO NOTHING;

-- Create a view for task statistics
CREATE OR REPLACE VIEW task_stats AS
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') as overdue_tasks,
    COALESCE(SUM(estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(actual_hours), 0) as total_actual_hours,
    COUNT(DISTINCT project_id) FILTER (WHERE project_id IS NOT NULL) as projects_with_tasks,
    COUNT(DISTINCT assigned_to) FILTER (WHERE assigned_to IS NOT NULL) as team_members_with_tasks
FROM tasks;

-- Create a view for tasks with related data
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

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON task_comments TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON task_time_logs TO your_app_user;
-- GRANT SELECT ON task_stats TO your_app_user;
-- GRANT SELECT ON tasks_with_details TO your_app_user;
