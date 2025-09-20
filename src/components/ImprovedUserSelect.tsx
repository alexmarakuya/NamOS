import React from 'react';
import { TeamMember } from '../types';
import HeadlessDropdown, { DropdownOption } from './HeadlessDropdown';
import HeadlessMultiSelect, { MultiSelectOption } from './HeadlessMultiSelect';

interface ImprovedUserSelectProps {
  teamMembers: TeamMember[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  maxDisplay?: number;
  error?: boolean;
  className?: string;
}

const ImprovedUserSelect: React.FC<ImprovedUserSelectProps> = ({
  teamMembers,
  selectedUserIds,
  onSelectionChange,
  label = "Assignee",
  placeholder = "Select user...",
  multiple = false,
  maxDisplay = 3,
  error = false,
  className = ""
}) => {
  // Convert TeamMember to dropdown option format
  const options: MultiSelectOption[] = teamMembers.map(member => ({
    id: member.id,
    name: member.full_name || member.slack_username || 'Unknown User',
    initials: getInitials(member),
    color: getAvatarColor(member.id),
    disabled: !member.is_active
  }));

  const selectedOptions = options.filter(option => 
    selectedUserIds.includes(option.id)
  );

  const getInitials = (member: TeamMember) => {
    if (member.full_name) {
      return member.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return member.slack_username?.charAt(0).toUpperCase() || '?';
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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

export default ImprovedUserSelect;
