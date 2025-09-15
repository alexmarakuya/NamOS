import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Task, Project, TeamMember } from '../types';
import { useTaskOperations } from '../hooks/useSupabase';

interface TaskDetailModalProps {
  task: Task;
  projects: Project[];
  teamMembers: TeamMember[];
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  projects,
  teamMembers,
  isOpen,
  onClose,
  onTaskUpdate
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [projectId, setProjectId] = useState(task.project_id || '');
  const [priority, setPriority] = useState(task.priority);
  const [modalWidth, setModalWidth] = useState(600); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { deleteTask, loading: taskOperationsLoading } = useTaskOperations();

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setAssignedTo(task.assigned_to || '');
    setProjectId(task.project_id || '');
    setPriority(task.priority);
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

  const handleTitleSave = () => {
    setEditingTitle(false);
    if (title !== task.title) {
      onTaskUpdate(task.id, { title });
    }
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAssigneeChange = (newAssignee: string) => {
    setAssignedTo(newAssignee);
    onTaskUpdate(task.id, { assigned_to: newAssignee || undefined });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleProjectChange = (newProject: string) => {
    setProjectId(newProject);
    onTaskUpdate(task.id, { project_id: newProject || undefined });
  };

  const handlePriorityChange = (newPriority: typeof task.priority) => {
    setPriority(newPriority);
    setEditingPriority(false);
    onTaskUpdate(task.id, { priority: newPriority });
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteTask(task.id);
      onClose();
      // Refresh tasks list - in a real app, you'd update the parent component's state
      window.location.reload();
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
        className="fixed top-4 right-4 bottom-4 bg-white shadow-2xl overflow-y-auto z-[60] rounded-2xl"
        style={{ width: `${modalWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button 
            onClick={handleDeleteTask}
            disabled={taskOperationsLoading}
            className="text-gray-400 hover:text-red-600 disabled:text-gray-300 transition-colors p-2 bg-white rounded-full shadow-sm"
            title="Delete task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 bg-white rounded-full shadow-sm"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Document-style header */}
            <div className="mb-8">
              {/* Title - Editable */}
              {editingTitle ? (
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  className="text-3xl font-bold text-gray-900 font-epilogue bg-transparent border-none outline-none w-full rounded px-2 py-1 -mx-2"
                  style={{ boxShadow: 'none', border: 'none', outline: 'none' }}
                  placeholder="Task title..."
                />
              ) : (
                <h1 
                  className="text-3xl font-bold text-gray-900 font-epilogue cursor-text hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {title}
                </h1>
              )}

              {/* Subtle metadata */}
              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                {task.project_id && (
                  <span>{getProjectName(task.project_id)}</span>
                )}
                
                {/* Priority - Editable */}
                {editingPriority ? (
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as typeof task.priority)}
                    onBlur={() => setEditingPriority(false)}
                    className={`px-2 py-1 rounded text-xs border-none outline-none ${getPriorityColor(priority)}`}
                    style={{ boxShadow: 'none', border: 'none', outline: 'none' }}
                    autoFocus
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <span 
                    className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(priority)}`}
                    onClick={() => setEditingPriority(true)}
                  >
                    {priority}
                  </span>
                )}

                {/* Status - Editable */}
                {editingStatus ? (
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as typeof task.status)}
                    onBlur={() => setEditingStatus(false)}
                    className={`px-2 py-1 rounded text-xs border-none outline-none ${getStatusColor(status)}`}
                    style={{ boxShadow: 'none', border: 'none', outline: 'none' }}
                    autoFocus
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <span 
                    className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(status)}`}
                    onClick={() => setEditingStatus(true)}
                  >
                    {status.replace('_', ' ')}
                  </span>
                )}

                {task.assigned_to && (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-medium">
                      {getAssigneeInitials(task.assigned_to)}
                    </div>
                    <span>{getAssigneeName(task.assigned_to)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main content area - Document-like */}
            <div className="space-y-6">
              {/* Description - Large text area */}
              <div>
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  className="w-full text-gray-700 leading-relaxed resize-none border-none outline-none bg-transparent rounded p-3 -m-3 text-base"
                  style={{ boxShadow: 'none', border: 'none', outline: 'none', minHeight: '200px' }}
                  placeholder="Add a description..."
                  rows={Math.max(6, description.split('\n').length + 2)}
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TaskDetailModal;
