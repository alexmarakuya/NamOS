import React, { useState } from 'react';
import { Task, Project, TeamMember } from '../types';
import ImprovedUserSelect from './ImprovedUserSelect';
import ImprovedProjectSelect from './ImprovedProjectSelect';
import { FormField, Input, Textarea, Select, Button } from './FormField';

interface AddTaskModalProps {
  projects: Project[];
  teamMembers: TeamMember[];
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  defaultProjectId?: string; // Auto-fill project when creating task inside a project
  defaultStatus?: Task['status']; // Auto-fill status when creating task from column
}

function AddTaskModal({ projects, teamMembers, onClose, onSubmit, defaultProjectId, defaultStatus }: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: defaultProjectId || '',
    assigned_to: '',
    status: defaultStatus || 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    due_date: '',
    estimated_hours: ''
  });

  // State for multiple assignees and projects
  const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(defaultProjectId ? [defaultProjectId] : []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
      title: formData.title,
      description: formData.description || undefined,
      project_id: selectedProjects.length > 0 ? selectedProjects[0] : undefined, // Use selected project
      assigned_to: assignedMembers.length > 0 ? assignedMembers[0] : undefined, // Main assignee for backward compatibility
      assignees: assignedMembers.length > 0 ? assignedMembers : undefined, // Multiple assignees
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date ? new Date(formData.due_date) : undefined,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      created_by: 'current-user' // TODO: Get from auth context
    };

    onSubmit(taskData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-dm-sans">Add New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <FormField label="Task Title" required>
            <Input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter task title..."
            />
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <Textarea
              rows={2}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter task description..."
            />
          </FormField>

          {/* Project and Assignee Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Project */}
            <ImprovedProjectSelect
              projects={projects}
              selectedProjectIds={selectedProjects}
              onSelectionChange={setSelectedProjects}
              label="Project"
              placeholder="Select project..."
              multiple={false}
            />

            {/* Assignees */}
            <ImprovedUserSelect
              teamMembers={teamMembers}
              selectedUserIds={assignedMembers}
              onSelectionChange={setAssignedMembers}
              label="Assignees"
              placeholder="Select assignees..."
              multiple={true}
              maxDisplay={2}
            />
          </div>

          {/* Status and Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Status */}
            <FormField label="Status">
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </Select>
            </FormField>

            {/* Priority */}
            <FormField label="Priority">
              <Select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </FormField>
          </div>

          {/* Due Date and Estimated Hours Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Due Date */}
            <FormField label="Due Date">
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
              />
            </FormField>

            {/* Estimated Hours */}
            <FormField label="Estimated Hours">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => handleChange('estimated_hours', e.target.value)}
                placeholder="0.0"
              />
            </FormField>
          </div>


          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Create Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTaskModal;
