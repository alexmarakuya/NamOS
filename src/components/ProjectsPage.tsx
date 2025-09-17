import React, { useState, useMemo } from 'react';
import { Project, TeamMember } from '../types';

interface ProjectsPageProps {
  projects: Project[];
  teamMembers: TeamMember[];
  activeStatFilter?: string | null;
  groupBy?: 'client' | 'status';
  onProjectSelect?: (projectId: string) => void;
}

type ProjectStatus = 'all' | 'active' | 'upcoming' | 'completed' | 'on_hold';

const ProjectsPage: React.FC<ProjectsPageProps> = ({ 
  projects, 
  teamMembers, 
  activeStatFilter,
  groupBy = 'client',
  onProjectSelect 
}) => {
  // TODO: Replace with actual user ID from auth context when implemented
  const currentUserId = 'current-user';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all');

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
          case 'my':
            // Projects created by or assigned to current user (placeholder logic)
            // TODO: Update when user assignment fields are added to Project interface
            return (projectStatus !== 'completed') && (project.name.toLowerCase().includes('my') || project.description?.toLowerCase().includes('my'));
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
  const groupedProjects = useMemo(() => {
    if (groupBy === 'status') {
      // Group by status
      const groups: { [key: string]: Project[] } = {};
      filteredProjects.forEach(project => {
        const status = project.status || (project.is_active ? 'active' : 'completed');
        if (!groups[status]) groups[status] = [];
        groups[status].push(project);
      });
      return groups;
    } else {
      // Group by client
      const groups: { [key: string]: Project[] } = {};
      filteredProjects.forEach(project => {
        const client = project.client_name || 'No Client';
        if (!groups[client]) groups[client] = [];
        groups[client].push(project);
      });
      return groups;
    }
  }, [filteredProjects, groupBy]);

  return (
    <div className="h-full">
      {/* Kanban Columns */}
      <div className="hidden lg:flex lg:gap-3 h-full overflow-x-auto scrollbar-hide">
          {groupBy === 'status' ? (
            // Status Columns
            [
            { key: 'active', title: 'Active', color: '#10B981' },
              { key: 'upcoming', title: 'Upcoming', color: '#3B82F6' },
              { key: 'on_hold', title: 'On Hold', color: '#F59E0B' },
              { key: 'completed', title: 'Completed', color: '#6B7280' }
            ].map(column => {
            const columnProjects = groupedProjects[column.key] || [];

              return (
              <div key={column.key} className="flex flex-col rounded-2xl p-4 min-w-[280px] w-[280px] flex-shrink-0 min-h-[800px]" style={{ 
                background: 'linear-gradient(to bottom, #F8F8F8 0%, #FFFFFF 100%)'
              }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                    <h3 className="font-medium text-gray-900 font-dm-sans">{column.title}</h3>
                      <span className="text-gray-500 text-xs">
                        {columnProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnProjects.map(project => (
                        <div
                          key={project.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                      onClick={() => onProjectSelect?.(project.id)}
                        >
                          {/* Project Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 text-sm font-dm-sans line-clamp-2 flex-1">
                              {project.name}
                            </h4>
                            {/* Project Type Indicator */}
                            {project.project_type && (
                              <div className={`px-2 py-0.5 rounded-full text-xs font-medium font-dm-sans flex-shrink-0 ${project.project_type === 'ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {project.project_type === 'ongoing' ? 'Ongoing' : 'Fixed'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: column.color }}
                          />
                        </div>
                              </div>
                              
                      {/* Client Name */}
                                {project.client_name && (
                        <p className="text-xs text-gray-500 mb-2 font-dm-sans">
                                    {project.client_name}
                                  </p>
                                )}

                      {/* Project Description */}
                      {project.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2 font-dm-sans">
                          {project.description}
                        </p>
                      )}

                      {/* Project Footer */}
                      <div className="flex items-center text-xs text-gray-500">
                        {project.deadline && (
                          <span className="flex items-center font-dm-sans">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                            </svg>
                            {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                            </div>
                            
                      {/* Team Members */}
                      <div className="flex items-center mt-3 -space-x-1">
                        {/* Show up to 3 team members, then +X indicator */}
                        {teamMembers.slice(0, 3).map((member, index) => (
                          <div
                            key={member.id}
                            className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 10 - index }}
                            title={member.full_name || member.slack_username}
                          >
                            {(member.full_name || member.slack_username || 'U').charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {teamMembers.length > 3 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 6 }}
                            title={`+${teamMembers.length - 3} more members`}
                          >
                            +{teamMembers.length - 3}
                          </div>
                        )}
                        {teamMembers.length === 0 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-400 text-xs font-medium font-dm-sans"
                            title="No team members assigned"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                  ))}

                  {/* Empty state */}
                    {columnProjects.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-dm-sans">
                      <p className="text-center">No projects</p>
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
              <div key={clientName} className="flex flex-col rounded-2xl p-4 min-w-[280px] w-[280px] flex-shrink-0 min-h-[800px]" style={{ 
                background: 'linear-gradient(to bottom, #F8F8F8 0%, #FFFFFF 100%)'
              }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[colorIndex] }}
                      />
                    <h3 className="font-medium text-gray-900 font-dm-sans">{clientName}</h3>
                      <span className="text-gray-500 text-xs">
                        {clientProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                  {clientProjects.map(project => (
                        <div
                          key={project.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                      onClick={() => onProjectSelect?.(project.id)}
                        >
                          {/* Project Header */}
                      <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                          <div className="flex items-start space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 text-sm font-dm-sans line-clamp-2 flex-1">
                                {project.name}
                              </h4>
                            {/* Project Type Indicator */}
                            {project.project_type && (
                              <div className={`px-2 py-0.5 rounded-full text-xs font-medium font-dm-sans flex-shrink-0 ${project.project_type === 'ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {project.project_type === 'ongoing' ? 'Ongoing' : 'Fixed'}
                            </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colors[colorIndex] }}
                          />
                        </div>
                      </div>

                      {/* Project Description */}
                      {project.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2 font-dm-sans">
                          {project.description}
                        </p>
                      )}

                      {/* Project Footer */}
                      <div className="flex items-center text-xs text-gray-500">
                        {project.deadline && (
                          <span className="flex items-center font-dm-sans">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                            </svg>
                            {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                            </div>
                            
                      {/* Team Members */}
                      <div className="flex items-center mt-3 -space-x-1">
                        {/* Show up to 3 team members, then +X indicator */}
                        {teamMembers.slice(0, 3).map((member, index) => (
                          <div
                            key={member.id}
                            className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 10 - index }}
                            title={member.full_name || member.slack_username}
                          >
                            {(member.full_name || member.slack_username || 'U').charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {teamMembers.length > 3 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 6 }}
                            title={`+${teamMembers.length - 3} more members`}
                          >
                            +{teamMembers.length - 3}
                              </div>
                            )}
                        {teamMembers.length === 0 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-400 text-xs font-medium font-dm-sans"
                            title="No team members assigned"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                              </div>
                            )}
                          </div>
                        </div>
                  ))}

                  {/* Empty state */}
                    {clientProjects.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-dm-sans">
                      <p className="text-center">No projects</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex space-x-6 overflow-x-auto pb-4 h-full p-5">
          {groupBy === 'status' ? (
            // Status Columns
            [
            { key: 'active', title: 'Active', color: '#10B981' },
              { key: 'upcoming', title: 'Upcoming', color: '#3B82F6' },
              { key: 'on_hold', title: 'On Hold', color: '#F59E0B' },
              { key: 'completed', title: 'Completed', color: '#6B7280' }
            ].map(column => {
            const columnProjects = groupedProjects[column.key] || [];

              return (
              <div key={column.key} className="min-w-[280px] w-[280px] h-full flex flex-col flex-shrink-0 rounded-2xl p-3 min-h-[800px]" style={{ 
                background: 'linear-gradient(to bottom, #F8F8F8 0%, #FFFFFF 100%)'
              }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                    <h3 className="font-medium text-gray-900 font-dm-sans">{column.title}</h3>
                      <span className="text-gray-500 text-xs">
                        {columnProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnProjects.map(project => (
                        <div
                          key={project.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                      onClick={() => onProjectSelect?.(project.id)}
                        >
                          {/* Project Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 text-sm font-dm-sans line-clamp-2 flex-1">
                              {project.name}
                            </h4>
                            {/* Project Type Indicator */}
                            {project.project_type && (
                              <div className={`px-2 py-0.5 rounded-full text-xs font-medium font-dm-sans flex-shrink-0 ${project.project_type === 'ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {project.project_type === 'ongoing' ? 'Ongoing' : 'Fixed'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: column.color }}
                          />
                        </div>
                              </div>
                              
                      {/* Client Name */}
                                {project.client_name && (
                        <p className="text-xs text-gray-500 mb-2 font-dm-sans">
                                    {project.client_name}
                                  </p>
                                )}

                      {/* Project Description */}
                      {project.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2 font-dm-sans">
                          {project.description}
                        </p>
                      )}

                      {/* Project Footer */}
                      <div className="flex items-center text-xs text-gray-500">
                        {project.deadline && (
                          <span className="flex items-center font-dm-sans">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                            </svg>
                            {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                            </div>
                            
                      {/* Team Members */}
                      <div className="flex items-center mt-3 -space-x-1">
                        {/* Show up to 3 team members, then +X indicator */}
                        {teamMembers.slice(0, 3).map((member, index) => (
                          <div
                            key={member.id}
                            className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 10 - index }}
                            title={member.full_name || member.slack_username}
                          >
                            {(member.full_name || member.slack_username || 'U').charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {teamMembers.length > 3 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 6 }}
                            title={`+${teamMembers.length - 3} more members`}
                          >
                            +{teamMembers.length - 3}
                          </div>
                        )}
                        {teamMembers.length === 0 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-400 text-xs font-medium font-dm-sans"
                            title="No team members assigned"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                  ))}

                  {/* Empty state */}
                    {columnProjects.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-dm-sans">
                      <p className="text-center">No projects</p>
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
              <div key={clientName} className="min-w-[280px] w-[280px] h-full flex flex-col flex-shrink-0 rounded-2xl p-3 min-h-[800px]" style={{ 
                background: 'linear-gradient(to bottom, #F8F8F8 0%, #FFFFFF 100%)'
              }}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[colorIndex] }}
                      />
                    <h3 className="font-medium text-gray-900 font-dm-sans">{clientName}</h3>
                      <span className="text-gray-500 text-xs">
                        {clientProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Projects in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                  {clientProjects.map(project => (
                        <div
                          key={project.id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                      onClick={() => onProjectSelect?.(project.id)}
                        >
                          {/* Project Header */}
                      <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                          <div className="flex items-start space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 text-sm font-dm-sans line-clamp-2 flex-1">
                                  {project.name}
                                </h4>
                            {/* Project Type Indicator */}
                            {project.project_type && (
                              <div className={`px-2 py-0.5 rounded-full text-xs font-medium font-dm-sans flex-shrink-0 ${project.project_type === 'ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {project.project_type === 'ongoing' ? 'Ongoing' : 'Fixed'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: colors[colorIndex] }}
                          />
                              </div>
                            </div>
                            
                      {/* Project Description */}
                      {project.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2 font-dm-sans">
                          {project.description}
                        </p>
                      )}

                      {/* Project Footer */}
                      <div className="flex items-center text-xs text-gray-500">
                        {project.deadline && (
                          <span className="flex items-center font-dm-sans">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                            </svg>
                            {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                            </div>

                      {/* Team Members */}
                      <div className="flex items-center mt-3 -space-x-1">
                        {/* Show up to 3 team members, then +X indicator */}
                        {teamMembers.slice(0, 3).map((member, index) => (
                          <div
                            key={member.id}
                            className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 10 - index }}
                            title={member.full_name || member.slack_username}
                          >
                            {(member.full_name || member.slack_username || 'U').charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {teamMembers.length > 3 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium font-dm-sans"
                            style={{ zIndex: 6 }}
                            title={`+${teamMembers.length - 3} more members`}
                          >
                            +{teamMembers.length - 3}
                            </div>
                        )}
                        {teamMembers.length === 0 && (
                          <div
                            className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-400 text-xs font-medium font-dm-sans"
                            title="No team members assigned"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                  ))}

                  {/* Empty state */}
                    {clientProjects.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-dm-sans">
                      <p className="text-center">No projects</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
      </div>
    </div>
  );
};

export default ProjectsPage;