import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Task, TaskStats, Project, TeamMember, TimeEntry } from './types';
import { useProjects, useTeamMembers, useTasks, useTaskOperations, useProjectStats, useUrgentTasks, useTimeSensitiveProjects, useBusinessUnits, useProjectOperations, useClientsWithStatus, useClientOperations } from './hooks/useSupabase';
import KanbanBoard from './components/KanbanBoard';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import TaskList from './components/TaskList';
import AddTaskModal from './components/AddTaskModal';
import AddProjectModal from './components/AddProjectModal';
import TaskDetailModal from './components/TaskDetailModal';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import TimeLogModal from './components/TimeLogModal';
import ProjectsPage from './components/ProjectsPage';
import ProjectSidebar from './components/ProjectSidebar';
import ClientsPage from './components/ClientsPage';

// No mock data - using real data from Supabase

function TasksApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  
  // TODO: Replace with actual user ID from auth context when implemented
  const currentUserId = 'current-user';
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [viewMode, setViewMode] = useState<'kanban'>('kanban');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  // Determine current view and selected project from URL
  const currentView = useMemo(() => {
    if (location.pathname === '/projects') {
      return 'projects-overview';
    } else if (location.pathname === '/tasks') {
      return 'tasks-overview';
    } else if (location.pathname === '/clients') {
      return 'clients-overview';
    } else if (projectId) {
      return 'project-detail';
    }
    return 'projects-overview';
  }, [location.pathname, projectId]);

  const selectedProject = projectId || null;
  
  // Use internal selected project state
  const effectiveSelectedProject = selectedProject;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [prefilledStatus, setPrefilledStatus] = useState<Task['status'] | undefined>(undefined);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [timeLogTask, setTimeLogTask] = useState<Task | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isTimeLogModalOpen, setIsTimeLogModalOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>('all');
  const [projectGroupBy, setProjectGroupBy] = useState<'client' | 'status'>('client');
  const [activeProjectTab, setActiveProjectTab] = useState<'tasks' | 'files' | 'timesheet' | 'reports' | 'ai-chat'>('tasks');
  
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  
  // Get projects and team members
  const { projects = [], loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { teamMembers = [], loading: teamMembersLoading } = useTeamMembers();
  const { clients = [], loading: clientsLoading, refetch: refetchClients } = useClientsWithStatus();
  const { businessUnits } = useBusinessUnits();
  const { createProject, updateProject, deleteProject } = useProjectOperations();
  const { createClient } = useClientOperations();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setTeamDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get real data from Supabase
  const { tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useTasks(effectiveSelectedProject || undefined, selectedAssignee);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stats: projectStats, loading: projectStatsLoading } = useProjectStats();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { urgentTasks, loading: urgentTasksLoading } = useUrgentTasks();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { timeSensitiveProjects, loading: timeSensitiveLoading } = useTimeSensitiveProjects();
  const { createTask, updateTask, deleteTask } = useTaskOperations();

  // Filter tasks based on current view and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // For project detail view, only show tasks from selected project
      if (currentView === 'project-detail' && effectiveSelectedProject) {
        const projectMatch = task.project_id === effectiveSelectedProject;
        const assigneeMatch = selectedAssignee === 'all' || task.assigned_to === selectedAssignee;
        return projectMatch && assigneeMatch;
      }
      
      // For tasks overview, show all tasks with optional assignee filter
      if (currentView === 'tasks-overview') {
        // Apply stat filter if active
        let matchesStatFilter = true;
        if (activeStatFilter && activeStatFilter !== 'all') {
          switch (activeStatFilter) {
            case 'my':
              // Tasks assigned to or created by current user (placeholder logic)
              matchesStatFilter = task.assigned_to === 'current-user' || task.created_by === 'current-user';
              break;
            case 'overdue':
              matchesStatFilter = task.due_date && new Date(task.due_date) < new Date();
              break;
            case 'completed':
              matchesStatFilter = task.status === 'done';
              break;
            default:
              matchesStatFilter = true;
          }
        }
        
        const assigneeMatch = selectedAssignee === 'all' || task.assigned_to === selectedAssignee;
        return matchesStatFilter && assigneeMatch;
      }
      
      // Other views don't show tasks
      return false;
    });
  }, [tasks, currentView, effectiveSelectedProject, selectedAssignee, activeStatFilter]);


  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // Convert the Task updates to the format expected by the database
      const dbUpdates = {
        ...updates,
        due_date: updates.due_date ? updates.due_date.toISOString() : undefined
      };
      await updateTask(taskId, dbUpdates);
      // Only refetch if there's an error - the optimistic update should be sufficient
      // refetchTasks(); // Removed to prevent screen flashing
    } catch (error) {
      console.error('Failed to update task:', error);
      // Refetch on error to revert optimistic update
      refetchTasks();
    }
  }, [updateTask, refetchTasks]);

  const handleTaskCreate = useCallback(async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const createTaskPayload = {
        title: taskData.title,
        description: taskData.description,
        project_id: taskData.project_id,
        assigned_to: taskData.assigned_to,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.due_date?.toISOString(),
        estimated_hours: taskData.estimated_hours,
        tags: taskData.tags
      };
      
      // Close modal first to prevent flash
      setIsAddModalOpen(false);
      setPrefilledStatus(undefined);
      
      await createTask(createTaskPayload);
      
      // Refetch tasks to get the new task with proper ID
      await refetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      // Reopen modal on error
      setIsAddModalOpen(true);
    }
  }, [createTask, refetchTasks]);

  // Instant task creation function
  const handleInstantTaskCreate = useCallback(async (status?: Task['status']) => {
    try {
      const defaultTaskData = {
        title: 'New Task',
        description: '',
        project_id: effectiveSelectedProject || undefined,
        status: status || 'todo',
        priority: 'medium' as const,
        tags: []
      };
      
      const newTask = await createTask(defaultTaskData);
      
      // Refetch tasks to get the new task with proper ID
      await refetchTasks();
      
      // Open the task detail modal for the new task
      if (newTask && newTask.id) {
        setSelectedTaskId(newTask.id);
        setIsTaskDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  }, [createTask, refetchTasks, effectiveSelectedProject]);

  const handleAddTaskToColumn = (status: Task['status']) => {
    handleInstantTaskCreate(status);
  };

  const handleProjectCreate = useCallback(async (projectData: any) => {
    try {
      const newProject = await createProject(projectData);
      
      // Refresh the projects data to show the new project
      await refetchProjects();
      
      setIsAddProjectModalOpen(false);
      setEditingProject(null);
      
      // Navigate to the new project immediately
      if (newProject && newProject.id) {
        navigate(`/projects/${newProject.id}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  }, [createProject, refetchProjects, navigate]);

  // Instant project creation function
  const handleInstantProjectCreate = useCallback(async () => {
    try {
      const defaultProjectData = {
        name: 'New Project',
        description: '',
        status: 'active' as const,
        is_active: true
      };
      
      const newProject = await createProject(defaultProjectData);
      
      // Refresh the projects data to show the new project
      await refetchProjects();
      
      // Navigate to the new project immediately
      if (newProject && newProject.id) {
        navigate(`/projects/${newProject.id}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  }, [createProject, refetchProjects, navigate]);

  // Inline project update function for sidebar
  const handleInlineProjectUpdate = useCallback(async (updates: Partial<Project>) => {
    if (!effectiveSelectedProject) return;
    
    try {
      await updateProject(effectiveSelectedProject, updates);
      await refetchProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    }
  }, [effectiveSelectedProject, updateProject, refetchProjects]);

  const handleProjectUpdate = useCallback(async (projectData: any) => {
    if (editingProject) {
      try {
        // Clean up the updates object - remove undefined values that might cause issues
        const updates: any = {
          name: projectData.name,
          is_active: projectData.status !== 'completed'
        };

        // Only add fields that have actual values and are safe to update
        if (projectData.description !== undefined && projectData.description !== '') {
          updates.description = projectData.description;
        }
        if (projectData.client_name !== undefined && projectData.client_name !== '') {
          updates.client_name = projectData.client_name;
        }
        if (projectData.business_unit_id !== undefined && projectData.business_unit_id !== '') {
          updates.business_unit_id = projectData.business_unit_id;
        }
        
        // Update status and deadline
        if (projectData.status !== undefined) {
          updates.status = projectData.status;
        }
        if (projectData.deadline !== undefined && projectData.deadline !== '') {
          updates.deadline = projectData.deadline;
        }
        
        await updateProject(editingProject.id, updates);
        
        // Refresh the projects data to show updated information
        await refetchProjects();
        
        setIsAddProjectModalOpen(false);
        setEditingProject(null);
      } catch (error) {
        console.error('Failed to update project:', error);
        alert(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      }
    }
  }, [editingProject, updateProject, refetchProjects]);

  const handleProjectDelete = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setIsAddProjectModalOpen(false);
      setEditingProject(null);
      // Navigate back to projects overview after deletion
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  }, [deleteProject, navigate]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      // Close task detail modal if it's open
      setIsTaskDetailModalOpen(false);
      setSelectedTask(null);
      setSelectedTaskId(null);
      // Refresh tasks to remove the deleted task
      await refetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  }, [deleteTask, refetchTasks]);

  const handleInstantClientCreate = useCallback(async () => {
    try {
      const defaultClientData = {
        name: 'New Client',
        status: 'leads' as const
      };
      
      const newClient = await createClient(defaultClientData);
      
      if (newClient) {
        // Refresh clients to show the new client
        await refetchClients();
        alert('Client created successfully! You can edit the details in the clients view.');
      }
    } catch (error) {
      console.error('Failed to create client:', error);
      alert('Failed to create client. Please try again.');
    }
  }, [createClient, refetchClients]);

  const handleTaskClick = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task);
    }
  }, [tasks]);


  if (projectsLoading || teamMembersLoading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-neutral-300 font-dm-sans">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-dm-sans mb-4">Error loading tasks</p>
          <p className="text-neutral-400 text-sm mb-4">{tasksError}</p>
          <button
            onClick={refetchTasks}
            className="px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="flex h-full w-full gap-0 rounded-[28px] overflow-hidden" style={{ backgroundColor: (currentView === 'projects-overview' || currentView === 'clients-overview' || currentView === 'tasks-overview') ? 'transparent' : '#F8F8F8' }}>
      
      {/* Project Sidebar - Side by side at top level */}
      {currentView === 'project-detail' && effectiveSelectedProject && (
        <div className="flex-shrink-0 m-4" style={{ height: 'calc(100% - 32px)' }}>
        <ProjectSidebar
          project={projects.find(p => p.id === effectiveSelectedProject)!}
          teamMembers={teamMembers}
            isOpen={true}
            onToggle={() => {}}
          onBack={() => navigate('/projects')}
          onEdit={() => {
            const currentProject = projects.find(p => p.id === effectiveSelectedProject);
            if (currentProject) {
              setEditingProject(currentProject);
              setIsAddProjectModalOpen(true);
            }
          }}
          onUpdateProject={handleInlineProjectUpdate}
          onDelete={handleProjectDelete}
        />
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden p-6" style={{ backgroundColor: 'transparent' }}>
        {/* Conditional Layout: Project Detail vs Other Views */}
        {currentView === 'project-detail' && effectiveSelectedProject ? (
          <>
            {/* Project Detail Content */}
            <div className="flex flex-col h-full">
                {/* Header with Tab Navigation and Actions */}
                <div className="flex justify-between items-center mb-6">
                  {/* Tab Navigation */}
                  <nav className="flex space-x-6">
                    <button
                      onClick={() => setActiveProjectTab('tasks')}
                      className={`py-2 px-1 font-medium text-base transition-colors font-dm-sans ${
                        activeProjectTab === 'tasks'
                          ? 'text-orange-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                Tasks
                    </button>
                    <button
                      onClick={() => setActiveProjectTab('files')}
                      className={`py-2 px-1 font-medium text-base transition-colors font-dm-sans ${
                        activeProjectTab === 'files'
                          ? 'text-orange-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Files
                    </button>
                    <button
                      onClick={() => setActiveProjectTab('timesheet')}
                      className={`py-2 px-1 font-medium text-base transition-colors font-dm-sans ${
                        activeProjectTab === 'timesheet'
                          ? 'text-orange-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Timesheet
                    </button>
                    <button
                      onClick={() => setActiveProjectTab('reports')}
                      className={`py-2 px-1 font-medium text-base transition-colors font-dm-sans ${
                        activeProjectTab === 'reports'
                          ? 'text-orange-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Reports
                    </button>
                    <button
                      onClick={() => setActiveProjectTab('ai-chat')}
                      className={`py-2 px-1 font-medium text-base transition-colors font-dm-sans ${
                        activeProjectTab === 'ai-chat'
                          ? 'text-orange-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      AI Chat
                    </button>
                  </nav>

                  {/* Actions */}
                  <div className="flex items-center space-x-4">
                    {/* Team Member Filter Dropdown */}
                    <div className="relative" ref={teamDropdownRef}>
                      <button
                        onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                        className="px-3 py-2 text-sm font-medium transition-all duration-200 font-dm-sans flex items-center gap-2 text-slate-700 hover:bg-gray-100 rounded-lg border border-gray-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        {selectedAssignee === 'all' ? 'All Members' : teamMembers.find(m => m.id === selectedAssignee)?.full_name || 'Select Member'}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {teamDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-64 overflow-y-auto dropdown-scrollbar">
                          <button
                            onClick={() => {
                              setSelectedAssignee('all');
                              setTeamDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-dm-sans ${
                              selectedAssignee === 'all' ? 'bg-accent-50 text-accent-700' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            All Members
                          </button>
                          {teamMembers.map(member => (
                            <button
                              key={member.id}
                              onClick={() => {
                                setSelectedAssignee(member.id);
                                setTeamDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-dm-sans ${
                                selectedAssignee === member.id ? 'bg-accent-50 text-accent-700' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {member.full_name || member.slack_username}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Task Button */}
                    <button
                      onClick={() => handleInstantTaskCreate()}
                      className="px-3 py-2 text-sm font-medium transition-all duration-200 font-dm-sans flex items-center gap-2 text-slate-700 hover:bg-gray-100 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Task
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1">
                  {activeProjectTab === 'tasks' ? (
                    <KanbanBoard 
                      tasks={filteredTasks}
                      projects={projects}
                      teamMembers={teamMembers}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskClick={handleTaskClick}
                      onAddTask={handleAddTaskToColumn}
                      isProjectDetail={true}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {activeProjectTab === 'files' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          )}
                          {activeProjectTab === 'timesheet' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                          {activeProjectTab === 'reports' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          )}
                          {activeProjectTab === 'ai-chat' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          )}
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2 font-dm-sans">
                          {activeProjectTab === 'files' && 'Files'}
                          {activeProjectTab === 'timesheet' && 'Timesheet'}
                          {activeProjectTab === 'reports' && 'Reports'}
                          {activeProjectTab === 'ai-chat' && 'AI Chat'}
                        </h3>
                        <p className="text-gray-500 font-dm-sans">This feature is coming soon!</p>
                        <p className="text-sm text-gray-400 mt-2 font-dm-sans">
                          We're working hard to bring you this functionality.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
            </div>
            </>
          ) : (
            <>
            {/* Standard Layout for Other Views */}
      {/* Full Width Header */}
      <div className="flex justify-between items-center mb-6">
        {/* Page Title with Filter Display */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 font-dm-sans">
            {currentView === 'projects-overview' ? 'Projects' : 
             currentView === 'tasks-overview' ? 'Tasks' : 
             currentView === 'clients-overview' ? 'Clients' : 'Overview'}
            {activeStatFilter && (
              <>
                <span className="text-neutral-500 font-normal text-sm" style={{ 
                  transform: 'translateY(-6px)',
                  marginLeft: '5px',
                  marginRight: '5px'
                }}>•</span>
                <span className="text-2xl font-normal text-slate-600 font-dm-sans">
                  {activeStatFilter === 'all' ? (
                    currentView === 'projects-overview' ? 'All Projects' :
                    currentView === 'tasks-overview' ? 'All Tasks' :
                    'All Clients'
                  ) : activeStatFilter === 'my' ? (
                    currentView === 'projects-overview' ? 'My Projects' :
                    currentView === 'tasks-overview' ? 'My Tasks' :
                    'My Clients'
                  ) : activeStatFilter === 'overdue' ? 'Overdue' :
                    activeStatFilter === 'updates' ? 'Recent Updates' :
                    activeStatFilter === 'completed' ? 'Completed' :
                    activeStatFilter === 'active' ? 'Active' :
                    activeStatFilter === 'leads' ? 'Leads' :
                    activeStatFilter === 'onboarding' ? 'Onboarding' : activeStatFilter}
                </span>
            </>
          )}
              </h1>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center space-x-4">
          {/* Filters - Only show for tasks views */}
          {(currentView === 'tasks-overview' || currentView === 'project-detail') && (
            <>
          {/* Team Member Filter Dropdown */}
          <div className="relative" ref={teamDropdownRef}>
            <button
              onClick={() => {
                setTeamDropdownOpen(!teamDropdownOpen);
              }}
                  className="flex items-center space-x-3 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 font-dm-sans border whitespace-nowrap border-neutral-200 bg-transparent text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {selectedAssignee === 'all' ? (
                  <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-300 hover:bg-neutral-400 flex items-center justify-center text-white text-xs font-medium transition-colors duration-200">
                    <span>
                      {(teamMembers.find(m => m.id === selectedAssignee)?.full_name || teamMembers.find(m => m.id === selectedAssignee)?.slack_username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span>{selectedAssignee === 'all' ? 'All Members' : teamMembers.find(m => m.id === selectedAssignee)?.full_name || teamMembers.find(m => m.id === selectedAssignee)?.slack_username || 'Member'}</span>
            </button>
            
            {teamDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-64 overflow-y-auto dropdown-scrollbar">
                <button
                  onClick={() => {
                    setSelectedAssignee('all');
                    setTeamDropdownOpen(false);
                  }}
                      className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-dm-sans rounded-md ${
                    selectedAssignee === 'all' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                  }`}
                >
                  <span>Show all</span>
                </button>
                {teamMembers.map((member: TeamMember) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedAssignee(member.id);
                      setTeamDropdownOpen(false);
                    }}
                        className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-dm-sans rounded-md ${
                      selectedAssignee === member.id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-neutral-300 hover:bg-neutral-400 flex items-center justify-center text-white text-xs font-medium transition-colors duration-200">
                      {(member.full_name || member.slack_username).charAt(0).toUpperCase()}
                    </div>
                    <span>{member.full_name || member.slack_username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
            </>
          )}

          <div className="flex items-center space-x-4">
            {/* Project View Toggles - Only show for projects overview */}
            {currentView === 'projects-overview' && (
              <div className="flex items-center space-x-2">
            <button
                  onClick={() => setProjectGroupBy('status')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors font-dm-sans ${
                    projectGroupBy === 'status'
                      ? 'bg-orange-100 text-orange-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Status
                </button>
                <button
                  onClick={() => setProjectGroupBy('client')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors font-dm-sans ${
                    projectGroupBy === 'client'
                      ? 'bg-orange-100 text-orange-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Client
                </button>
              </div>
            )}

            {/* Add Button */}
            {(currentView === 'projects-overview' || currentView === 'tasks-overview' || currentView === 'clients-overview' || currentView === 'project-detail') && (
            <button
                onClick={() => {
                  if (currentView === 'projects-overview') {
                    handleInstantProjectCreate();
                  } else if (currentView === 'clients-overview') {
                    handleInstantClientCreate();
                  } else {
                    handleInstantTaskCreate();
                  }
                }}
                className="px-3 py-2 text-sm font-medium transition-all duration-200 font-dm-sans flex items-center gap-2 text-slate-700 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
                {currentView === 'projects-overview' ? 'Add Project' : 
                 currentView === 'clients-overview' ? 'Add Client' : 'Add Task'}
            </button>
          )}
          </div>
        </div>
        </div>

      {/* Two Column Layout */}
      <div className="flex gap-6 flex-1">
        {/* Left Sidebar - Navigation & Filters */}
        {(currentView === 'projects-overview' || currentView === 'tasks-overview' || currentView === 'clients-overview') && (
          <div className="w-52 flex-shrink-0">
            {/* Navigation Filters */}
            <div className="space-y-2">
              {/* Navigation Filter Buttons */}
        {currentView === 'projects-overview' ? (
          <>
                  <button 
              onClick={() => setActiveStatFilter('all')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'all'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>All Projects</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'all' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {projects.filter(p => {
                  const status = p.status || (p.is_active ? 'active' : 'completed');
                  return status !== 'completed';
                      }).length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveStatFilter('my')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'my'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>My Projects</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'my'
                        ? 'bg-white text-gray-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {projects.filter(p => {
                        const status = p.status || (p.is_active ? 'active' : 'completed');
                        return status !== 'completed' && (p.created_by === currentUserId || p.assigned_to === currentUserId);
                      }).length}
                    </span>
                  </button>
                  <button 
              onClick={() => setActiveStatFilter('overdue')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'overdue'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Overdue</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'overdue' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {projects.filter(p => p.deadline && new Date(p.deadline) < new Date()).length}
                    </span>
                  </button>
                  <button 
                onClick={() => setActiveStatFilter('updates')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'updates'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Recent Updates</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'updates' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {projects.filter(p => {
                        if (!p.updated_at) return false;
                        const updatedDate = new Date(p.updated_at);
                        const threeDaysAgo = new Date();
                        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                        return updatedDate > threeDaysAgo;
                      }).length}
                    </span>
                  </button>
            </>
          ) : currentView === 'tasks-overview' ? (
            <>
                  <button 
                    onClick={() => setActiveStatFilter('all')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'all'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>All Tasks</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'all' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tasks.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveStatFilter('my')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'my'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>My Tasks</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'my'
                        ? 'bg-white text-gray-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tasks.filter(t => t.assigned_to === currentUserId || t.created_by === currentUserId).length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveStatFilter('overdue')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'overdue'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Overdue</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'overdue' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveStatFilter('completed')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'completed'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Completed</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'completed' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tasks.filter(t => t.status === 'completed').length}
                    </span>
                  </button>
            </>
          ) : currentView === 'clients-overview' ? (
            <>
                  <button 
                    onClick={() => setActiveStatFilter('all')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'all'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>All Clients</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'all' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {clients.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveStatFilter('my')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'my'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>My Clients</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'my'
                        ? 'bg-white text-gray-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {clients.filter(c => c.created_by === currentUserId || c.assigned_to === currentUserId).length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveStatFilter('active')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'active'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Active</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'active' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {clients.filter(c => c.status === 'active').length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveStatFilter('leads')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'leads'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Leads</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'leads' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {clients.filter(c => c.status === 'leads').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveStatFilter('onboarding')}
                    className={`w-full flex items-center justify-between pl-4 pr-2 py-2 rounded-full text-base font-medium transition-all duration-200 font-dm-sans ${
                      activeStatFilter === 'onboarding'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Onboarding</span>
                    <span className={`text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center ${
                      activeStatFilter === 'onboarding' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {clients.filter(c => c.status === 'onboarding').length}
                    </span>
                  </button>
                </>
              ) : null}
        </div>
      </div>
        )}

        {/* Right Content Area */}
        <div className="flex-1 overflow-x-auto">

      {/* Task View */}
      <div className="data-section-container">
        <div>
          {currentView === 'projects-overview' ? (
            <ProjectsPage 
              projects={projects}
              teamMembers={teamMembers}
              activeStatFilter={activeStatFilter}
              groupBy={projectGroupBy}
              onProjectSelect={(projectId) => {
                navigate(`/projects/${projectId}`);
              }}
            />
          ) : currentView === 'clients-overview' ? (
                             <ClientsPage activeStatFilter={activeStatFilter} />
          ) : (
            <div className="dashboard-card">
              <KanbanBoard 
                tasks={filteredTasks}
                projects={projects}
                teamMembers={teamMembers}
                onTaskUpdate={handleTaskUpdate}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTaskToColumn}
              />
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
          </>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <AddTaskModal
          projects={projects}
          teamMembers={teamMembers}
          onClose={() => {
            setIsAddModalOpen(false);
            setPrefilledStatus(undefined);
          }}
          onSubmit={handleTaskCreate}
          defaultProjectId={currentView === 'project-detail' ? (effectiveSelectedProject || undefined) : undefined}
          defaultStatus={prefilledStatus}
        />
      )}

      {/* Add Project Modal */}
      {isAddProjectModalOpen && (
        <AddProjectModal
          businessUnits={businessUnits}
          editProject={editingProject || undefined}
          onClose={() => {
            setIsAddProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSubmit={editingProject ? handleProjectUpdate : handleProjectCreate}
          onDelete={handleProjectDelete}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projects={projects}
          teamMembers={teamMembers}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}

      {/* Instant Task Detail Modal */}
      {selectedTaskId && isTaskDetailModalOpen && (
        <TaskDetailModal
          task={tasks.find(t => t.id === selectedTaskId)!}
          projects={projects}
          teamMembers={teamMembers}
          isOpen={isTaskDetailModalOpen}
          onClose={() => {
            setSelectedTaskId(null);
            setIsTaskDetailModalOpen(false);
          }}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}

    </div>
  );
}

export default TasksApp;
