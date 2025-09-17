import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Task, Project, TeamMember } from '../types';
import { useTaskOperations, useTimeEntries } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';

interface TaskDetailModalProps {
  task: Task;
  projects: Project[];
  teamMembers: TeamMember[];
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  projects,
  teamMembers,
  isOpen,
  onClose,
  onTaskUpdate,
  onTaskDelete
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [assignees, setAssignees] = useState<string[]>(task.assignees || (task.assigned_to ? [task.assigned_to] : []));
  const [followers, setFollowers] = useState<string[]>(task.followers || []);
  const [editingAssignees, setEditingAssignees] = useState(false);
  const [editingFollowers, setEditingFollowers] = useState(false);
  const [projectId, setProjectId] = useState(task.project_id || '');
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [timeLogHours, setTimeLogHours] = useState('');
  const [timeLogDescription, setTimeLogDescription] = useState('');
  const [timeLogDate, setTimeLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [saving, setSaving] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'time'>('details');
  const [modalWidth, setModalWidth] = useState(Math.max(800, window.innerWidth * 0.6)); // At least half screen width
  const [isResizing, setIsResizing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { deleteTask, loading: taskOperationsLoading } = useTaskOperations();
  const { timeEntries, loading: timeEntriesLoading } = useTimeEntries(task.project_id);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setAssignedTo(task.assigned_to || '');
    setProjectId(task.project_id || '');
    setPriority(task.priority);
    setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
  }, [task]);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  // Resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX - 16; // Account for right margin
    const minWidth = 400;
    const maxWidth = window.innerWidth * 0.8;
    
    setModalWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const validateTitle = (value: string): string | null => {
    if (!value.trim()) return 'Title is required';
    if (value.trim().length < 3) return 'Title must be at least 3 characters';
    if (value.trim().length > 200) return 'Title must be less than 200 characters';
    return null;
  };

