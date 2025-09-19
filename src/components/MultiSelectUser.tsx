import React, { useState, useRef, useEffect } from 'react';
import { TeamMember } from '../types';

interface MultiSelectUserProps {
  teamMembers: TeamMember[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  placeholder?: string;
  maxDisplay?: number;
}

const MultiSelectUser: React.FC<MultiSelectUserProps> = ({
  teamMembers,
  selectedUserIds,
  onSelectionChange,
  placeholder = "Select as many as you like",
  maxDisplay = 3
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

  const selectedUsers = teamMembers.filter(member => selectedUserIds.includes(member.id));
  const availableUsers = teamMembers.filter(member => 
    !selectedUserIds.includes(member.id) &&
    (member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.slack_username?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: string) => {
    onSelectionChange(selectedUserIds.filter(id => id !== userId));
  };

  const getUserInitials = (user: TeamMember) => {
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user.slack_username?.charAt(0).toUpperCase() || '?';
  };

  const getUserDisplayName = (user: TeamMember) => {
    return user.full_name || user.slack_username || 'Unknown User';
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Users Display */}
      <div 
        className="w-full min-h-[32px] px-2 py-1.5 border border-gray-300 rounded-md focus-within:ring-1 focus-within:ring-orange-500 focus-within:border-transparent cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap items-center gap-1">
          {selectedUsers.length === 0 ? (
            <span className="text-gray-500 text-sm font-dm-sans">{placeholder}</span>
          ) : (
            <>
              {selectedUsers.slice(0, maxDisplay).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-1 bg-gray-100 rounded-full px-1.5 py-0.5 text-xs"
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(user.id)}`}>
                    {getUserInitials(user)}
                  </div>
                  <span className="font-dm-sans text-gray-700">{getUserDisplayName(user)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUser(user.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-0.5 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedUsers.length > maxDisplay && (
                <span className="text-xs text-gray-500 font-dm-sans">
                  +{selectedUsers.length - maxDisplay} more
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-xs border-0 focus:ring-0 font-dm-sans placeholder-gray-400"
              autoFocus
            />
          </div>

          {/* Selected Users Section */}
          {selectedUsers.length > 0 && (
            <div className="p-2 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-1 font-dm-sans">SELECTED</div>
              <div className="space-y-1">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-1.5 rounded-md bg-white border border-gray-200"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(user.id)}`}>
                      {getUserInitials(user)}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-900 font-dm-sans">
                        {getUserDisplayName(user)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="text-gray-400 hover:text-red-500 p-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Users */}
          <div className="max-h-32 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="p-2 text-center text-gray-500 text-xs font-dm-sans">
                {searchTerm ? 'No users found' : 'All users selected'}
              </div>
            ) : (
              <div className="p-1">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="w-full flex items-center space-x-2 p-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(user.id)}`}>
                      {getUserInitials(user)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-xs font-medium text-gray-900 font-dm-sans">
                        {getUserDisplayName(user)}
                      </div>
                      {user.role && (
                        <div className="text-xs text-gray-500 font-dm-sans">
                          {user.role}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectUser;
