import React, { useState, useRef, useEffect } from 'react';
import { Project, TeamMember, Task, TimeEntry } from '../types';
import { useProjects, useProjectSpirit, useSpiritOperations } from '../hooks/useSupabase';
import SpiritChat from './SpiritChat';
import SpiritInsights from './SpiritInsights';

interface ProjectSidebarProps {
  project: Project;
  teamMembers: TeamMember[];
  tasks?: Task[];
  timeEntries?: TimeEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onBack: () => void;
  onEdit: () => void;
  onUpdateProject?: (updates: Partial<Project>) => void;
  onDelete?: (projectId: string) => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ 
  project, 
  teamMembers, 
  tasks = [],
  timeEntries = [],
  isOpen, 
  onToggle,
  onBack,
  onEdit,
  onUpdateProject,
  onDelete
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default 384px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [links, setLinks] = useState<Array<{id: string, url: string, title: string, type: string}>>([]);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  
  // Spirit states
  const [isSpiritChatOpen, setIsSpiritChatOpen] = useState(false);
  const { spirit, loading: spiritLoading } = useProjectSpirit(project.id);
  const { createSpirit } = useSpiritOperations();
  
  // Get projects for client dropdown
  const { projects = [] } = useProjects();
  
  // Get unique clients from projects
  const uniqueClients = Array.from(new Set(projects.map(p => p.client_name).filter(Boolean)));
  
