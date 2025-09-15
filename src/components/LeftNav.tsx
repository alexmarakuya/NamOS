import React, { useState } from 'react';

interface LeftNavProps {
  activeApp: 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients';
  onAppChange: (app: 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients') => void;
}

const LeftNav: React.FC<LeftNavProps> = ({ activeApp, onAppChange }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Show expanded state when hovered
  const showExpanded = isHovered;

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
    <div
      className={`fixed left-0 top-0 h-full dashboard-sidebar border-r border-neutral-700 transition-all duration-300 ease-in-out z-50 ${
        showExpanded ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-4 border-b overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center min-w-0">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm braun-text">N</span>
            </div>
          </div>
          <div className={`ml-3 transition-opacity duration-300 min-w-0 ${showExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="font-semibold text-lg braun-text truncate" style={{ color: 'var(--text-primary)' }}>
              NamOS
            </h1>
            <p className="text-xs braun-text truncate" style={{ color: 'var(--text-secondary)' }}>
              Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="mt-8">
        <div className="px-2 space-y-2">
          {navItems.map((item) => {
            const isActive = activeApp === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onAppChange(item.id)}
                className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-accent-500 text-white'
                    : 'text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
                <div className={`ml-3 transition-opacity duration-300 min-w-0 ${showExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-sm font-medium braun-text truncate block">
                    {item.name}
                  </span>
                </div>
                
                {/* Tooltip for collapsed state */}
                {!showExpanded && (
                  <div className="absolute left-16 bg-accent-secondary text-white px-2 py-1 rounded text-xs braun-text opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-accent-secondary ">
                    {item.name}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-accent-secondary rotate-45 border-l border-b border-accent-secondary"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
          <div className={`ml-3 transition-opacity duration-300 ${showExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-neutral-300 text-sm braun-text whitespace-nowrap">
              Admin User
            </p>
            <p className="text-neutral-500 text-xs braun-text whitespace-nowrap">
              Online
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftNav;
