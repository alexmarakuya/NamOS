import React, { useState, useMemo } from 'react';
import { Project, TeamMember } from '../types';
import { useUrgentTasks, useProjectTaskStats } from '../hooks/useSupabase';

interface ProjectsPageProps {
  projects: Project[];
  teamMembers: TeamMember[];
  activeStatFilter?: string | null;
  onProjectSelect?: (projectId: string) => void;
}

type ProjectStatus = 'all' | 'active' | 'upcoming' | 'completed' | 'on_hold';

const ProjectsPage: React.FC<ProjectsPageProps> = ({ 
  projects, 
  teamMembers, 
  activeStatFilter,
  onProjectSelect 
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { urgentTasks, loading: urgentTasksLoading } = useUrgentTasks();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all');
  const [groupBy, setGroupBy] = useState<'client' | 'status'>('client');


  // Filter projects by stat filter only
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    // Apply stat filter if active
    if (activeStatFilter) {
      filtered = projects.filter(project => {
        const projectStatus = project.status || (project.is_active ? 'active' : 'completed');
        
        switch (activeStatFilter) {
          case 'all':
            // All projects except completed
            return projectStatus !== 'completed';
          case 'overdue':
            // Projects with deadlines in the past
            return project.deadline && new Date(project.deadline) < new Date();
          case 'updates':
            // Projects updated in the last 7 days
            return project.updated_at && new Date(project.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          case 'mentions':
            // Projects with @ mentions in name or description
            return project.description?.includes('@') || project.name?.includes('@');
          case 'time_sensitive':
            // Filter projects with deadlines within 7 days (legacy support)
            if (!project.deadline) return false;
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            const deadline = new Date(project.deadline);
            return deadline <= sevenDaysFromNow;
          default:
            return projectStatus === activeStatFilter;
        }
      });
    }
    
    return filtered;
  }, [projects, activeStatFilter]);

  // Group projects by client or status
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const groupedProjects = useMemo(() => {
    if (groupBy === 'status') {
      return filteredProjects.reduce((grouped: { [status: string]: Project[] }, project) => {
        const status = project.status || (project.is_active ? 'active' : 'completed');
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
        if (!grouped[statusLabel]) {
          grouped[statusLabel] = [];
        }
        grouped[statusLabel].push(project);
        return grouped;
      }, {});
    } else {
      return filteredProjects.reduce((grouped: { [clientName: string]: Project[] }, project) => {
        const clientName = project.client_name || 'Other';
        if (!grouped[clientName]) {
          grouped[clientName] = [];
        }
        grouped[clientName].push(project);
        return grouped;
      }, {});
    }
  }, [filteredProjects, groupBy]);

  const getProjectAvatar = (projectName: string) => {
    // Generate a consistent avatar based on project name
    const initials = projectName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    
    // Generate consistent colors based on project name
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    
    const colorIndex = projectName.length % colors.length;
    return {
      initials,
      colorClass: colors[colorIndex]
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusBadge = (project: Project) => {
    const status = project.status || (project.is_active ? 'active' : 'completed');
    const statusConfig = {
      urgent: { label: 'Urgent', bgColor: 'bg-red-100', textColor: 'text-red-800', dotColor: 'bg-red-500' },
      active: { label: 'Active', bgColor: 'bg-green-100', textColor: 'text-green-800', dotColor: 'bg-green-500' },
      upcoming: { label: 'Upcoming', bgColor: 'bg-blue-100', textColor: 'text-blue-800', dotColor: 'bg-blue-500' },
      completed: { label: 'Completed', bgColor: 'bg-gray-100', textColor: 'text-gray-800', dotColor: 'bg-gray-500' },
      on_hold: { label: 'On Hold', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', dotColor: 'bg-yellow-500' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        <div className={`w-1 h-1 rounded-full ${config.dotColor} mr-1`}></div>
        {config.label}
      </div>
    );
  };

  const TaskStatsDisplay: React.FC<{ projectId: string; compact?: boolean }> = ({ projectId, compact = false }) => {
    const { taskStats, loading } = useProjectTaskStats(projectId);

    if (loading) {
      return (
        <div className="flex items-center text-xs text-gray-400 font-epilogue">
          <svg className="w-3 h-3 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      );
    }

    const activeTasksCount = taskStats.todo + taskStats.in_progress + taskStats.review;
    
    if (taskStats.total === 0) {
      return compact ? (
        <span className="text-xs text-gray-400 font-epilogue">0</span>
      ) : (
        <div className="flex items-center text-xs text-gray-500 font-epilogue">
          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          No tasks yet
        </div>
      );
    }

    if (compact) {
      return (
        <span className="text-xs text-gray-600 font-epilogue font-medium">
          {taskStats.total}
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2 text-xs font-epilogue">
        {taskStats.in_progress > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
            <span className="text-blue-700">{taskStats.in_progress} in progress</span>
          </div>
        )}
        {taskStats.review > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
            <span className="text-yellow-700">{taskStats.review} review</span>
          </div>
        )}
        {taskStats.todo > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-gray-500 mr-1"></div>
            <span className="text-gray-600">{taskStats.todo} to do</span>
          </div>
        )}
        {activeTasksCount === 0 && taskStats.done > 0 && (
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
            <span className="text-green-700">All {taskStats.done} completed</span>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="p-6 rounded-[28px]" style={{ backgroundColor: 'rgb(252, 252, 250)' }}>
      <div className="space-y-6">
        {/* View Toggle */}
        <div className="flex items-center justify-start">
        <div className="flex bg-neutral-100 rounded-xl p-1">
          <button
            onClick={() => setGroupBy('status')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 font-epilogue flex items-center gap-2 rounded-lg ${
              groupBy === 'status'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status
          </button>
          <button
            onClick={() => setGroupBy('client')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 font-epilogue flex items-center gap-2 rounded-lg ${
              groupBy === 'client'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Client
          </button>
        </div>
      </div>

      {/* Content Area - No Scroll */}
      <div className="space-y-6">
        {/* Urgent Tasks Section */}
        {urgentTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-6 flex-shrink-0">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 font-epilogue">Urgent Tasks</h2>
              <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {urgentTasks.length} task{urgentTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-3">
              {urgentTasks.slice(0, 5).map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                const daysUntilDue = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          isOverdue ? 'bg-red-500' : 
                          task.priority === 'high' ? 'bg-orange-500' : 
                          'bg-yellow-500'
                        }`}></div>
                        <div>
                          <h3 className="font-medium text-gray-900 font-epilogue">{task.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            {task.projects && (
                              <span>{task.projects.name}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {task.due_date && (
                        <div className={`text-sm font-medium ${
                          isOverdue ? 'text-red-600' : 
                          daysUntilDue !== null && daysUntilDue <= 1 ? 'text-orange-600' : 
                          'text-gray-600'
                        }`}>
                          {isOverdue ? 'Overdue' : 
                           daysUntilDue === 0 ? 'Due today' :
                           daysUntilDue === 1 ? 'Due tomorrow' :
                           `${daysUntilDue} days`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {urgentTasks.length > 5 && (
                <div className="text-center pt-2">
                  <span className="text-sm text-gray-500">
                    +{urgentTasks.length - 5} more urgent task{urgentTasks.length - 5 !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Projects Kanban Board */}
          <div className={`hidden lg:grid lg:gap-6 h-full lg:grid-cols-5`}>
          {/* Desktop: Grid layout that fills full width */}
          {/* Dynamic Columns based on groupBy */}
          {groupBy === 'status' ? (
            // Status Columns
            [
              { key: 'urgent', title: 'Urgent', color: '#EF4444' },
              { key: 'upcoming', title: 'Upcoming', color: '#3B82F6' },
              { key: 'active', title: 'Active', color: '#10B981' },
              { key: 'on_hold', title: 'On Hold', color: '#F59E0B' },
              { key: 'completed', title: 'Completed', color: '#6B7280' }
            ].map(column => {
              const columnProjects = filteredProjects.filter(project => {
                const projectStatus = project.status || (project.is_active ? 'active' : 'completed');
                return projectStatus === column.key;
              });

              return (
                <div key={column.key} className="flex flex-col rounded-2xl p-4" style={{ backgroundColor: 'rgb(248, 247, 244)' }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <h3 className="font-medium text-gray-900 font-epilogue">{column.title}</h3>
                      <span className="text-gray-500 text-xs">
                        {columnProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {columnProjects.map((project) => {
                      const avatar = getProjectAvatar(project.name);
                      
                      return (
                        <div
                          key={project.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                          onClick={() => onProjectSelect && onProjectSelect(project.id)}
                        >
                          {/* Project Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              {/* Project Avatar */}
                              <div className={`w-8 h-8 rounded-lg ${avatar.colorClass} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white font-bold text-xs font-epilogue">
                                  {avatar.initials}
                                </span>
                              </div>
                              
                              {/* Project Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 font-epilogue line-clamp-2 leading-tight">
                                  {project.name}
                                </h4>
                                {project.client_name && (
                                  <p className="text-xs text-gray-500 font-epilogue mt-1">
                                    {project.client_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Task Count - shown on right when space allows */}
                            <div className="ml-2 flex-shrink-0">
                              <TaskStatsDisplay projectId={project.id} compact={true} />
                            </div>
                          </div>

                          {/* Project Details */}
                          <div className="space-y-2">
                            {/* Status */}
                            <div>
                              {getStatusBadge(project)}
                            </div>
                            
                            {/* Business Unit */}
                            {project.business_unit && (
                              <div className="flex items-center text-xs text-gray-600 font-epilogue">
                                <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">{project.business_unit.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty State for Column */}
                    {columnProjects.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-xs font-epilogue">No {column.title.toLowerCase()} projects</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Client Columns
            Object.entries(groupedProjects).slice(0, 4).map(([clientName, clientProjects]) => {
              const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
              const colorIndex = Object.keys(groupedProjects).indexOf(clientName) % colors.length;
              
              return (
                <div key={clientName} className="flex flex-col rounded-2xl p-4" style={{ backgroundColor: 'rgb(248, 247, 244)' }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[colorIndex] }}
                      />
                      <h3 className="font-medium text-gray-900 font-epilogue">{clientName}</h3>
                      <span className="text-gray-500 text-xs">
                        {clientProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {clientProjects.map((project) => {
                      const avatar = getProjectAvatar(project.name);
                      
                      return (
                        <div
                          key={project.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                          onClick={() => onProjectSelect && onProjectSelect(project.id)}
                        >
                          {/* Project Header */}
                          <div className="flex items-start space-x-3 mb-3">
                            {/* Project Avatar */}
                            <div className={`w-8 h-8 rounded-lg ${avatar.colorClass} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white font-bold text-xs font-epilogue">
                                {avatar.initials}
                              </span>
                            </div>
                            
                            {/* Project Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 font-epilogue line-clamp-2 leading-tight">
                                {project.name}
                              </h4>
                              <p className="text-xs text-gray-500 font-epilogue mt-1">
                                {project.client_name || 'No client'}
                              </p>
                            </div>
                          </div>

                          {/* Project Details */}
                          <div className="space-y-2">
                            {/* Status */}
                            <div>
                              {getStatusBadge(project)}
                            </div>
                            
                            {/* Business Unit */}
                            {project.business_unit && (
                              <div className="flex items-center text-xs text-gray-600 font-epilogue">
                                <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">{project.business_unit.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty State for Column */}
                    {clientProjects.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-xs font-epilogue">No projects for {clientName}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile/Tablet: Horizontal scroll layout */}
        <div className="lg:hidden flex space-x-6 overflow-x-auto pb-4 h-full">
          {/* Dynamic Columns based on groupBy */}
          {groupBy === 'status' ? (
            // Status Columns
            [
              { key: 'urgent', title: 'Urgent', color: '#EF4444' },
              { key: 'upcoming', title: 'Upcoming', color: '#3B82F6' },
              { key: 'active', title: 'Active', color: '#10B981' },
              { key: 'on_hold', title: 'On Hold', color: '#F59E0B' },
              { key: 'completed', title: 'Completed', color: '#6B7280' }
            ].map(column => {
              const columnProjects = filteredProjects.filter(project => {
                const projectStatus = project.status || (project.is_active ? 'active' : 'completed');
                return projectStatus === column.key;
              });

              return (
                <div key={column.key} className={`flex flex-col rounded-2xl p-4 flex-shrink-0 min-w-80 w-80`} style={{ backgroundColor: 'rgb(248, 247, 244)' }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <h3 className="font-medium text-gray-900 font-epilogue">{column.title}</h3>
                      <span className="text-gray-500 text-xs">
                        {columnProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {columnProjects.map((project) => {
                      const avatar = getProjectAvatar(project.name);
                      
                      return (
                        <div
                          key={project.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                          onClick={() => onProjectSelect && onProjectSelect(project.id)}
                        >
                          {/* Project Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              {/* Project Avatar */}
                              <div className={`w-8 h-8 rounded-lg ${avatar.colorClass} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white font-bold text-xs font-epilogue">
                                  {avatar.initials}
                                </span>
                              </div>
                              
                              {/* Project Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 font-epilogue line-clamp-2 leading-tight">
                                  {project.name}
                                </h4>
                                {project.client_name && (
                                  <p className="text-xs text-gray-500 font-epilogue mt-1">
                                    {project.client_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Task Count - shown on right when space allows */}
                            <div className="ml-2 flex-shrink-0">
                              <TaskStatsDisplay projectId={project.id} compact={true} />
                            </div>
                          </div>

                          {/* Project Details */}
                          <div className="space-y-2">
                            {/* Status */}
                            <div>
                              {getStatusBadge(project)}
                            </div>
                            
                            {/* Business Unit */}
                            {project.business_unit && (
                              <div className="flex items-center text-xs text-gray-600 font-epilogue">
                                <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">{project.business_unit.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty State for Column */}
                    {columnProjects.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-xs font-epilogue">No {column.title.toLowerCase()} projects</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Client Columns
            Object.entries(groupedProjects).slice(0, 4).map(([clientName, clientProjects]) => {
              const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
              const colorIndex = Object.keys(groupedProjects).indexOf(clientName) % colors.length;
              
              return (
                <div key={clientName} className="flex flex-col rounded-2xl p-4 min-w-80 w-80 flex-shrink-0" style={{ backgroundColor: 'rgb(248, 247, 244)' }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[colorIndex] }}
                      />
                      <h3 className="font-medium text-gray-900 font-epilogue">{clientName}</h3>
                      <span className="text-gray-500 text-xs">
                        {clientProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {clientProjects.map((project) => {
                      const avatar = getProjectAvatar(project.name);
                      
                      return (
                        <div
                          key={project.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                          onClick={() => onProjectSelect && onProjectSelect(project.id)}
                        >
                          {/* Project Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              {/* Project Avatar */}
                              <div className={`w-8 h-8 rounded-lg ${avatar.colorClass} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white font-bold text-xs font-epilogue">
                                  {avatar.initials}
                                </span>
                              </div>
                              
                              {/* Project Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 font-epilogue line-clamp-2 leading-tight">
                                  {project.name}
                                </h4>
                                {project.client_name && (
                                  <p className="text-xs text-gray-500 font-epilogue mt-1">
                                    {project.client_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Task Count - shown on right when space allows */}
                            <div className="ml-2 flex-shrink-0">
                              <TaskStatsDisplay projectId={project.id} compact={true} />
                            </div>
                          </div>

                          {/* Project Details */}
                          <div className="space-y-2">
                            {/* Status */}
                            <div>
                              {getStatusBadge(project)}
                            </div>
                            
                            {/* Business Unit */}
                            {project.business_unit && (
                              <div className="flex items-center text-xs text-gray-600 font-epilogue">
                                <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">{project.business_unit.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty State for Column */}
                    {clientProjects.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-xs font-epilogue">No projects for {clientName}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProjectsPage;