import React from 'react';
import { Project, TeamMember } from '../types';

interface TimeFiltersProps {
  projects: Project[];
  teamMembers: TeamMember[];
  activeProjectFilter: string;
  activeUserFilter: string;
  onProjectFilterChange: (filter: string) => void;
  onUserFilterChange: (filter: string) => void;
}

const TimeFilters: React.FC<TimeFiltersProps> = ({
  projects,
  teamMembers,
  activeProjectFilter,
  activeUserFilter,
  onProjectFilterChange,
  onUserFilterChange
}) => {
  const projectOptions = [
    { id: 'all', name: 'All Projects', color: '#171717' },
    ...projects.map(project => ({
      id: project.id,
      name: project.name,
      color: project.business_unit?.color || '#171717'
    }))
  ];

  const userOptions = [
    { id: 'all', name: 'All Team Members', username: 'all' },
    ...teamMembers.map(member => ({
      id: member.id,
      name: member.full_name || member.slack_username,
      username: member.slack_username
    }))
  ];

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
        {/* Project Filter */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-300 mb-2 braun-text">
            Filter by Project
          </label>
            <div className="flex flex-wrap gap-2">
              {projectOptions.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectFilterChange(project.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md braun-text transition-all duration-200 ${
                    activeProjectFilter === project.id
                      ? 'filter-button-active '
                      : 'filter-button'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>

                  {/* Team Member Filter */}
        <div className="flex-1 lg:ml-6">
          <label className="block text-xs font-medium text-neutral-300 mb-2 braun-text">
            Filter by Team Member
          </label>
            <div className="flex flex-wrap gap-2">
              {userOptions.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onUserFilterChange(user.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md braun-text transition-all duration-200 flex items-center space-x-2 ${
                    activeUserFilter === user.id
                      ? 'filter-button-active '
                      : 'filter-button'
                  }`}
                >
                  {user.id !== 'all' && (
                    <div className="flex-shrink-0 h-5 w-5">
                      <div className="h-5 w-5 rounded-full bg-accent-500 flex items-center justify-center">
                        <span className="text-xs font-medium text-white braun-text">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                  <span>{user.name}</span>
                </button>
              ))}
            </div>
          </div>

      </div>
    </div>
  );
};

export default TimeFilters;
