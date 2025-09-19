-- Add Multiple Assignees Support to Tasks Table
-- This migration adds support for multiple assignees while maintaining backward compatibility

-- Add assignees array field to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS assignees UUID[] DEFAULT NULL;

-- Create index for assignees array for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN (assignees);

-- Update existing tasks to populate assignees array from assigned_to field
UPDATE tasks 
SET assignees = ARRAY[assigned_to]::UUID[]
WHERE assigned_to IS NOT NULL AND assignees IS NULL;

-- Create a function to keep assignees and assigned_to in sync
CREATE OR REPLACE FUNCTION sync_task_assignees()
RETURNS TRIGGER AS $$
BEGIN
    -- If assignees is updated, set assigned_to to the first assignee for backward compatibility
    IF TG_OP = 'UPDATE' AND OLD.assignees IS DISTINCT FROM NEW.assignees THEN
        IF NEW.assignees IS NOT NULL AND array_length(NEW.assignees, 1) > 0 THEN
            NEW.assigned_to = NEW.assignees[1];
        ELSE
            NEW.assigned_to = NULL;
        END IF;
    END IF;
    
    -- If assigned_to is updated and assignees is not being updated, sync assignees
    IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND OLD.assignees = NEW.assignees THEN
        IF NEW.assigned_to IS NOT NULL THEN
            NEW.assignees = ARRAY[NEW.assigned_to]::UUID[];
        ELSE
            NEW.assignees = NULL;
        END IF;
    END IF;
    
    -- For INSERT operations, sync both fields
    IF TG_OP = 'INSERT' THEN
        IF NEW.assignees IS NOT NULL AND array_length(NEW.assignees, 1) > 0 THEN
            NEW.assigned_to = NEW.assignees[1];
        ELSIF NEW.assigned_to IS NOT NULL AND NEW.assignees IS NULL THEN
            NEW.assignees = ARRAY[NEW.assigned_to]::UUID[];
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync assignees and assigned_to
DROP TRIGGER IF EXISTS sync_task_assignees_trigger ON tasks;
CREATE TRIGGER sync_task_assignees_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION sync_task_assignees();

-- Update the tasks_with_details view to include assignees information
CREATE OR REPLACE VIEW tasks_with_details AS
SELECT 
    t.*,
    p.name as project_name,
    p.client_name,
    tm.full_name as assignee_name,
    tm.slack_username as assignee_username,
    -- Get all assignee details as JSON array
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', tm2.id,
                'full_name', tm2.full_name,
                'slack_username', tm2.slack_username,
                'email', tm2.email,
                'role', tm2.role
            )
        )
        FROM unnest(t.assignees) AS assignee_id
        JOIN team_members tm2 ON tm2.id = assignee_id
        WHERE tm2.is_active = true),
        '[]'::json
    ) as assignee_list,
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

-- Add comment explaining the new fields
COMMENT ON COLUMN tasks.assignees IS 'Array of team member UUIDs assigned to this task. Supports multiple assignees.';
COMMENT ON COLUMN tasks.assigned_to IS 'Primary assignee UUID for backward compatibility. Automatically synced with first assignee from assignees array.';

-- Verify the migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE assignees IS NOT NULL) as tasks_with_assignees,
    COUNT(*) FILTER (WHERE assigned_to IS NOT NULL) as tasks_with_assigned_to
FROM tasks;
