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
        className="w-full min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap items-center gap-2">
          {selectedUsers.length === 0 ? (
            <span className="text-gray-500 text-sm font-dm-sans">{placeholder}</span>
          ) : (
            <>
              {selectedUsers.slice(0, maxDisplay).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-2 bg-gray-100 rounded-full px-2 py-1 text-sm"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(user.id)}`}>
                    {getUserInitials(user)}
                  </div>
                  <span className="font-dm-sans text-gray-700">{getUserDisplayName(user)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUser(user.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedUsers.length > maxDisplay && (
                <span className="text-sm text-gray-500 font-dm-sans">
                  +{selectedUsers.length - maxDisplay} more
                </span>
              )}
              {selectedUsers.length > 1 && (
                <span className="text-xs text-orange-600 font-dm-sans ml-2">
                  (Only first assignee saved)
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border-0 focus:ring-0 font-dm-sans placeholder-gray-400"
              autoFocus
            />
          </div>

          {/* Selected Users Section */}
          {selectedUsers.length > 0 && (
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-2 font-dm-sans">SELECTED</div>
              <div className="space-y-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded-lg bg-white border border-gray-200"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(user.id)}`}>
                      {getUserInitials(user)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 font-dm-sans">
                        {getUserDisplayName(user)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Users */}
          <div className="max-h-48 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm font-dm-sans">
                {searchTerm ? 'No users found' : 'All users selected'}
              </div>
            ) : (
              <div className="p-2">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(user.id)}`}>
                      {getUserInitials(user)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900 font-dm-sans">
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
