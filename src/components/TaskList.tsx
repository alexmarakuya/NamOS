import React, { useState, useMemo } from 'react';
import { Task, Project, TeamMember } from '../types';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  teamMembers: TeamMember[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick: (taskId: string) => void;
}

type SortField = 'title' | 'status' | 'priority' | 'due_date' | 'project' | 'assignee';
type SortDirection = 'asc' | 'desc';

function TaskList({ tasks, projects, teamMembers, onTaskUpdate, onTaskClick }: TaskListProps) {
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          const statusOrder = { backlog: 0, todo: 1, in_progress: 2, review: 3, done: 4 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        case 'priority':
          const priorityOrder = { low: 0, medium: 1, high: 2, urgent: 3 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'due_date':
          aValue = a.due_date ? a.due_date.getTime() : Infinity;
          bValue = b.due_date ? b.due_date.getTime() : Infinity;
          break;
        case 'project':
          const aProject = projects.find(p => p.id === a.project_id);
          const bProject = projects.find(p => p.id === b.project_id);
          aValue = aProject ? (aProject.client_name ? `${aProject.client_name}: ${aProject.name}` : aProject.name) : '';
          bValue = bProject ? (bProject.client_name ? `${bProject.client_name}: ${bProject.name}` : bProject.name) : '';
          break;
        case 'assignee':
          const aAssignee = teamMembers.find(m => m.id === a.assigned_to);
          const bAssignee = teamMembers.find(m => m.id === b.assigned_to);
          aValue = aAssignee ? (aAssignee.full_name || aAssignee.slack_username) : '';
          bValue = bAssignee ? (bAssignee.full_name || bAssignee.slack_username) : '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortField, sortDirection, projects, teamMembers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'backlog': return 'text-gray-600';
      case 'todo': return 'text-blue-600';
      case 'in_progress': return 'text-yellow-600';
      case 'review': return 'text-purple-600';
      case 'done': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '-';
    const project = projects.find(p => p.id === projectId);
    return project ? (project.client_name ? `${project.client_name}: ${project.name}` : project.name) : '-';
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return '-';
    const assignee = teamMembers.find(m => m.id === assigneeId);
    return assignee ? (assignee.full_name || assignee.slack_username) : '-';
  };

  const getAssigneeInitials = (assigneeId?: string) => {
    const name = getAssigneeName(assigneeId);
    if (name === '-') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isOverdue = (task: Task) => {
    return task.due_date && task.due_date < new Date() && task.status !== 'done';
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-neutral-200">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
          <button
            onClick={() => handleSort('title')}
            className="col-span-3 flex items-center space-x-1 text-left hover:text-neutral-700 transition-colors"
          >
            <span>Task</span>
            <SortIcon field="title" />
          </button>
          <button
            onClick={() => handleSort('status')}
            className="col-span-1 flex items-center space-x-1 text-left hover:text-neutral-700 transition-colors"
          >
            <span>Status</span>
            <SortIcon field="status" />
          </button>
          <button
            onClick={() => handleSort('priority')}
            className="col-span-1 flex items-center space-x-1 text-left hover:text-neutral-700 transition-colors"
          >
            <span>Priority</span>
            <SortIcon field="priority" />
          </button>
          <button
            onClick={() => handleSort('project')}
            className="col-span-2 flex items-center space-x-1 text-left hover:text-neutral-700 transition-colors"
          >
            <span>Project</span>
            <SortIcon field="project" />
          </button>
          <button
            onClick={() => handleSort('assignee')}
            className="col-span-2 flex items-center space-x-1 text-left hover:text-neutral-700 transition-colors"
          >
            <span>Assignee</span>
            <SortIcon field="assignee" />
          </button>
          <button
            onClick={() => handleSort('due_date')}
            className="col-span-2 flex items-center space-x-1 text-left hover:text-neutral-700 transition-colors"
          >
            <span>Due Date</span>
            <SortIcon field="due_date" />
          </button>
          <div className="col-span-1 text-center">
            <span>Hours</span>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-neutral-200">
        {sortedTasks.map(task => (
          <div
            key={task.id}
            className="grid grid-cols-12 gap-4 px-6 py-3 transition-colors cursor-pointer"
            onClick={() => onTaskClick(task.id)}
          >
            {/* Task Title & Description */}
            <div className="col-span-3">
              <div className="font-medium text-gray-900 font-epilogue mb-1">
                {task.title}
              </div>
              {task.description && (
                <div className="text-sm text-gray-500 line-clamp-2">
                  {task.description}
                </div>
              )}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs text-blue-600">
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 2 && (
                    <span className="text-xs text-gray-500">+{task.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="col-span-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </span>
            </div>

            {/* Priority */}
            <div className="col-span-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>

            {/* Project */}
            <div className="col-span-2">
              <div className="text-sm text-gray-900 font-medium">
                {getProjectName(task.project_id)}
              </div>
            </div>

            {/* Assignee */}
            <div className="col-span-2">
              <div className="flex items-center space-x-2">
                {task.assigned_to && (
                  <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium">
                    {getAssigneeInitials(task.assigned_to)}
                  </div>
                )}
                <span className="text-sm text-gray-900">
                  {getAssigneeName(task.assigned_to)}
                </span>
              </div>
            </div>

            {/* Due Date */}
            <div className="col-span-2">
              <div className={`text-sm ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                {formatDate(task.due_date)}
                {isOverdue(task) && (
                  <span className="ml-1 text-xs">(Overdue)</span>
                )}
              </div>
            </div>

            {/* Hours */}
            <div className="col-span-1 text-center">
              <div className="text-sm text-gray-900">
                {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
              </div>
              {task.actual_hours && (
                <div className="text-xs text-gray-500">
                  {task.actual_hours}h actual
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedTasks.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500">Get started by creating your first task.</p>
        </div>
      )}
    </div>
  );
}

export default TaskList;
