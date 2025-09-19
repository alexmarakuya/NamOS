import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Task, Project, TeamMember } from '../types';
import { useTaskOperations, useTimeEntries } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import NotionStyleEditor from './NotionStyleEditor';
import MultiSelectUser from './MultiSelectUser';

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
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(() => {
    // Initialize with current assignees or fallback to single assigned_to
    if (task.assignees && task.assignees.length > 0) {
      return task.assignees;
    } else if (task.assigned_to) {
      return [task.assigned_to];
    }
    return [];
  });
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [timeLogHours, setTimeLogHours] = useState('');
  const [timeLogDescription, setTimeLogDescription] = useState('');
  const [timeLogDate, setTimeLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [saving, setSaving] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'time'>('details');
  const [modalWidth, setModalWidth] = useState(Math.max(640, window.innerWidth * 0.48));
  const [isResizing, setIsResizing] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  // const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { updateTask, deleteTask, loading: taskOperationsLoading } = useTaskOperations();
  const { timeEntries } = useTimeEntries(task.id);

  // Format date helper (commented out as currently unused)
  // const formatDate = (date: Date | string) => {
  //   const d = new Date(date);
  //   return d.toLocaleDateString();
  // };

  // Save handlers
  const handleTitleSave = useCallback(async () => {
    if (title !== task.title) {
      setSaving(prev => ({ ...prev, title: true }));
      try {
        await updateTask(task.id, { title });
        onTaskUpdate(task.id, { title });
        setErrors(prev => ({ ...prev, title: '' }));
      } catch (error) {
        setErrors(prev => ({ ...prev, title: 'Failed to update title' }));
      } finally {
        setSaving(prev => ({ ...prev, title: false }));
      }
    }
    setEditingTitle(false);
  }, [title, task, updateTask, onTaskUpdate]);

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
    setTitle(task.title);
      setEditingTitle(false);
    }
  };

  const handleDescriptionBlur = useCallback(async () => {
    if (description !== task.description) {
      setSaving(prev => ({ ...prev, description: true }));
      try {
        await updateTask(task.id, { description });
        onTaskUpdate(task.id, { description });
        setErrors(prev => ({ ...prev, description: '' }));
      } catch (error) {
        setErrors(prev => ({ ...prev, description: 'Failed to update description' }));
      } finally {
        setSaving(prev => ({ ...prev, description: false }));
      }
    }
  }, [description, task, updateTask, onTaskUpdate]);

  const handleStatusChange = useCallback(async (newStatus: typeof task.status) => {
    setStatus(newStatus);
    setSaving(prev => ({ ...prev, status: true }));
    try {
      await updateTask(task.id, { status: newStatus });
      onTaskUpdate(task.id, { status: newStatus });
      setErrors(prev => ({ ...prev, status: '' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, status: 'Failed to update status' }));
    setStatus(task.status);
    } finally {
      setSaving(prev => ({ ...prev, status: false }));
      setEditingStatus(false);
    }
  }, [task, updateTask, onTaskUpdate]);

  const handlePriorityChange = useCallback(async (newPriority: typeof task.priority) => {
    setPriority(newPriority);
    setSaving(prev => ({ ...prev, priority: true }));
    try {
      await updateTask(task.id, { priority: newPriority });
      onTaskUpdate(task.id, { priority: newPriority });
      setErrors(prev => ({ ...prev, priority: '' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, priority: 'Failed to update priority' }));
    setPriority(task.priority);
    } finally {
      setSaving(prev => ({ ...prev, priority: false }));
      setEditingPriority(false);
    }
  }, [task, updateTask, onTaskUpdate]);

  const handleAssigneesChange = useCallback(async (newAssigneeIds: string[]) => {
    setAssignedUserIds(newAssigneeIds);
    setSaving(prev => ({ ...prev, assignees: true }));
    
    try {
      const updates = {
        assignees: newAssigneeIds,
        assigned_to: newAssigneeIds.length > 0 ? newAssigneeIds[0] : undefined // Keep backward compatibility
      };
      await updateTask(task.id, updates);
      onTaskUpdate(task.id, updates);
      setErrors(prev => ({ ...prev, assignees: '' }));
    } catch (error) {
      console.error('Failed to update assignees:', error);
      setErrors(prev => ({ ...prev, assignees: 'Failed to update assignees' }));
      // Revert on error
      if (task.assignees && task.assignees.length > 0) {
        setAssignedUserIds(task.assignees);
      } else if (task.assigned_to) {
        setAssignedUserIds([task.assigned_to]);
      } else {
        setAssignedUserIds([]);
      }
    } finally {
      setSaving(prev => ({ ...prev, assignees: false }));
    }
  }, [task.id, task.assignees, task.assigned_to, updateTask, onTaskUpdate]);

  const handleTimeLog = async () => {
    if (!timeLogHours || parseFloat(timeLogHours) <= 0) {
      setErrors(prev => ({ ...prev, timeLog: 'Please enter valid hours' }));
      return;
    }

    setSaving(prev => ({ ...prev, timeLog: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .insert({
          task_id: task.id,
          user_id: user.id,
          hours: parseFloat(timeLogHours),
          description: timeLogDescription || `Work on: ${task.title}`,
          date: timeLogDate,
          project_id: task.project_id
        });

      if (error) throw error;

      // Reset form
      setTimeLogHours('');
      setTimeLogDescription('');
      setTimeLogDate(new Date().toISOString().split('T')[0]);
      setShowTimeLog(false);
      setErrors(prev => ({ ...prev, timeLog: '' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, timeLog: 'Failed to log time' }));
    } finally {
      setSaving(prev => ({ ...prev, timeLog: false }));
    }
  };

  const handleDeleteTask = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
        await deleteTask(task.id);
        if (onTaskDelete) {
          onTaskDelete(task.id);
        }
        onClose();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  }, [task.id, deleteTask, onTaskDelete, onClose]);

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 640;
    const maxWidth = window.innerWidth * 0.9;
    
    setModalWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Focus title input when editing starts
  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setErrors({});
    setSaving({});
  }, [task]);

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
          right: modalWidth + 16,
          width: '8px',
          cursor: isResizing ? 'col-resize' : 'col-resize'
        }}
        onMouseDown={handleMouseDown}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="fixed top-0 right-0 bottom-0 bg-white shadow-2xl z-[60] flex flex-col overflow-hidden border-l border-gray-200"
        style={{ width: `${modalWidth}px`, minWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Control Bar - Full Width */}
        <div className="flex-shrink-0 w-full bg-white">
          <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors border-none bg-transparent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowTimeLog(!showTimeLog)}
                className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-dm-sans border-none bg-transparent flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{showTimeLog ? 'Hide Time Log' : 'Log Time'}</span>
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={taskOperationsLoading}
                className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-md transition-colors font-dm-sans border-none bg-transparent disabled:text-gray-300 flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Header - Task Title */}
        <div className="flex-shrink-0 px-12 pt-8 pb-6">
          <div className="mb-2">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                className="text-4xl font-bold text-gray-900 font-dm-sans bg-transparent border-none outline-none w-full p-0"
                  placeholder="Task title..."
                />
              ) : (
                <h1 
                  onClick={() => setEditingTitle(true)}
                className="text-4xl font-bold text-gray-900 font-dm-sans cursor-pointer hover:text-gray-700 transition-colors"
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
        </div>

        {/* Tab Navigation - Notion-like */}
        <div className="flex-shrink-0 px-12 pb-6">
          <div className="flex items-center space-x-6">
            {(['details', 'files', 'time'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-0 py-1 text-base font-medium capitalize transition-colors font-dm-sans border-none bg-transparent ${
                  activeTab === tab
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Notion-like */}
        <div className="flex-1 px-12 pb-12 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Task Properties */}
              <div className="space-y-1">
                {/* Project */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Project</span>
                  </div>
                  <div className="flex-1">
                    <select
                      value={task.project_id}
                      onChange={(e) => {
                        const updates = { project_id: e.target.value };
                        updateTask(task.id, updates);
                        onTaskUpdate(task.id, updates);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-dm-sans text-sm"
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Deadline</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const dateString = e.target.value || undefined;
                        const updateTaskPayload = { due_date: dateString };
                        const onTaskUpdatePayload = { due_date: dateString ? new Date(dateString) : undefined };
                        updateTask(task.id, updateTaskPayload);
                        onTaskUpdate(task.id, onTaskUpdatePayload);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-dm-sans text-sm"
                    />
                  </div>
                </div>

                {/* Assigned To */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Assignees</span>
                  </div>
                  <div className="flex-1">
                    <MultiSelectUser
                      teamMembers={teamMembers}
                      selectedUserIds={assignedUserIds}
                      onSelectionChange={handleAssigneesChange}
                      placeholder="Select as many as you like"
                    />
                    {errors.assignees && (
                      <p className="text-red-500 text-xs mt-1 font-dm-sans">{errors.assignees}</p>
                    )}
                    {saving.assignees && (
                      <p className="text-gray-500 text-xs mt-1 font-dm-sans">Saving...</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Status</span>
                  </div>
                  <div className="flex-1">
                    {editingStatus ? (
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value as typeof task.status)}
                        onBlur={() => setEditingStatus(false)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-dm-sans text-sm"
                        autoFocus
                      >
                        <option value="backlog">Backlog</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">In review</option>
                        <option value="done">Done</option>
                      </select>
                    ) : (
                      <span 
                        className="inline-flex items-center px-0 py-1 text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 rounded-md transition-colors font-dm-sans"
                        onClick={() => setEditingStatus(true)}
                      >
                        {status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Priority</span>
                  </div>
                  <div className="flex-1">
                {editingPriority ? (
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as typeof task.priority)}
                    onBlur={() => setEditingPriority(false)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-dm-sans text-sm"
                    autoFocus
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <span 
                    className="inline-flex items-center px-0 py-1 text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 rounded-md transition-colors font-dm-sans"
                    onClick={() => setEditingPriority(true)}
                  >
                    {priority}
                  </span>
                )}
                  </div>
                </div>

              </div>

              {/* Rich Text Editor - Notion Style */}
              <div className="mt-6">
                <NotionStyleEditor
                  content={description}
                  onChange={setDescription}
                  onBlur={handleDescriptionBlur}
                  placeholder="Write about your task here..."
                />
                    </div>
                  </div>
                )}
          
          {activeTab === 'files' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 font-dm-sans">Files & Attachments</h3>
              <div className="text-gray-500 font-dm-sans">
                File attachments coming soon...
              </div>
            </div>
          )}

          {activeTab === 'time' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 font-dm-sans">Time Tracking</h3>
              
              {showTimeLog && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <h4 className="font-medium text-gray-900 font-dm-sans">Log Time</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 font-dm-sans">
                        Hours
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        value={timeLogHours}
                        onChange={(e) => setTimeLogHours(e.target.value)}
                        className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:border-gray-400 focus:ring-0 bg-transparent text-gray-900 font-dm-sans text-base placeholder-gray-400"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 font-dm-sans">
                        Date
                      </label>
                      <input
                        type="date"
                        value={timeLogDate}
                        onChange={(e) => setTimeLogDate(e.target.value)}
                        className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:border-gray-400 focus:ring-0 bg-transparent text-gray-900 font-dm-sans text-base"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleTimeLog}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-dm-sans text-sm"
                      >
                        Log Time
                      </button>
                    </div>
                  </div>
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-dm-sans">
                      Description
                    </label>
                <textarea
                      value={timeLogDescription}
                      onChange={(e) => setTimeLogDescription(e.target.value)}
                      className="w-full px-0 py-2 border-0 border-b border-gray-200 focus:border-gray-400 focus:ring-0 bg-transparent text-gray-900 font-dm-sans text-base placeholder-gray-400 resize-none"
                      placeholder="What did you work on?"
                      rows={2}
                />
              </div>
                </div>
              )}
              
              {/* Time Entries */}
              <div className="space-y-3">
                {timeEntries?.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 font-dm-sans">
                        {entry.description || 'No description'}
                      </div>
                      <div className="text-xs text-gray-500 font-dm-sans">
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 font-dm-sans">
                      {entry.hours}h
                    </div>
                  </div>
                )) || (
                  <div className="text-sm text-gray-500 py-4 text-center font-dm-sans">
                    No time entries yet. Log your first entry above!
                  </div>
                )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;