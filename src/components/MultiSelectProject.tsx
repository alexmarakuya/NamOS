import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';

interface MultiSelectProjectProps {
  projects: Project[];
  selectedProjectIds: string[];
  onSelectionChange: (projectIds: string[]) => void;
  placeholder?: string;
  maxDisplay?: number;
  allowMultiple?: boolean; // For backward compatibility, some places might want single selection
}

const MultiSelectProject: React.FC<MultiSelectProjectProps> = ({
  projects,
  selectedProjectIds,
  onSelectionChange,
  placeholder = "Search linked pages...",
  maxDisplay = 3,
  allowMultiple = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProjects = projects.filter(project => selectedProjectIds.includes(project.id));
  const availableProjects = projects.filter(project => 
    !selectedProjectIds.includes(project.id) &&
    (project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     project.client_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleProject = (projectId: string) => {
    if (allowMultiple) {
      if (selectedProjectIds.includes(projectId)) {
        onSelectionChange(selectedProjectIds.filter(id => id !== projectId));
      } else {
        onSelectionChange([...selectedProjectIds, projectId]);
      }
    } else {
      // Single selection mode
      onSelectionChange([projectId]);
      setIsOpen(false);
    }
  };

  const removeProject = (projectId: string) => {
    onSelectionChange(selectedProjectIds.filter(id => id !== projectId));
  };

  const getProjectIcon = (project: Project) => {
    // Generate consistent icons based on project name or type
    const name = project.name || 'Project';
    const firstLetter = name.charAt(0).toUpperCase();
    
    // Different icon styles based on project characteristics
    if (project.client_name?.toLowerCase().includes('acai')) {
      return { type: 'circle', text: firstLetter, color: 'bg-purple-500' };
    } else if (project.name?.toLowerCase().includes('website')) {
      return { type: 'square', text: 'TS', color: 'bg-orange-500' };
    } else if (project.name?.toLowerCase().includes('design')) {
      return { type: 'circle', text: firstLetter, color: 'bg-blue-500' };
    } else if (project.name?.toLowerCase().includes('travel')) {
      return { type: 'square', text: 'CBT', color: 'bg-gray-700' };
    } else if (project.name?.toLowerCase().includes('nam')) {
      return { type: 'image', text: '🌊', color: 'bg-blue-400' };
    }
    
    // Default icon
    return { type: 'square', text: firstLetter, color: 'bg-gray-500' };
  };


  const renderProjectIcon = (project: Project, size: 'sm' | 'md' = 'md') => {
    const icon = getProjectIcon(project);
    const sizeClasses = size === 'sm' ? 'w-5 h-5 text-xs' : 'w-8 h-8 text-sm';
    const borderRadius = icon.type === 'circle' ? 'rounded-full' : 'rounded-md';
    
    return (
      <div className={`${sizeClasses} ${borderRadius} ${icon.color} flex items-center justify-center text-white font-medium`}>
        {icon.text}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Projects Display */}
      <div 
        className="w-full min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap items-center gap-2">
          {selectedProjects.length === 0 ? (
            <span className="text-gray-500 text-sm font-dm-sans">{placeholder}</span>
          ) : (
            <>
              {selectedProjects.slice(0, maxDisplay).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center space-x-2 bg-gray-100 rounded-lg px-2 py-1 text-sm"
                >
                  {renderProjectIcon(project, 'sm')}
                  <span className="font-dm-sans text-gray-700">{project.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProject(project.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedProjects.length > maxDisplay && (
                <span className="text-sm text-gray-500 font-dm-sans">
                  +{selectedProjects.length - maxDisplay} more
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-sm border-0 focus:ring-0 font-dm-sans placeholder-gray-400"
                autoFocus
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 font-dm-sans">
                In 📁 Projects
              </div>
            </div>
          </div>

          {/* Selected Projects Section */}
          {selectedProjects.length > 0 && (
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-2 font-dm-sans">SELECTED</div>
              <div className="space-y-2">
                {selectedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center space-x-3 p-2 rounded-lg bg-white border border-gray-200"
                  >
                    {renderProjectIcon(project)}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 font-dm-sans">
                        {project.name}
                      </div>
                      {project.client_name && (
                        <div className="text-xs text-gray-500 font-dm-sans">
                          {project.client_name}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeProject(project.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change Selection Section */}
          {availableProjects.length > 0 && (
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 mb-2 font-dm-sans">CHANGE SELECTION</div>
              <div className="space-y-1">
                {availableProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {renderProjectIcon(project)}
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900 font-dm-sans">
                        {project.name}
                      </div>
                      {project.client_name && (
                        <div className="text-xs text-gray-500 font-dm-sans">
                          {project.client_name}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {availableProjects.length === 0 && searchTerm && (
            <div className="p-4 text-center text-gray-500 text-sm font-dm-sans">
              No projects found matching "{searchTerm}"
            </div>
          )}

          {/* All Selected */}
          {availableProjects.length === 0 && !searchTerm && selectedProjects.length === projects.length && (
            <div className="p-4 text-center text-gray-500 text-sm font-dm-sans">
              All projects selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectProject;
