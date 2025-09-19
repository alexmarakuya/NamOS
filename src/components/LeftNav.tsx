import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LeftNavProps {
  activeApp: 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients' | 'users';
  onAppChange: (app: 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients' | 'users') => void;
}

const LeftNav: React.FC<LeftNavProps> = ({ activeApp, onAppChange }) => {
  // Always keep compact - no expansion
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    {
      id: 'projects' as const,
      name: 'Projects',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <path d="M9 9h6m-6 4h6m-6 4h4"></path>
        </svg>
      )
    },
    {
      id: 'tasks' as const,
      name: 'Tasks',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3l8-8"></path>
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.51 0 2.93.37 4.18 1.03"></path>
        </svg>
      )
    },
    {
      id: 'clients' as const,
      name: 'Clients',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    // Temporarily hide financial dashboard
    // {
    //   id: 'financial' as const,
    //   name: 'Financial',
    //   icon: (
    //     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    //       <line x1="18" y1="20" x2="18" y2="10"></line>
    //       <line x1="12" y1="20" x2="12" y2="4"></line>
    //       <line x1="6" y1="20" x2="6" y2="14"></line>
    //     </svg>
    //   )
    // },
    {
      id: 'timesheet' as const,
      name: 'Timesheet',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12,6 12,12 16,14"></polyline>
        </svg>
      )
    }
  ];

  return (
    <div className="h-full w-20 bg-white flex flex-col flex-shrink-0">
      {/* Header - App Logo */}
      <div className="pt-8 pb-3 flex justify-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center relative group">
          {/* Wave/River Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800">
            <path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
            <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
            <path d="M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>
          </svg>
          
          {/* Tooltip */}
          <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-200/50 shadow-sm">
            NamOS
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4">
        <div className="space-y-2 flex flex-col items-center">
          {navItems.map((item) => {
            const isActive = activeApp === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onAppChange(item.id)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-orange-100 text-orange-600 border border-orange-200'
                    : 'text-slate-800 hover:bg-gray-100'
                }`}
                style={isActive ? { 
                  boxShadow: '0 4px 12px rgba(251, 146, 60, 0.2)' 
                } : {}}
              >
                {item.icon}
                
                {/* Tooltip */}
                <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-200/50 shadow-sm">
                  {item.name}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer - Additional Icons */}
      <div className="p-2 space-y-2 flex flex-col items-center">
        {/* User Avatar */}
        <button className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-all duration-200 relative group">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.slack_username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-200/50 shadow-sm">
            {user?.full_name || user?.slack_username || 'User'}
          </div>
        </button>
        
        {/* Settings */}
        <div className="relative" ref={settingsRef}>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 relative group ${
              isSettingsOpen ? 'bg-gray-100 text-slate-800' : 'text-slate-800 hover:bg-gray-100 hover:text-slate-800'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            
            {/* Tooltip */}
            {!isSettingsOpen && (
              <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-200/50 shadow-sm">
                Settings
              </div>
            )}
          </button>

          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <div className="absolute left-14 bottom-0 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg py-2 min-w-[180px] z-50">
              <button
                onClick={() => {
                  onAppChange('users');
                  setIsSettingsOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-800 hover:bg-gray-100 transition-colors font-dm-sans whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-3 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                User Management
              </button>
              <a
                href="http://localhost:6006"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 text-sm text-slate-800 hover:bg-gray-100 transition-colors font-dm-sans whitespace-nowrap"
                onClick={() => setIsSettingsOpen(false)}
              >
                <svg className="w-4 h-4 mr-3 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Storybook
              </a>
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-slate-800 hover:bg-gray-100 transition-colors font-dm-sans whitespace-nowrap"
                onClick={() => setIsSettingsOpen(false)}
              >
                <svg className="w-4 h-4 mr-3 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Help
              </button>
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-slate-800 hover:bg-gray-100 transition-colors font-dm-sans whitespace-nowrap"
                onClick={() => setIsSettingsOpen(false)}
              >
                <svg className="w-4 h-4 mr-3 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preferences
              </button>
              <button
                onClick={() => {
                  logout();
                  setIsSettingsOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-800 hover:bg-gray-100 transition-colors font-dm-sans whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-3 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftNav;