  // Refs for dropdowns
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Link management functions
  const detectLinkType = (url: string) => {
    if (url.includes('figma.com')) return 'figma';
    if (url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('sheets.google.com')) return 'google-drive';
    return 'generic';
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'figma':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 2.25a.75.75 0 01.75-.75h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-.75.75h-5.5a.75.75 0 01-.75-.75v-5.5zm0 0L8.75 8.75M2.25 15.5a.75.75 0 01.75-.75h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-.75.75H3a.75.75 0 01-.75-.75v-5.5z"/>
            </svg>
          </div>
        );
      case 'google-drive':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z"/>
              <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
          </div>
        );
    }
  };

  const getLinkTitle = (url: string, type: string) => {
    switch (type) {
      case 'figma':
        return 'Figma Design';
      case 'google-drive':
        return 'Google Drive';
      default:
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        } catch {
          return 'Link';
        }
    }
  };

  const getLinkDescription = (type: string) => {
    switch (type) {
      case 'figma':
        return 'Design files and prototypes';
      case 'google-drive':
        return 'Project documents and files';
      default:
        return 'External link';
    }
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    
    const type = detectLinkType(newLinkUrl);
    const title = getLinkTitle(newLinkUrl, type);
    const newLink = {
      id: Date.now().toString(),
      url: newLinkUrl,
      title,
      type
    };
    
    setLinks([...links, newLink]);
    setNewLinkUrl('');
    setIsAddingLink(false);
  };

  const removeLink = (linkId: string) => {
    setLinks(links.filter(link => link.id !== linkId));
    setLinkToDelete(null);
  };

  const handleDeleteLinkRequest = (linkId: string) => {
    setLinkToDelete(linkId);
  };

  const handleDeleteProject = () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${project.name}"?\n\nThis action cannot be undone. All tasks, files, and data associated with this project will be permanently deleted.`
    );
    
    if (confirmDelete && onDelete) {
      onDelete(project.id);
    }
  };

  const handleCreateSpirit = async () => {
    try {
      await createSpirit({
        project_id: project.id,
        name: `${project.client_name || project.name} Spirit`,
        personality: {
          tone: project.client_name ? 'professional' : 'casual',
          focus_areas: ['task_management', 'timeline_tracking', 'client_communication'],
          communication_style: 'Clear, proactive, and helpful project assistance',
          expertise_level: 'mid',
        },
        path_stage: 'planning',
      });
      // The spirit hook will automatically refetch
    } catch (error) {
      console.error('Error creating spirit:', error);
    }
  };

  // Inline editing functions
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = () => {
    if (!onUpdateProject || !editingField) return;
    
    const updates: Partial<Project> = {};
    updates[editingField as keyof Project] = editValue as any;
    
    onUpdateProject(updates);
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Handle resize functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 280 && newWidth <= 600) { // Min 280px, Max 600px
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get project avatar
  const getProjectAvatar = (name: string) => {
    const initials = name
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    
    const colorIndex = name.length % colors.length;
    const colorClass = colors[colorIndex];
    
    return { initials, colorClass };
  };

  const avatar = getProjectAvatar(project.name);

  // Get status badge
  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
      on_hold: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Format deadline
  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (diffDays < 0) {
      return { text: formattedDate, status: 'overdue', days: Math.abs(diffDays) };
    } else if (diffDays <= 7) {
      return { text: formattedDate, status: 'urgent', days: diffDays };
    } else {
      return { text: formattedDate, status: 'normal', days: diffDays };
    }
  };

  const deadline = formatDeadline(project.deadline);

  return (
    <div 
      ref={sidebarRef}
      className="flex-shrink-0 relative"
      style={{ width: sidebarWidth }}
    >
      {/* Sidebar */}
      <div className="h-full overflow-hidden border-r border-neutral-200 p-8" style={{ backgroundColor: 'rgb(252, 252, 250)', boxShadow: '4px 0 12px rgba(0, 0, 0, 0.03)' }}>
        <div className="flex flex-col h-full">
          {/* Header with Back Button and Project Info */}
          <div className="pb-6 border-b border-neutral-200">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="flex items-center text-neutral-500 hover:text-neutral-700 transition-colors font-epilogue mb-4 w-full text-left"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to Projects</span>
            </button>
            
            {/* Project Info */}
            <div className="flex items-start space-x-4">
              {/* Project Avatar */}
              <div className={`w-12 h-12 rounded-lg ${avatar.colorClass} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-lg font-epilogue">
                  {avatar.initials}
                </span>
              </div>
              
              {/* Project Name and Client */}
              <div className="flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      {editingField === 'name' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyPress}
                          onBlur={saveEdit}
                          className="text-lg font-semibold text-neutral-900 font-epilogue bg-transparent border-none outline-none w-full p-0 m-0"
                          style={{ height: '28px', lineHeight: '28px' }}
                          autoFocus
                        />
                      ) : (
                        <h2 
                          className={`text-lg font-semibold font-epilogue line-clamp-1 cursor-pointer hover:text-neutral-700 transition-colors ${
                            project.name ? 'text-neutral-900' : 'text-neutral-400'
                          }`}
                          style={{ height: '28px', lineHeight: '28px' }}
                          onClick={() => startEditing('name', project.name || '')}
                          title="Click to edit project name"
                        >
                          {project.name || 'Untitled Project'}
                        </h2>
                      )}
                      {project.client_name && (
                        <p className="text-sm text-neutral-500 font-epilogue">
                          {project.client_name}
                        </p>
                      )}
                    </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pt-6 space-y-6">
            {/* Status */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-2">Status</h3>
              <div className="relative" ref={statusDropdownRef}>
                <div 
                  className="cursor-pointer inline-block"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  title="Click to edit status"
                >
                  {getStatusBadge(project.status)}
                </div>
                
                {statusDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-64 overflow-y-auto dropdown-scrollbar">
                    {[
                      { value: 'active', label: 'Active' },
                      { value: 'upcoming', label: 'Upcoming' },
                      { value: 'on_hold', label: 'On Hold' },
                      { value: 'completed', label: 'Completed' }
                    ].map((status) => (
                      <button
                        key={status.value}
                        onClick={() => {
                          if (onUpdateProject) {
                            onUpdateProject({ status: status.value as any });
                          }
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-3 text-sm hover:bg-neutral-50 transition-colors font-epilogue rounded-md ${
                          (project.status || 'active') === status.value ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                        }`}
                      >
                        <span>{status.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-2">Description</h3>
              {editingField === 'description' ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={saveEdit}
                  className="w-full text-sm text-neutral-600 font-epilogue leading-relaxed bg-transparent border-none outline-none resize-none p-0 m-0"
                  rows={3}
                  style={{ minHeight: '60px', boxShadow: 'none', border: 'none', outline: 'none' }}
                  autoFocus
                />
              ) : (
                <p 
                  className={`text-sm font-epilogue leading-relaxed cursor-pointer hover:text-neutral-800 transition-colors ${
                    project.description ? 'text-neutral-600' : 'text-neutral-400'
                  }`}
                  style={{ minHeight: '60px' }}
                  onClick={() => startEditing('description', project.description || '')}
                  title="Click to edit description"
                >
                  {project.description || 'Click to add description...'}
                </p>
              )}
            </div>

            {/* Deadline */}
            {deadline && (
              <div>
                <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-2">Deadline</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    deadline.status === 'overdue' ? 'bg-red-500' :
                    deadline.status === 'urgent' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm text-neutral-900 font-epilogue">{deadline.text}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    deadline.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    deadline.status === 'urgent' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {deadline.status === 'overdue' ? `${deadline.days} days overdue` :
                     deadline.days === 0 ? 'Due today' :
                     deadline.days === 1 ? 'Due tomorrow' :
                     `${deadline.days} days left`}
                  </span>
                </div>
              </div>
            )}

            {/* Client */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-2">Client</h3>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="relative flex-1" ref={clientDropdownRef}>
                  <span 
                    className={`text-sm font-epilogue cursor-pointer hover:text-neutral-700 transition-colors ${
                      project.client_name ? 'text-neutral-900' : 'text-neutral-400'
                    }`}
                    onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                    title="Click to edit client"
                  >
                    {project.client_name || 'Click to add client...'}
                  </span>
                  
                  {clientDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-64 overflow-y-auto dropdown-scrollbar">
                      <button
                        onClick={() => {
                          if (onUpdateProject) {
                            onUpdateProject({ client_name: '' });
                          }
                          setClientDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-3 text-sm hover:bg-neutral-50 transition-colors font-epilogue rounded-md ${
                          !project.client_name ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                        }`}
                      >
                        <span>No client</span>
                      </button>
                      {uniqueClients.map((client) => (
                        <button
                          key={client}
                          onClick={() => {
                            if (onUpdateProject) {
                              onUpdateProject({ client_name: client });
                            }
                            setClientDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-3 text-sm hover:bg-neutral-50 transition-colors font-epilogue rounded-md ${
                            project.client_name === client ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                          }`}
                        >
                          <span>{client}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-2">Team</h3>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm text-neutral-600 font-epilogue">
                  {teamMembers.length > 0 ? `${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}` : 'No team members assigned'}
                </span>
              </div>
            </div>

            {/* Business Unit */}
            {project.business_unit && (
              <div>
                <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-2">Business Unit</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-neutral-400"></div>
                  <span className="text-sm text-neutral-900 font-epilogue">{project.business_unit.name}</span>
                </div>
              </div>
            )}

            {/* Links */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-3">Links</h3>
              <div className="space-y-3">
                {/* Existing Links */}
                {links.map((link) => (
                  <div key={link.id} className="relative">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200">
                      <div className="flex items-center space-x-3">
                        {getLinkIcon(link.type)}
                        <div>
                          <p className="text-sm font-medium text-neutral-900 font-epilogue">{link.title}</p>
                          <p className="text-xs text-neutral-500 font-epilogue">{getLinkDescription(link.type)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => window.open(link.url, '_blank')}
                          className="text-neutral-400 hover:text-neutral-600 transition-colors"
                          title="Open link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteLinkRequest(link.id)}
                          className="text-neutral-400 hover:text-red-600 transition-colors"
                          title="Remove link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Delete Confirmation Toast */}
                    {linkToDelete === link.id && (
                      <div className="absolute -bottom-2 left-0 right-0 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg z-10 transform translate-y-full">
                        <p className="text-sm text-red-800 font-epilogue mb-2">Delete this link?</p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => removeLink(link.id)}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors font-epilogue"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setLinkToDelete(null)}
                            className="px-3 py-1 text-neutral-600 text-xs rounded hover:bg-neutral-100 transition-colors font-epilogue"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Link Input */}
                {isAddingLink ? (
                  <div className="p-3 bg-white rounded-lg border border-neutral-200">
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="Enter URL (e.g., https://figma.com/...)"
                      className="w-full text-sm border border-neutral-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-epilogue"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addLink();
                        if (e.key === 'Escape') {
                          setIsAddingLink(false);
                          setNewLinkUrl('');
                        }
                      }}
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={addLink}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-epilogue"
                      >
                        Add Link
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingLink(false);
                          setNewLinkUrl('');
                        }}
                        className="px-3 py-1.5 text-neutral-600 text-xs rounded-lg hover:bg-neutral-100 transition-colors font-epilogue"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty State / Add Button */
                  <button
                    onClick={() => setIsAddingLink(true)}
                    className="w-full p-3 rounded-lg transition-all group border border-transparent hover:border-neutral-200"
                    style={{ backgroundColor: 'rgb(248, 247, 244)' }}
                  >
                    <div className="flex items-center justify-center space-x-2 text-neutral-500 group-hover:text-neutral-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-epilogue">Add link</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Project Spirit Section */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 font-epilogue mb-3">Project Spirit</h3>
              
              {spiritLoading ? (
                <div className="flex items-center space-x-2 text-neutral-500">
                  <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-epilogue">Loading spirit...</span>
                </div>
              ) : spirit ? (
                <div className="space-y-4">
                  {/* Spirit Info */}
                  <div className="p-3 bg-white rounded-lg border border-neutral-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg ${
                        spirit.personality.tone === 'professional' ? 'bg-blue-500' :
                        spirit.personality.tone === 'casual' ? 'bg-green-500' :
                        spirit.personality.tone === 'creative' ? 'bg-purple-500' :
                        spirit.personality.tone === 'technical' ? 'bg-gray-500' : 'bg-indigo-500'
                      } flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm font-epilogue">
                          {spirit.name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-neutral-900 font-epilogue">
                          {spirit.name}
                        </h4>
                        <p className="text-xs text-neutral-500 font-epilogue">
                          {spirit.personality.communication_style}
                        </p>
                      </div>
                    </div>
                    
                    {/* Path Stage */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-neutral-600 font-epilogue">Current Stage:</span>
                      <span className="text-xs font-medium text-neutral-900 font-epilogue capitalize">
                        {spirit.path_stage.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-600 font-epilogue">Progress:</span>
                        <span className="text-xs font-medium text-neutral-900 font-epilogue">
                          {spirit.path_progress}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${spirit.path_progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Chat Button */}
                    <button
                      onClick={() => setIsSpiritChatOpen(true)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-epilogue py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Chat with {spirit.name}</span>
                    </button>
                  </div>
                  
                  {/* AI Insights */}
                  <SpiritInsights 
                    spirit={spirit}
                    project={project}
                    tasks={tasks}
                    timeEntries={timeEntries}
                  />
                </div>
              ) : (
                /* Create Spirit */
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-sm text-neutral-600 font-epilogue mb-3">
                    Create an AI assistant for this project
                  </p>
                  <button
                    onClick={handleCreateSpirit}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-epilogue py-2 px-4 rounded-lg transition-colors"
                  >
                    Create Project Spirit
                  </button>
                </div>
              )}
            </div>
          
          {/* Delete Button - Bottom Left */}
          <div className="mt-auto pt-6 border-t border-neutral-200">
            <button
              onClick={handleDeleteProject}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-epilogue w-full"
              title="Delete project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Project</span>
            </button>
          </div>
          </div>
        </div>
      </div>
      
      {/* Resize Handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neutral-300 transition-colors ${
          isResizing ? 'bg-neutral-400' : 'bg-transparent hover:bg-neutral-200'
        }`}
        onMouseDown={handleMouseDown}
        title="Drag to resize sidebar"
      >
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-8 bg-neutral-300 rounded-l opacity-0 hover:opacity-100 transition-opacity"></div>
      </div>
      
      {/* Spirit Chat Modal */}
      {spirit && (
        <SpiritChat
          spirit={spirit}
          project={project}
          tasks={tasks}
          timeEntries={timeEntries}
          isOpen={isSpiritChatOpen}
          onClose={() => setIsSpiritChatOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectSidebar;


