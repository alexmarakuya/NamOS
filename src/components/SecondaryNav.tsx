import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SecondaryNavProps {
  activeApp: 'financial' | 'timesheet' | 'tasks';
}

const SecondaryNav: React.FC<SecondaryNavProps> = ({ activeApp }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only show secondary nav for tasks app
  if (activeApp !== 'tasks') {
    return null;
  }

  const getActiveSection = () => {
    if (location.pathname.startsWith('/projects')) return 'projects';
    if (location.pathname.startsWith('/tasks')) return 'tasks';
    if (location.pathname.startsWith('/clients')) return 'clients';
    return 'projects';
  };

  const activeSection = getActiveSection();

  const navItems = [
    {
      id: 'projects',
      name: 'Projects',
      path: '/projects',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'tasks',
      name: 'Tasks',
      path: '/tasks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2m0-12h2a2 2 0 012 2v10a2 2 0 01-2 2H9m0-12V3m0 2v2m0 12v2m0-2v-2" />
        </svg>
      )
    },
    {
      id: 'clients',
      name: 'Clients',
      path: '/clients',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-48 px-4 py-6 border-r border-white/10 relative z-40">
      <nav className="flex flex-col space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 font-dm-sans w-full text-left ${
              activeSection === item.id
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {item.icon}
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SecondaryNav;
