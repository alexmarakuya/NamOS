import React from 'react';

interface LeftNavProps {
  activeApp: 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients';
  onAppChange: (app: 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients') => void;
}

const LeftNav: React.FC<LeftNavProps> = ({ activeApp, onAppChange }) => {
  // Always keep compact - no expansion

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
            <span className="text-white font-medium text-sm">MJ</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-200/50 shadow-sm">
            Profile
          </div>
        </button>
        
        {/* Help */}
        <button className="w-12 h-12 rounded-full flex items-center justify-center text-slate-800 hover:bg-gray-100 hover:text-slate-800 transition-all duration-200 relative group">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          
          {/* Tooltip */}
          <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-200/50 shadow-sm">
            Help
          </div>
        </button>
      </div>
    </div>
  );
};

export default LeftNav;
