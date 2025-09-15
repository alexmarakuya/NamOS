import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import StatCard from './components/StatCard';
import TimeEntryTable from './components/TimeEntryTable';
import TimeChart from './components/TimeChart';
import { useTimeEntries, useProjects, useTeamMembers, convertDbTimeEntryToApp, convertDbProjectToApp } from './hooks/useSupabase';
import { TimesheetStats, TimeChartData, TeamMember, Project } from './types';
import { getDaysInMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameWeek, isSameMonth } from 'date-fns';

function TimeApp() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeUser, setActiveUser] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'month' | 'week'>('month');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setTeamDropdownOpen(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setTimeDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch data from Supabase (fetch all data once, filter client-side)
  const { timeEntries: dbTimeEntries, loading: timeEntriesLoading, error: timeEntriesError } = useTimeEntries();
  const { projects: dbProjects, loading: projectsLoading, error: projectsError } = useProjects();
  const { teamMembers: dbTeamMembers, loading: teamMembersLoading, error: teamMembersError } = useTeamMembers();

  // Convert database data to app format
  const projects = useMemo(() => 
    dbProjects.map(convertDbProjectToApp), 
    [dbProjects]
  );

  // Convert and filter time entries client-side
  const timeEntries = useMemo(() => {
    let filteredEntries = dbTimeEntries.map(convertDbTimeEntryToApp);
    
    // Apply project filter
    if (activeFilter !== 'all') {
      filteredEntries = filteredEntries.filter(entry => entry.project?.id === activeFilter);
    }
    
    // Apply user filter
    if (activeUser !== 'all') {
      filteredEntries = filteredEntries.filter(entry => entry.user_id === activeUser);
    }
    
    return filteredEntries;
  }, [dbTimeEntries, activeFilter, activeUser]);

  const teamMembers = useMemo((): TeamMember[] => 
    dbTeamMembers.map(member => ({
      id: member.id,
      slack_user_id: member.slack_user_id,
      slack_username: member.slack_username,
      full_name: member.full_name,
      email: member.email,
      role: member.role,
      hourly_rate: member.hourly_rate ? parseFloat(member.hourly_rate.toString()) : undefined,
      is_active: member.is_active
    })), 
    [dbTeamMembers]
  );

  // Helper function to determine text color based on background brightness
  const getTextColor = (backgroundColor: string): string => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance using the relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, dark for light backgrounds
    return luminance > 0.5 ? '#1f2937' : '#ffffff';
  };

  // Generate distinct colors for each client (same as TimeChart)
  const getClientColors = (): { [key: string]: { primary: string; shades: string[] } } => {
    return {
      'AmexGBT': {
        primary: '#92B590',   // Sage green (brand primary)
        shades: ['#92B590', '#7BA378', '#A5C4A3', '#6B9B69', '#8FAD8D']
      },
      'Internal': {
        primary: '#2B3A2C',   // Dark forest green (brand secondary)
        shades: ['#2B3A2C', '#3E4F3F', '#4A5D4B', '#5C7A5A', '#1F2B20']
      },
      'Microsoft': {
        primary: '#4A90E2',   // Blue
        shades: ['#4A90E2', '#5BA0F2', '#6BB0FF', '#3A80D2', '#2A70C2']
      },
      'Google': {
        primary: '#E67E22',   // Orange
        shades: ['#E67E22', '#F39C12', '#FF8C00', '#D35400', '#C0392B']
      },
      'Apple': {
        primary: '#8E44AD',   // Purple
        shades: ['#8E44AD', '#9B59B6', '#A569BD', '#7D3C98', '#6C3483']
      },
      'Amazon': {
        primary: '#E74C3C',   // Red
        shades: ['#E74C3C', '#EC7063', '#F1948A', '#CD6155', '#B03A2E']
      },
      'Default': {
        primary: '#95A5A6',   // Gray
        shades: ['#95A5A6', '#BDC3C7', '#D5DBDB', '#85929E', '#7B8A8B']
      }
    };
  };

  // Get project colors (same logic as TimeChart)
  const projectColors = React.useMemo(() => {
    const clientColors = getClientColors();
    const colorMap: { [key: string]: string } = {};

    // Group projects by client
    const projectsByClient: { [client: string]: string[] } = {};
    projects.forEach(project => {
      const clientName = project.client_name || 'Default';
      if (!projectsByClient[clientName]) {
        projectsByClient[clientName] = [];
      }
      projectsByClient[clientName].push(project.id);
    });

    // Assign colors based on client
    Object.entries(projectsByClient).forEach(([clientName, projectIds]) => {
      const clientColorScheme = clientColors[clientName] || clientColors['Default'];
      projectIds.forEach((projectId, index) => {
        // Use different shades for projects within the same client
        const shadeIndex = index % clientColorScheme.shades.length;
        colorMap[projectId] = clientColorScheme.shades[shadeIndex];
      });
    });

    return colorMap;
  }, [projects]);

  // Optimized filter handlers to prevent unnecessary re-renders
  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilter(filterId);
  }, []);

  const handleUserFilterChange = useCallback((userId: string) => {
    setActiveUser(userId);
  }, []);

  // Optimized dropdown handlers
  const closeProjectDropdown = useCallback(() => {
    setProjectDropdownOpen(false);
  }, []);

  const closeTeamDropdown = useCallback(() => {
    setTeamDropdownOpen(false);
  }, []);

  // Time filter handlers
  const handleTimeFilterChange = useCallback((filter: 'month' | 'week') => {
    setTimeFilter(filter);
  }, []);

  const closeTimeDropdown = useCallback(() => {
    setTimeDropdownOpen(false);
  }, []);

  // Client expansion handlers
  const toggleClientExpansion = useCallback((clientName: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  }, []);

  // Auto-expand client if a project from that client is selected
  useEffect(() => {
    if (activeFilter !== 'all') {
      const selectedProject = projects.find(p => p.id === activeFilter);
      if (selectedProject) {
        const clientName = selectedProject.client_name || 'Other';
        setExpandedClients(prev => {
          const newSet = new Set(prev);
          newSet.add(clientName);
          return newSet;
        });
      }
    }
  }, [activeFilter, projects]);

  // Calculate statistics (filtered to selected time period)
  const stats = useMemo((): TimesheetStats => {
    // Filter entries to selected time period
    const now = new Date();
    const statsEntries = timeEntries.filter(entry => {
      const date = new Date(entry.date);
      
      if (timeFilter === 'month') {
        return isSameMonth(date, now);
      } else {
        return isSameWeek(date, now, { weekStartsOn: 1 });
      }
    });
    
    const totalHours = statsEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const billableHours = statsEntries.filter(entry => entry.is_billable).reduce((sum, entry) => sum + entry.hours, 0);
    const nonBillableHours = totalHours - billableHours;
    
    const totalValue = statsEntries.reduce((sum, entry) => {
      if (entry.is_billable && entry.project?.hourly_rate) {
        return sum + (entry.hours * entry.project.hourly_rate);
      }
      return sum;
    }, 0);
    
    const activeProjects = new Set(statsEntries.filter(entry => entry.project_id).map(entry => entry.project_id)).size;
    
    return {
      totalHours,
      billableHours,
      nonBillableHours,
      totalValue,
      activeProjects
    };
  }, [timeEntries, timeFilter]);

  // Check if we're in month view (showing daily data for current month)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isMonthView = timeFilter === 'month';

  // Generate chart data from real time entries
  const chartData = useMemo((): TimeChartData[] => {
    // Create a map to store daily data
    const dailyData = new Map<string, { billable: number; nonBillable: number; projects: { [projectId: string]: number } }>();
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let daysToShow: Date[];
    
    if (timeFilter === 'month') {
      // Month view: show all days in current month
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth));
      
      daysToShow = [];
      for (let day = 1; day <= daysInMonth; day++) {
        daysToShow.push(new Date(currentYear, currentMonth, day));
      }
      
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth, daysInMonth);
    } else {
      // Week view: show 7 days of current week (Monday to Sunday)
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      endDate = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      daysToShow = eachDayOfInterval({ start: startDate, end: endDate });
    }
    
    // Process time entries for the selected time period
    timeEntries.forEach(entry => {
      const date = new Date(entry.date);
      
      // Check if entry falls within our time period
      const isInPeriod = timeFilter === 'month' 
        ? isSameMonth(date, now)
        : isSameWeek(date, now, { weekStartsOn: 1 });
      
      if (isInPeriod) {
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (!dailyData.has(dayKey)) {
          dailyData.set(dayKey, { billable: 0, nonBillable: 0, projects: {} });
        }
        
        const dayData = dailyData.get(dayKey)!;
        if (entry.is_billable) {
          dayData.billable += entry.hours;
        } else {
          dayData.nonBillable += entry.hours;
        }
        
        // Add project-based data
        const projectId = entry.project_id || 'no-project';
        dayData.projects[projectId] = (dayData.projects[projectId] || 0) + entry.hours;
      }
    });
    
    // Generate chart data for all days in the selected period
    const result: TimeChartData[] = [];
    
    daysToShow.forEach(date => {
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // For month view, show day number; for week view, show day name (Mon, Tue, etc.)
      const dayName = timeFilter === 'month' 
        ? date.getDate().toString()
        : format(date, 'EEE'); // Mon, Tue, Wed, etc.
      
      const data = dailyData.get(dayKey) || { billable: 0, nonBillable: 0, projects: {} };
      
      result.push({
        name: dayName,
        billable: data.billable,
        nonBillable: data.nonBillable,
        total: data.billable + data.nonBillable,
        projects: data.projects
      });
    });
    
    return result;
  }, [timeEntries, timeFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Recent time entries (filtered to selected time period)
  const recentTimeEntries = useMemo(() => {
    const now = new Date();
    const entries = timeEntries.filter(entry => {
      const date = new Date(entry.date);
      
      if (timeFilter === 'month') {
        return isSameMonth(date, now);
      } else {
        return isSameWeek(date, now, { weekStartsOn: 1 });
      }
    });
    
    return entries
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, 20);
  }, [timeEntries, timeFilter]);


  // Loading state
  if (timeEntriesLoading || projectsLoading || teamMembersLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-neutral-300 braun-text">Loading timesheet...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (timeEntriesError || projectsError || teamMembersError) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2 braun-text">Database Connection Error</h2>
          <p className="text-neutral-300 mb-4 braun-text">
            {timeEntriesError || projectsError || teamMembersError}
          </p>
          <p className="text-sm text-neutral-400 braun-text">
            Please check your Supabase configuration and ensure your time tracking database is set up correctly.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2.5 bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 braun-text"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1 font-epilogue">
            Timesheet Dashboard
          </h1>
          <p className="text-sm text-neutral-600 font-epilogue">
            Track team productivity and billable hours
          </p>
        </div>
        <div className="flex space-x-4">
          {/* Time Filter Dropdown */}
          <div className="relative" ref={timeDropdownRef}>
            <button
              onClick={() => {
                setTimeDropdownOpen(!timeDropdownOpen);
                setProjectDropdownOpen(false);
                setTeamDropdownOpen(false);
              }}
              className="flex items-center space-x-3 px-4 border border-neutral-200 hover:border-neutral-300 bg-transparent hover:bg-cream-dark text-neutral-500 hover:text-neutral-600 text-sm rounded-lg transition-colors duration-200 ease-in-out font-epilogue"
              style={{ paddingTop: '10px', paddingBottom: '6px' }}
            >
              <div className="w-6 h-6 flex items-center justify-center" style={{ transform: 'translateY(-2px)' }}>
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span>{timeFilter === 'month' ? 'This Month' : 'This Week'}</span>
            </button>
            
            {timeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-64 overflow-y-auto dropdown-scrollbar">
                <button
                  onClick={() => {
                    handleTimeFilterChange('month');
                    closeTimeDropdown();
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
                    timeFilter === 'month' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                  }`}
                >
                  <span>This Month</span>
                </button>
                <button
                  onClick={() => {
                    handleTimeFilterChange('week');
                    closeTimeDropdown();
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
                    timeFilter === 'week' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                  }`}
                >
                  <span>This Week</span>
                </button>
              </div>
            )}
          </div>

          {/* Project Filter Dropdown */}
          <div className="relative" ref={projectDropdownRef}>
            <button
              onClick={() => {
                setProjectDropdownOpen(!projectDropdownOpen);
                setTeamDropdownOpen(false);
                setTimeDropdownOpen(false);
              }}
                    className="flex items-center space-x-3 px-4 border border-neutral-200 hover:border-neutral-300 bg-transparent hover:bg-cream-dark text-neutral-500 hover:text-neutral-600 text-sm rounded-lg transition-colors duration-200 ease-in-out font-epilogue"
                    style={{ paddingTop: '10px', paddingBottom: '6px' }}
                  >
                    <div className="w-6 h-6 flex items-center justify-center" style={{ transform: 'translateY(-2px)' }}>
                      {activeFilter === 'all' ? (
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      ) : (
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-colors duration-200"
                          style={{ 
                            backgroundColor: projectColors[activeFilter] || '#95A5A6',
                            color: getTextColor(projectColors[activeFilter] || '#95A5A6'),
                            filter: 'brightness(0.9)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = 'brightness(0.8)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = 'brightness(0.9)';
                          }}
                        >
                          <span style={{ transform: 'translateY(1px)' }}>
                            {projects.find(p => p.id === activeFilter)?.name.charAt(0).toUpperCase() || 'P'}
                          </span>
                        </div>
                      )}
                    </div>
                    <span>{activeFilter === 'all' ? 'All Projects' : projects.find(p => p.id === activeFilter)?.name || 'Project'}</span>
            </button>
            
            {projectDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-72 overflow-y-auto dropdown-scrollbar">
                <button
                  onClick={() => {
                    handleFilterChange('all');
                    closeProjectDropdown();
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
                    activeFilter === 'all' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                  }`}
                >
                  <span>Show all</span>
                </button>
                
                {/* Group projects by client */}
                {Object.entries(
                  projects.reduce((grouped: { [clientName: string]: Project[] }, project) => {
                    const clientName = project.client_name || 'Other';
                    if (!grouped[clientName]) {
                      grouped[clientName] = [];
                    }
                    grouped[clientName].push(project);
                    return grouped;
                  }, {})
                ).map(([clientName, clientProjects]) => {
                  const isExpanded = expandedClients.has(clientName);
                  return (
                    <div key={clientName} className="mt-2">
                      {/* Collapsible Client header */}
                      <button
                        onClick={() => toggleClientExpansion(clientName)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider border-b border-neutral-200 mb-1 hover:bg-neutral-50 transition-colors rounded-md"
                      >
                        <span>{clientName}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Collapsible Client projects */}
                      {isExpanded && clientProjects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => {
                            handleFilterChange(project.id);
                            closeProjectDropdown();
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-3 ml-2 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
                            activeFilter === project.id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                          }`}
                        >
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center text-xs font-medium transition-colors duration-200"
                            style={{ 
                              backgroundColor: projectColors[project.id] || '#95A5A6',
                              color: getTextColor(projectColors[project.id] || '#95A5A6'),
                              filter: 'brightness(0.9)',
                              transform: 'translateY(-2px)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = 'brightness(0.8)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'brightness(0.9)';
                            }}
                          >
                            <span style={{ transform: 'translateY(1px)' }}>
                              {project.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm">{project.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Team Member Filter Dropdown */}
          <div className="relative" ref={teamDropdownRef}>
            <button
              onClick={() => {
                setTeamDropdownOpen(!teamDropdownOpen);
                setProjectDropdownOpen(false);
                setTimeDropdownOpen(false);
              }}
                    className="flex items-center space-x-3 px-4 border border-neutral-200 hover:border-neutral-300 bg-transparent hover:bg-cream-dark text-neutral-500 hover:text-neutral-600 text-sm rounded-lg transition-colors duration-200 ease-in-out font-epilogue"
                    style={{ paddingTop: '10px', paddingBottom: '6px' }}
                  >
                    <div className="w-6 h-6 flex items-center justify-center" style={{ transform: 'translateY(-2px)' }}>
                      {activeUser === 'all' ? (
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      ) : (
                          <div className="w-6 h-6 rounded-full bg-neutral-300 hover:bg-neutral-400 flex items-center justify-center text-white text-xs font-medium transition-colors duration-200">
                            <span style={{ transform: 'translateY(1px)' }}>
                              {(teamMembers.find(m => m.id === activeUser)?.full_name || teamMembers.find(m => m.id === activeUser)?.slack_username || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                      )}
                    </div>
                    <span>{activeUser === 'all' ? 'All Members' : teamMembers.find(m => m.id === activeUser)?.full_name || teamMembers.find(m => m.id === activeUser)?.slack_username || 'Member'}</span>
            </button>
            
            {teamDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-64 overflow-y-auto dropdown-scrollbar">
                <button
                  onClick={() => {
                    handleUserFilterChange('all');
                    closeTeamDropdown();
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
                    activeUser === 'all' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                  }`}
                >
                  <span>Show all</span>
                </button>
                {teamMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      handleUserFilterChange(member.id);
                      closeTeamDropdown();
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
                      activeUser === member.id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-neutral-300 hover:bg-neutral-400 flex items-center justify-center text-white text-xs font-medium transition-colors duration-200" style={{ transform: 'translateY(-2px)' }}>
                      {(member.full_name || member.slack_username).charAt(0).toUpperCase()}
                    </div>
                    <span>{member.full_name || member.slack_username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Stats Cards Grid - Filtered to current month */}
      <div className="dashboard-grid">
        <StatCard
          title="Total Hours"
          value={formatHours(stats.totalHours)}
          change={timeFilter === 'month' 
            ? `${new Date().toLocaleDateString('en-US', { month: 'long' })} - ${stats.activeProjects} projects`
            : `This week - ${stats.activeProjects} projects`}
          changeType="neutral"
        />
        <StatCard
          title="Billable Hours"
          value={formatHours(stats.billableHours)}
          change={`${((stats.billableHours / stats.totalHours) * 100 || 0).toFixed(1)}% of total`}
          changeType="positive"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          change={`${formatHours(stats.billableHours)} billed`}
          changeType="positive"
        />
      </div>

      {/* Data Section Container */}
      <div className="data-section-container">
        {/* Charts Grid */}
        <div className="dashboard-card">
          <TimeChart data={chartData} activeFilter={activeFilter !== 'all' || activeUser !== 'all' ? 'filtered' : 'all'} projects={projects} />
        </div>

        {/* Recent Time Entries */}
        <div className="dashboard-card">
          <TimeEntryTable timeEntries={recentTimeEntries} />
        </div>
      </div>
    </div>
  );
}

export default TimeApp;