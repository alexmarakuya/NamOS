import React, { useMemo, useState } from 'react';
import { Task, TaskColumn, Project, TeamMember } from '../types';

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  teamMembers: TeamMember[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick: (taskId: string) => void;
  onTimeLog?: (taskId: string) => void;
  onAddTask?: (status: Task['status']) => void;
  isProjectDetail?: boolean;
  // Filter props - when provided, only matching tasks will be shown (but all columns remain visible)
  activeStatFilter?: string | null;
  selectedAssignee?: string;
  selectedProject?: string;
  currentUserId?: string;
}

const COLUMNS: Omit<TaskColumn, 'tasks'>[] = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', color: '#6B7280' },
  { id: 'todo', title: 'To Do', status: 'todo', color: '#3B82F6' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: '#F59E0B' },
  { id: 'review', title: 'Review', status: 'review', color: '#8B5CF6' },
  { id: 'done', title: 'Done', status: 'done', color: '#10B981' }
];

function KanbanBoard({ 
  tasks, 
  projects, 
  teamMembers, 
  onTaskUpdate, 
  onTaskClick, 
  onTimeLog, 
  onAddTask, 
  isProjectDetail = false,
  activeStatFilter,
  selectedAssignee,
  selectedProject,
  currentUserId
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    columnId: string;
    position: number; // -1 for before all tasks, 0+ for after task at index
  } | null>(null);

  // Filter tasks based on provided filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Apply stat filter if active
      let matchesStatFilter = true;
      if (activeStatFilter && activeStatFilter !== 'all') {
        switch (activeStatFilter) {
          case 'my':
            // Tasks assigned to or created by current user
            matchesStatFilter = task.assigned_to === currentUserId || task.created_by === currentUserId;
            break;
          case 'overdue':
            matchesStatFilter = !!(task.due_date && new Date(task.due_date) < new Date());
            break;
          case 'completed':
            matchesStatFilter = task.status === 'done';
            break;
          default:
            matchesStatFilter = true;
        }
      }
      
      // Apply assignee filter
      const assigneeMatch = !selectedAssignee || selectedAssignee === 'all' || task.assigned_to === selectedAssignee;
      
      // Apply project filter (for project detail view)
      const projectMatch = !selectedProject || selectedProject === 'all' || task.project_id === selectedProject;
      
      return matchesStatFilter && assigneeMatch && projectMatch;
    });
  }, [tasks, activeStatFilter, selectedAssignee, selectedProject, currentUserId]);

  // Group filtered tasks by status - ALL columns are always shown
  const columns = useMemo((): TaskColumn[] => {
    return COLUMNS.map(column => ({
      ...column,
      tasks: filteredTasks.filter(task => task.status === column.status)
    }));
  }, [filteredTasks]);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project ? (project.client_name ? `${project.client_name}: ${project.name}` : project.name) : null;
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const assignee = teamMembers.find(m => m.id === assigneeId);
    return assignee ? (assignee.full_name || assignee.slack_username) : null;
  };

  const getAssigneeInitials = (assigneeId?: string) => {
    const name = getAssigneeName(assigneeId);
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    onTaskUpdate(taskId, { status: newStatus });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', (e.currentTarget as HTMLElement).outerHTML);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedTask(null);
    setDraggedOverColumn(null);
    setDropIndicator(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string, columnTasks: Task[]) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedTask) {
      const position = calculateDropPosition(e, columnId, columnTasks);
      // Only update if position actually changed to prevent unnecessary re-renders
      setDropIndicator(prev => {
        if (prev?.columnId === columnId && prev?.position === position) {
          return prev;
        }
        return { columnId, position };
      });
    }
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    // Only update if column actually changed
    setDraggedOverColumn(prev => prev === columnId ? prev : columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the column container, not just a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDraggedOverColumn(null);
      setDropIndicator(null);
    }
  };

  const calculateDropPosition = (e: React.DragEvent, columnId: string, tasks: Task[]) => {
    const container = e.currentTarget as HTMLElement;
    const taskElements = container.querySelectorAll('[data-task-id]');
    const mouseY = e.clientY;
    
    // If no tasks in column, position is -1 (before all)
    if (taskElements.length === 0) {
      return -1;
    }

    for (let i = 0; i < taskElements.length; i++) {
      const taskElement = taskElements[i] as HTMLElement;
      const rect = taskElement.getBoundingClientRect();
      const taskMiddle = rect.top + rect.height / 2;
      
      // If mouse is above the middle of this task, insert before it
      if (mouseY < taskMiddle) {
        return i - 1; // -1 means before first task, 0 means after first task, etc.
      }
    }
    
    // If we get here, mouse is below all tasks
    return taskElements.length - 1;
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault();
    
    if (draggedTask && draggedTask.status !== targetStatus) {
      onTaskUpdate(draggedTask.id, { status: targetStatus });
    }
    
    setDraggedTask(null);
    setDraggedOverColumn(null);
    setDropIndicator(null);
  };

  return (
    <div>
      {/* Desktop: Flex layout with min-width columns and overflow */}
      <div className="hidden lg:flex lg:gap-3 h-full overflow-x-auto scrollbar-hide">
        {columns.map(column => {
          return (
            <div key={column.id} className="flex flex-col rounded-2xl p-3 min-w-[280px] w-[280px] flex-shrink-0 min-h-[800px]" style={{ 
              background: isProjectDetail 
                ? 'linear-gradient(to bottom, #FFFFFF 0%, #F8F8F8 100%)'
                : 'linear-gradient(to bottom, #F8F8F8 0%, #FFFFFF 100%)'
            }}>
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <h3 className="font-medium text-white font-dm-sans">{column.title}</h3>
              <span className="text-neutral-400 text-xs">
                {column.tasks.length}
              </span>
            </div>
            {onAddTask && (
              <button
                onClick={() => onAddTask(column.status)}
                className="btn-icon-sm rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center group"
                title={`Add task to ${column.title}`}
              >
                <svg className="w-3 h-3 text-white group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {/* Tasks */}
          <div 
            className={`space-y-3 flex-1 overflow-y-auto transition-all ${
              draggedOverColumn === column.id ? 'border-2 border-orange-300 bg-orange-50 rounded-xl' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id, column.tasks)}
            onDragEnter={(e) => handleDragEnter(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Drop Indicator Line - Empty Column or Before First Task */}
            {dropIndicator?.columnId === column.id && dropIndicator.position === -1 && (
              <div className="h-0.5 bg-neutral-800 mx-6 mb-3 rounded-full opacity-60"></div>
            )}
            
            {column.tasks.map((task, index) => (
              <div key={task.id}>
                {/* Drop Indicator Line - Before Task */}
                {dropIndicator?.columnId === column.id && dropIndicator.position === index - 1 && (
                  <div className="h-0.5 bg-neutral-800 mx-6 mb-3 rounded-full opacity-60"></div>
                )}
                
                <div
                  data-task-id={task.id}
                  draggable
                  className={`task-card bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-move select-none ${
                    draggedTask?.id === task.id ? 'opacity-50 shadow-lg border-neutral-800' : ''
                  }`}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    // Prevent click when dragging
                    if (draggedTask) return;
                    onTaskClick(task.id);
                  }}
                >
                {/* Task Header */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-base leading-tight font-dm-sans flex-1">
                    {task.title}
                  </h4>
                  <div className="flex items-center space-x-1 ml-2">
                    {/* Priority Badge */}
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Task Description */}
                {task.description && (
                  <p className="text-gray-600 text-sm mb-2 line-clamp-1 leading-tight">
                    {task.description}
                  </p>
                )}

                {/* Task Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    {/* Due Date */}
                    {task.due_date && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="leading-none">{formatDate(task.due_date)}</span>
                      </div>
                    )}

                    {/* Hours */}
                    {task.estimated_hours && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="leading-none">{task.estimated_hours}h</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Time Log Button */}
                    {onTimeLog && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTimeLog(task.id);
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-accent-500 hover:bg-accent-50 transition-colors"
                        title="Log time"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}

                    {/* Assignee Avatar */}
                    {task.assigned_to && (
                      <div 
                        className="w-6 h-6 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-medium"
                        title={getAssigneeName(task.assigned_to) || 'Unknown'}
                      >
                        {getAssigneeInitials(task.assigned_to)}
                      </div>
                    )}
                  </div>
                </div>

                </div>
                
                {/* Drop Indicator Line - After Task */}
                {dropIndicator?.columnId === column.id && dropIndicator.position === index && (
                  <div className="h-0.5 bg-neutral-800 mx-6 mt-3 rounded-full opacity-60"></div>
                )}
              </div>
            ))}

            {/* Empty State */}
            {column.tasks.length === 0 && (
              <div className={`text-center py-8 transition-colors ${
                draggedOverColumn === column.id 
                  ? 'text-neutral-800' 
                  : draggedTask 
                    ? 'text-neutral-400' 
                    : 'text-gray-400'
              }`}>
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">
                  {draggedOverColumn === column.id 
                    ? 'Drop here' 
                    : draggedTask 
                      ? 'Drop zone' 
                      : 'No tasks'
                  }
                </p>
              </div>
            )}
          </div>
          </div>
        );
      })}
      </div>

      {/* Mobile/Tablet: Horizontal scroll layout */}
      <div className="lg:hidden flex space-x-6 overflow-x-auto pb-4 h-full kanban-container p-5">
        {columns.map(column => {
          return (
            <div key={column.id} className="min-w-[280px] w-[280px] h-full flex flex-col flex-shrink-0 kanban-column rounded-2xl p-3 min-h-[800px]" style={{ 
              background: isProjectDetail 
                ? 'linear-gradient(to bottom, #FFFFFF 0%, #F8F8F8 100%)'
                : 'linear-gradient(to bottom, #F8F8F8 0%, #FFFFFF 100%)'
            }}>
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="font-medium text-white font-dm-sans">{column.title}</h3>
                <span className="text-neutral-400 text-xs">
                  {column.tasks.length}
                </span>
              </div>
              {onAddTask && (
                <button
                  onClick={() => onAddTask(column.status)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center group"
                  title={`Add task to ${column.title}`}
                >
                  <svg className="w-3 h-3 text-white group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {/* Tasks */}
            <div 
              className={`
                task-list flex-1 space-y-3 overflow-y-auto transition-all duration-200
                ${draggedOverColumn === column.id ? 'border-2 border-orange-300 bg-orange-50 rounded-xl' : ''}
              `}
              onDragOver={(e) => handleDragOver(e, column.id, column.tasks)}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              {column.tasks.map((task, index) => (
                <div key={task.id}>
                  {/* Drop indicator before task */}
                  {dropIndicator?.columnId === column.id && dropIndicator.position === index && (
                    <div className="h-0.5 bg-blue-400 rounded-full mx-2 mb-2" />
                  )}
                  
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className="task-card bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-move"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 font-dm-sans line-clamp-2">
                        {task.title}
                      </h4>
                      <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                        {task.priority && (
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2 font-dm-sans">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        {task.project_id && (
                          <span className="font-dm-sans">
                            {getProjectName(task.project_id)}
                          </span>
                        )}
                        {task.assigned_to && (
                          <div className="flex items-center space-x-1">
                            <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-white">
                                {getAssigneeName(task.assigned_to)?.charAt(0) || '?'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {task.due_date && (
                          <span className={`font-dm-sans ${
                            new Date(task.due_date) < new Date() ? 'text-red-500' : ''
                          }`}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onTaskClick && onTaskClick(task.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View task details"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          
                          {onTimeLog && (
                            <button
                              onClick={() => onTimeLog(task.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Log time"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Drop indicator after last task */}
              {dropIndicator?.columnId === column.id && dropIndicator.position === column.tasks.length && (
                <div className="h-0.5 bg-blue-400 rounded-full mx-2 mt-2" />
              )}
              
              {/* Empty state */}
              {column.tasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-dm-sans">
                  <p className="text-center">
                    {draggedOverColumn === column.id 
                      ? 'Drop here' 
                      : draggedTask 
                        ? 'Drop zone' 
                        : 'No tasks'
                    }
                  </p>
                </div>
              )}
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KanbanBoard;
