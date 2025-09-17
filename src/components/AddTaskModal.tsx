import React, { useState, useRef, useEffect } from 'react';
import { Task, Project, TeamMember } from '../types';

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

  // State for multiple assignees
  const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
  
  // Dropdown states
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  
  // Refs for click outside handling
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setPriorityDropdownOpen(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setAssigneeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
      title: formData.title,
      description: formData.description || undefined,
      project_id: formData.project_id || undefined,
      assigned_to: assignedMembers.length > 0 ? assignedMembers[0] : (formData.assigned_to || undefined), // For now, use first assignee
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

  // Handle multiple assignee selection
  const toggleAssignee = (memberId: string) => {
    setAssignedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const removeAssignee = (memberId: string) => {
    setAssignedMembers(prev => prev.filter(id => id !== memberId));
  };

  // Get display names for dropdowns
  const getProjectDisplayName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 'Select project...';
    return project.client_name ? `${project.client_name}: ${project.name}` : project.name;
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap = {
      'backlog': 'Backlog',
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'review': 'Review',
      'done': 'Done'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getPriorityDisplayName = (priority: string) => {
    const priorityMap = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'urgent': 'Urgent'
    };
    return priorityMap[priority as keyof typeof priorityMap] || priority;
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-dm-sans"
              placeholder="Enter task title..."
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-dm-sans"
              placeholder="Enter task description..."
            />
          </div>

          {/* Project and Assignee Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project
              </label>
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 font-dm-sans border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className={formData.project_id ? 'text-neutral-900' : 'text-neutral-500'}>
                    {formData.project_id ? getProjectDisplayName(formData.project_id) : 'Select project...'}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {projectDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('project_id', '');
                        setProjectDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 font-dm-sans"
                    >
                      Select project...
                    </button>
                    {projects.map(project => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          handleChange('project_id', project.id);
                          setProjectDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50 font-dm-sans"
                      >
                        {project.client_name ? `${project.client_name}: ${project.name}` : project.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignees
              </label>
              <div className="relative" ref={assigneeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                  className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 font-dm-sans border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className={assignedMembers.length > 0 ? 'text-neutral-900' : 'text-neutral-500'}>
                    {assignedMembers.length > 0 
                      ? `${assignedMembers.length} assignee${assignedMembers.length > 1 ? 's' : ''} selected`
                      : 'Select assignees...'
                    }
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${assigneeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {assigneeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleAssignee(member.id)}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50 font-dm-sans flex items-center justify-between"
                      >
                        <span>{member.full_name || member.slack_username}</span>
                        {assignedMembers.includes(member.id) && (
                          <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected assignees display */}
              {assignedMembers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {assignedMembers.map(memberId => {
                    const member = teamMembers.find(m => m.id === memberId);
                    return member ? (
                      <span
                        key={memberId}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-accent-100 text-accent-800 font-dm-sans"
                      >
                        {member.full_name || member.slack_username}
                        <button
                          type="button"
                          onClick={() => removeAssignee(memberId)}
                          className="ml-1 text-accent-600 hover:text-accent-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Status and Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 font-dm-sans border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className="text-neutral-900">
                    {getStatusDisplayName(formData.status)}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                    {['backlog', 'todo', 'in_progress', 'review', 'done'].map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          handleChange('status', status);
                          setStatusDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50 font-dm-sans"
                      >
                        {getStatusDisplayName(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="relative" ref={priorityDropdownRef}>
                <button
                  type="button"
                  onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                  className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 font-dm-sans border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className="text-neutral-900">
                    {getPriorityDisplayName(formData.priority)}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${priorityDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {priorityDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                    {['low', 'medium', 'high', 'urgent'].map(priority => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => {
                          handleChange('priority', priority);
                          setPriorityDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-900 hover:bg-neutral-50 font-dm-sans"
                      >
                        {getPriorityDisplayName(priority)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Due Date and Estimated Hours Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                id="due_date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-dm-sans"
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                id="estimated_hours"
                min="0"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => handleChange('estimated_hours', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-dm-sans"
                placeholder="0.0"
              />
            </div>
          </div>


          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-sm text-sm font-medium text-neutral-500 hover:text-neutral-600 bg-transparent border border-neutral-200 hover:border-neutral-300 rounded-lg hover:bg-cream-dark transition-colors font-dm-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-sm text-sm font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors font-dm-sans"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTaskModal;