  const handleTitleSave = async () => {
    const trimmedTitle = title.trim();
    const error = validateTitle(trimmedTitle);
    
    if (error) {
      setErrors(prev => ({ ...prev, title: error }));
      return;
    }
    
    setErrors(prev => ({ ...prev, title: '' }));
    
    if (trimmedTitle !== task.title) {
      setSaving(prev => ({ ...prev, title: true }));
      try {
        await onTaskUpdate(task.id, { title: trimmedTitle });
        setTitle(trimmedTitle);
      } catch (error) {
        setErrors(prev => ({ ...prev, title: 'Failed to save title' }));
        setTitle(task.title); // Revert on error
      } finally {
        setSaving(prev => ({ ...prev, title: false }));
      }
    }
    
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitle(task.title);
      setEditingTitle(false);
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      onTaskUpdate(task.id, { description });
    }
  };

  const handleStatusChange = (newStatus: typeof task.status) => {
    setStatus(newStatus);
    setEditingStatus(false);
    onTaskUpdate(task.id, { status: newStatus });
  };

  const handleAssigneeChange = (newAssignee: string) => {
    setAssignedTo(newAssignee);
    setEditingAssignee(false);
    
    // Update assignees array to include main assignee
    const newAssignees = newAssignee ? [newAssignee, ...assignees.filter(id => id !== newAssignee)] : assignees.filter(id => id !== assignedTo);
    setAssignees(newAssignees);
    
    onTaskUpdate(task.id, { 
      assigned_to: newAssignee || undefined,
      assignees: newAssignees
    });
  };

  const handleAddAssignee = (memberId: string) => {
    if (!assignees.includes(memberId)) {
      const newAssignees = [...assignees, memberId];
      setAssignees(newAssignees);
      onTaskUpdate(task.id, { assignees: newAssignees });
    }
  };

  const handleRemoveAssignee = (memberId: string) => {
    const newAssignees = assignees.filter(id => id !== memberId);
    setAssignees(newAssignees);
    
    // If removing main assignee, update it too
    if (memberId === assignedTo) {
      const newMainAssignee = newAssignees[0] || '';
      setAssignedTo(newMainAssignee);
      onTaskUpdate(task.id, { 
        assigned_to: newMainAssignee || undefined,
        assignees: newAssignees
      });
    } else {
      onTaskUpdate(task.id, { assignees: newAssignees });
    }
  };

  const handleAddFollower = (memberId: string) => {
    if (!followers.includes(memberId)) {
      const newFollowers = [...followers, memberId];
      setFollowers(newFollowers);
      onTaskUpdate(task.id, { followers: newFollowers });
    }
  };

  const handleRemoveFollower = (memberId: string) => {
    const newFollowers = followers.filter(id => id !== memberId);
    setFollowers(newFollowers);
    onTaskUpdate(task.id, { followers: newFollowers });
  };

  const handleProjectChange = (newProject: string) => {
    setProjectId(newProject);
    setEditingProject(false);
    onTaskUpdate(task.id, { project_id: newProject || undefined });
  };

  const handlePriorityChange = (newPriority: typeof task.priority) => {
    setPriority(newPriority);
    setEditingPriority(false);
    onTaskUpdate(task.id, { priority: newPriority });
  };

  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);
    setEditingDueDate(false);
    onTaskUpdate(task.id, { due_date: newDueDate ? new Date(newDueDate) : undefined });
  };

  const validateTimeLog = (): string | null => {
    if (!timeLogHours) return 'Hours is required';
    const hours = parseFloat(timeLogHours);
    if (isNaN(hours) || hours <= 0) return 'Hours must be a positive number';
    if (hours > 24) return 'Hours cannot exceed 24 per day';
    if (!timeLogDate) return 'Date is required';
    
    const selectedDate = new Date(timeLogDate);
    const today = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(today.getDate() + 7); // Allow up to 1 week in future
    
    if (selectedDate > maxFutureDate) return 'Date cannot be more than 1 week in the future';
    
    return null;
  };

  const handleTimeLog = async () => {
    const error = validateTimeLog();
    if (error) {
      setErrors(prev => ({ ...prev, timeLog: error }));
      return;
    }

    setErrors(prev => ({ ...prev, timeLog: '' }));
    setSaving(prev => ({ ...prev, timeLog: true }));

    try {
      const { error: dbError } = await supabase
        .from('time_entries')
        .insert({
          task_id: task.id,
          project_id: task.project_id,
          description: timeLogDescription || `Work on: ${task.title}`,
          hours: parseFloat(timeLogHours),
          date: timeLogDate,
          is_billable: true,
          user_id: 'current-user', // TODO: Get from auth context
          user_name: 'Current User' // TODO: Get from auth context
        });

      if (dbError) throw dbError;

      // Reset form
      setTimeLogHours('');
      setTimeLogDescription('');
      setTimeLogDate(new Date().toISOString().split('T')[0]);
      setShowTimeLog(false);

      // Refresh time entries
      window.location.reload(); // TODO: Better state management
    } catch (error) {
      console.error('Failed to log time:', error);
      setErrors(prev => ({ ...prev, timeLog: 'Failed to log time. Please try again.' }));
    } finally {
      setSaving(prev => ({ ...prev, timeLog: false }));
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteTask(task.id);
      onClose();
      // Use callback if provided, otherwise fallback to page reload
      if (onTaskDelete) {
        onTaskDelete(task.id);
      } else {
      window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  // Helper functions
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? (project.client_name ? `${project.client_name}: ${project.name}` : project.name) : 'Unknown Project';
  };

  const getAssigneeName = (assigneeId: string) => {
    const assignee = teamMembers.find(m => m.id === assigneeId);
    return assignee ? (assignee.full_name || assignee.slack_username) : 'Unassigned';
  };

  const getAssigneeInitials = (assigneeId: string) => {
    const name = getAssigneeName(assigneeId);
    if (name === 'Unassigned') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'backlog': return 'bg-gray-100 text-gray-800';
      case 'todo': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isOverdue = (dueDate: Date | string | undefined) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
      onClick={handleBackdropClick}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Resize Handle */}
      <div
        className="fixed top-4 bottom-4 bg-transparent hover:bg-blue-200 hover:bg-opacity-30 transition-colors cursor-col-resize z-[61] rounded-l-lg"
        style={{ 
          right: modalWidth + 16, // Account for right margin
          width: '8px',
          cursor: isResizing ? 'col-resize' : 'col-resize'
        }}
        onMouseDown={handleMouseDown}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="fixed top-4 right-4 bottom-4 bg-white shadow-2xl z-[60] rounded-2xl flex flex-col overflow-hidden"
        style={{ width: `${modalWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Header - Full Width */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="text-2xl font-bold text-gray-900 font-dm-sans bg-transparent border-none outline-none w-full"
                placeholder="Task title..."
              />
            ) : (
              <h1 
                onClick={() => setEditingTitle(true)}
                className="text-2xl font-bold text-gray-900 font-dm-sans cursor-pointer hover:text-gray-700 transition-colors truncate"
              >
                {title || 'Untitled Task'}
                {saving.title && (
                  <svg className="animate-spin ml-2 h-5 w-5 text-gray-400 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </h1>
            )}
            {errors.title && (
              <div className="text-red-500 text-sm mt-1">
                {errors.title}
              </div>
            )}
          </div>
          
        {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <button 
            onClick={handleDeleteTask}
            disabled={taskOperationsLoading}
              className="text-gray-400 hover:text-red-600 disabled:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100"
            title="Delete task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          <button 
            onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex h-full min-h-0">
          {/* Left Sidebar - Task Metadata */}
          <div className="w-60 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            {/* Task Properties */}
            <div className="space-y-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Status
                </label>
                {editingStatus ? (
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as typeof task.status)}
                    onBlur={() => setEditingStatus(false)}
                    className={`w-full px-3 py-2 rounded-lg text-sm border border-gray-300 outline-none ${getStatusColor(status)}`}
                    autoFocus
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <div 
                    className={`w-full px-3 py-2 rounded-lg text-sm cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(status)}`}
                    onClick={() => setEditingStatus(true)}
                  >
                    {status.replace('_', ' ')}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Priority
                </label>
                {editingPriority ? (
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as typeof task.priority)}
                    onBlur={() => setEditingPriority(false)}
                    className={`w-full px-3 py-2 rounded-lg text-sm border border-gray-300 outline-none ${getPriorityColor(priority)}`}
                    autoFocus
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <div 
                    className={`w-full px-3 py-2 rounded-lg text-sm cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(priority)}`}
                    onClick={() => setEditingPriority(true)}
                  >
                    {priority}
                  </div>
                )}
              </div>

              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Project
                </label>
                {editingProject ? (
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    onBlur={() => setEditingProject(false)}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 outline-none bg-white"
                    autoFocus
                  >
                    <option value="">No Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.client_name ? `${project.client_name}: ${project.name}` : project.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div 
                    className="w-full px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors bg-white border border-gray-200"
                    onClick={() => setEditingProject(true)}
                  >
                    {projectId ? getProjectName(projectId) : 'No Project'}
                  </div>
                )}
              </div>

              {/* Main Assignee */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Main Assignee
                </label>
                {editingAssignee ? (
                  <select
                    value={assignedTo}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    onBlur={() => setEditingAssignee(false)}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 outline-none bg-white"
                    autoFocus
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.slack_username}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div 
                    className="w-full px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors bg-white border border-gray-200 flex items-center space-x-2"
                    onClick={() => setEditingAssignee(true)}
                  >
                    <div className="w-5 h-5 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-medium">
                      {assignedTo ? getAssigneeInitials(assignedTo) : '?'}
                    </div>
                    <span>{assignedTo ? getAssigneeName(assignedTo) : 'Unassigned'}</span>
                  </div>
                )}
              </div>

              {/* Additional Assignees */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Additional Assignees
                </label>
                <div className="space-y-2">
                  {assignees.filter(id => id !== assignedTo).map(assigneeId => (
                    <div key={assigneeId} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-medium">
                          {getAssigneeInitials(assigneeId)}
                        </div>
                        <span className="text-sm">{getAssigneeName(assigneeId)}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignee(assigneeId)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {editingAssignees ? (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddAssignee(e.target.value);
                          setEditingAssignees(false);
                        }
                      }}
                      onBlur={() => setEditingAssignees(false)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 outline-none bg-white"
                      autoFocus
                    >
                      <option value="">Select assignee...</option>
                      {teamMembers.filter(member => !assignees.includes(member.id)).map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.slack_username}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingAssignees(true)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    >
                      + Add assignee
                    </button>
                  )}
                </div>
              </div>

              {/* Followers */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Followers
                </label>
                <div className="space-y-2">
                  {followers.map(followerId => (
                    <div key={followerId} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                          {getAssigneeInitials(followerId)}
                        </div>
                        <span className="text-sm">{getAssigneeName(followerId)}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFollower(followerId)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {editingFollowers ? (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFollower(e.target.value);
                          setEditingFollowers(false);
                        }
                      }}
                      onBlur={() => setEditingFollowers(false)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 outline-none bg-white"
                      autoFocus
                    >
                      <option value="">Select follower...</option>
                      {teamMembers.filter(member => !followers.includes(member.id) && !assignees.includes(member.id)).map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.slack_username}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingFollowers(true)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    >
                      + Add follower
                    </button>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Due Date
                </label>
                {editingDueDate ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    onBlur={() => setEditingDueDate(false)}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 outline-none bg-white"
                    autoFocus
                  />
                ) : (
                  <div 
                    className={`w-full px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors bg-white border border-gray-200 ${
                      dueDate && isOverdue(dueDate) ? 'text-red-600 font-medium border-red-200 bg-red-50' : ''
                    }`}
                    onClick={() => setEditingDueDate(true)}
                  >
                    {dueDate ? (
                      <>
                        📅 {formatDate(dueDate)}
                        {isOverdue(dueDate) && ' (Overdue)'}
                      </>
                    ) : (
                      '📅 No due date'
                    )}
                  </div>
                )}
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={task.estimated_hours || ''}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="0"
                />
              </div>

              {/* Actual Hours */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Actual Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={task.actual_hours || ''}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-gray-50 text-gray-600"
                  placeholder="0"
                  readOnly
                />
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="space-y-2 text-xs text-gray-500">
                <div>Created {formatDate(task.created_at)}</div>
                {task.updated_at && task.updated_at !== task.created_at && (
                  <div>Updated {formatDate(task.updated_at)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-8 overflow-y-auto">

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Task Details
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'files'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setActiveTab('time')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'time'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Time Tracking
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {/* Task Details Tab */}
              {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description - Large text area */}
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                      className="w-full text-gray-700 leading-relaxed resize-none border border-gray-300 rounded-lg p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ minHeight: '200px' }}
                  placeholder="Add a description..."
                  rows={Math.max(6, description.split('\n').length + 2)}
                />
              </div>


                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No files attached</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by uploading a file.</p>
                    <div className="mt-6">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Upload File
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Tracking Tab */}
              {activeTab === 'time' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Time Tracking</h3>
                    <button
                      onClick={() => setShowTimeLog(!showTimeLog)}
                      className="btn-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      {showTimeLog ? 'Cancel' : 'Log Time'}
                    </button>
                  </div>

                {/* Time Log Form */}
                {showTimeLog && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hours
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={timeLogHours}
                          onChange={(e) => setTimeLogHours(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={timeLogDate}
                          onChange={(e) => setTimeLogDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          &nbsp;
                        </label>
                        <button
                          onClick={handleTimeLog}
                          disabled={saving.timeLog}
                          className="w-full btn-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {saving.timeLog ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Logging...
                            </>
                          ) : (
                            'Log Time'
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={timeLogDescription}
                        onChange={(e) => setTimeLogDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Work on: ${task.title}`}
                      />
                    </div>
                    
                    {/* Time Log Error */}
                    {errors.timeLog && (
                      <div className="text-red-600 text-sm mt-2">
                        {errors.timeLog}
                      </div>
                    )}
                  </div>
                )}

                {/* Time Entries List */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Time Entries</h4>
                  {timeEntriesLoading ? (
                    <div className="text-sm text-gray-500">Loading time entries...</div>
                  ) : (
                    <div className="space-y-2">
                      {timeEntries
                        ?.filter(entry => entry.task_id === task.id)
                        ?.slice(0, 5)
                        ?.map(entry => (
                          <div key={entry.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="text-sm text-gray-900">{entry.description}</div>
                              <div className="text-xs text-gray-500">
                                {formatDate(entry.date)} • {entry.user_name}
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {entry.hours}h
                            </div>
                          </div>
                        )) || (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          No time entries yet. Log your first entry above!
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;
