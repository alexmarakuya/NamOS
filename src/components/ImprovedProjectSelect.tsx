import React from 'react';
import { Project } from '../types';
import HeadlessDropdown, { DropdownOption } from './HeadlessDropdown';
import HeadlessMultiSelect, { MultiSelectOption } from './HeadlessMultiSelect';

interface ImprovedProjectSelectProps {
  projects: Project[];
  selectedProjectIds: string[];
  onSelectionChange: (projectIds: string[]) => void;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  maxDisplay?: number;
  error?: boolean;
  className?: string;
}

const ImprovedProjectSelect: React.FC<ImprovedProjectSelectProps> = ({
  projects,
  selectedProjectIds,
  onSelectionChange,
  label = "Project",
  placeholder = "Select project...",
  multiple = false,
  maxDisplay = 3,
  error = false,
  className = ""
}) => {
  // Convert Project to dropdown option format
  const options: MultiSelectOption[] = projects.map(project => ({
    id: project.id,
    name: project.name,
    initials: getProjectInitials(project),
    color: getProjectColor(project),
    disabled: !project.is_active
  }));

  const selectedOptions = options.filter(option => 
    selectedProjectIds.includes(option.id)
  );

  const getProjectInitials = (project: Project) => {
    return project.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProjectColor = (project: Project) => {
    // Determine color based on project type or name
    if (project.name?.toLowerCase().includes('acai')) {
      return 'bg-purple-500';
    } else if (project.name?.toLowerCase().includes('website')) {
      return 'bg-orange-500';
    } else if (project.name?.toLowerCase().includes('design')) {
      return 'bg-blue-500';
    } else if (project.name?.toLowerCase().includes('travel')) {
      return 'bg-gray-700';
    } else if (project.name?.toLowerCase().includes('nam')) {
      return 'bg-blue-400';
    }
    
    // Default color based on project ID
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    const index = project.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (multiple) {
    const handleMultiChange = (newSelectedOptions: MultiSelectOption[]) => {
      onSelectionChange(newSelectedOptions.map(option => option.id));
    };

    return (
      <HeadlessMultiSelect
        label={label}
        options={options}
        value={selectedOptions}
        onChange={handleMultiChange}
        placeholder={placeholder}
        error={error}
        className={className}
        maxDisplay={maxDisplay}
      />
    );
  } else {
    const handleSingleChange = (option: DropdownOption) => {
      onSelectionChange([option.id]);
    };

    return (
      <HeadlessDropdown
        label={label}
        options={options}
        value={selectedOptions[0] || null}
        onChange={handleSingleChange}
        placeholder={placeholder}
        error={error}
        className={className}
      />
    );
  }
};

export default ImprovedProjectSelect;
