import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Task, TaskStats, Project, TeamMember, TimeEntry } from './types';
import { useProjects, useTeamMembers, useTasks, useTaskOperations, useProjectStats, useUrgentTasks, useTimeSensitiveProjects, useBusinessUnits, useProjectOperations } from './hooks/useSupabase';
import StatCard from './components/StatCard';
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
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  
  // Get projects and team members
  const { projects = [], loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { teamMembers = [], loading: teamMembersLoading } = useTeamMembers();
  const { businessUnits } = useBusinessUnits();
  const { createProject, updateProject, deleteProject } = useProjectOperations();

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
  const { createTask, updateTask } = useTaskOperations();

  // Filter tasks based on current view and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // For project detail view, only show tasks from selected project
      if (currentView === 'project-detail' && effectiveSelectedProject) {
        const projectMatch = task.project_id === effectiveSelectedProject;
        const assigneeMatch = selectedAssignee === 'all' || task.assigned_to === selectedAssignee;
        return projectMatch && assigneeMatch;
      }
      
      return false; // Projects overview doesn't show tasks
    });
  }, [tasks, currentView, effectiveSelectedProject, selectedAssignee]);


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
          <p className="text-neutral-300 font-epilogue">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-epilogue mb-4">Error loading tasks</p>
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
    <div className="h-full">
      <div className="flex h-full gap-0 rounded-[28px] overflow-hidden" style={{ backgroundColor: (currentView === 'projects-overview' || currentView === 'clients-overview' || currentView === 'tasks-overview') ? 'transparent' : '#f8f7f4' }}>
      {/* Project Sidebar - Always show on individual project pages */}
      {currentView === 'project-detail' && effectiveSelectedProject && (
        <ProjectSidebar
          project={projects.find(p => p.id === effectiveSelectedProject)!}
          teamMembers={teamMembers}
          isOpen={true} // Always open now
          onToggle={() => {}} // No longer needed
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
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0 px-6 py-3" style={{ backgroundColor: (currentView === 'projects-overview' || currentView === 'clients-overview' || currentView === 'tasks-overview') ? 'transparent' : 'rgb(252, 252, 250)', boxShadow: (currentView === 'projects-overview' || currentView === 'clients-overview' || currentView === 'tasks-overview') ? 'none' : '-4px 0 8px rgba(0, 0, 0, 0.02)' }}>
      {/* Header and Stats Container */}
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
        <div>
          {currentView === 'projects-overview' ? (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1 font-epilogue">
                Projects
              </h1>
              <p className="text-sm text-neutral-600 font-epilogue">
                Overview of all active projects
              </p>
            </>
          ) : currentView === 'tasks-overview' ? (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1 font-epilogue">
                Tasks
              </h1>
              <p className="text-sm text-neutral-600 font-epilogue">
                All tasks across projects
              </p>
            </>
          ) : currentView === 'clients-overview' ? (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1 font-epilogue">
                Clients
              </h1>
              <p className="text-sm text-neutral-600 font-epilogue">
                Manage and view all your clients
              </p>
            </>
          ) : currentView === 'project-detail' && effectiveSelectedProject ? (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1 font-epilogue">
                Tasks
              </h1>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1 font-epilogue">
                Projects & Tasks
              </h1>
              <p className="text-sm text-neutral-600 font-epilogue">
                Manage your project tasks and track progress
              </p>
            </>
          )}
        </div>
        
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
              className="flex items-center space-x-3 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 font-epilogue border whitespace-nowrap border-neutral-200 bg-transparent text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
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
                  className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
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
                    className={`w-full flex items-center space-x-3 px-3 py-3 hover:bg-cream-dark text-left transition-colors font-epilogue rounded-md ${
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

          {(currentView === 'projects-overview' || currentView === 'tasks-overview' || currentView === 'project-detail') && (
            <button
              onClick={() => (currentView === 'projects-overview') ? handleInstantProjectCreate() : handleInstantTaskCreate()}
              className="px-4 py-2.5 h-10 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-lg transition-colors font-epilogue flex items-center"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {currentView === 'projects-overview' ? 'Add Project' : 'Add Task'}
            </button>
          )}
        </div>
        </div>

        {/* Context-Aware Stats */}
        {(currentView === 'projects-overview' || currentView === 'tasks-overview') && (
        <div className="dashboard-grid">
        {currentView === 'projects-overview' ? (
          <>
            <div 
              onClick={() => setActiveStatFilter(activeStatFilter === 'all' ? null : 'all')}
              className="cursor-pointer"
            >
              <StatCard
                title="All Projects"
                value={projects.filter(p => {
                  const status = p.status || (p.is_active ? 'active' : 'completed');
                  return status !== 'completed';
                }).length.toString()}
                change={activeStatFilter === 'all' ? 'Clear' : 'Show'}
                changeType={activeStatFilter === 'all' ? 'positive' : 'neutral'}
              />
            </div>
            <div 
              onClick={() => setActiveStatFilter(activeStatFilter === 'overdue' ? null : 'overdue')}
              className="cursor-pointer"
            >
              <StatCard
                title="Overdue Projects"
                value={projects.filter(p => p.deadline && new Date(p.deadline) < new Date()).length.toString()}
                change={activeStatFilter === 'overdue' ? 'Clear' : 'Show'}
                changeType={activeStatFilter === 'overdue' ? 'positive' : 'neutral'}
              />
            </div>
            <div 
              onClick={() => setActiveStatFilter(activeStatFilter === 'updates' ? null : 'updates')}
              className="cursor-pointer"
            >
              <StatCard
                title="Projects with Updates"
                value={projects.filter(p => p.updated_at && new Date(p.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length.toString()}
                change={activeStatFilter === 'updates' ? 'Clear' : 'Show'}
                changeType={activeStatFilter === 'updates' ? 'positive' : 'neutral'}
              />
            </div>
            <div 
              onClick={() => setActiveStatFilter(activeStatFilter === 'mentions' ? null : 'mentions')}
              className="cursor-pointer"
            >
              <StatCard
                title="Projects with Mentions"
                value={projects.filter(p => p.description?.includes('@') || p.name?.includes('@')).length.toString()}
                change={activeStatFilter === 'mentions' ? 'Clear' : 'Show'}
                changeType={activeStatFilter === 'mentions' ? 'positive' : 'neutral'}
              />
            </div>
          </>
        ) : (
          <>
        <StatCard
          title="Overdue Tasks"
          value={filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length.toString()}
          change="Past due date"
          changeType="negative"
        />
        <StatCard
          title="Tasks with Updates"
              value={filteredTasks.filter(t => t.updated_at && new Date(t.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length.toString()}
              change="Updated this week"
          changeType="positive"
        />
        <StatCard
          title="Tasks with Mentions"
              value={filteredTasks.filter(t => t.description?.includes('@') || t.title?.includes('@')).length.toString()}
              change="Requiring attention"
          changeType="neutral"
        />
        <StatCard
              title="Tasks Assigned to You"
              value={filteredTasks.filter(t => t.assigned_to && t.assigned_to.length > 0).length.toString()}
              change="Your responsibility"
              changeType="positive"
        />
          </>
        )}
        </div>
        )}
      </div>

      {/* Task View */}
      <div className="data-section-container">
        <div>
          {currentView === 'projects-overview' ? (
            <ProjectsPage 
              projects={projects}
              teamMembers={teamMembers}
              activeStatFilter={activeStatFilter}
              onProjectSelect={(projectId) => {
                navigate(`/projects/${projectId}`);
              }}
            />
          ) : currentView === 'clients-overview' ? (
            <ClientsPage />
          ) : (
            <div className="p-6 rounded-[28px] overflow-hidden" style={{ backgroundColor: 'rgb(252, 252, 250)' }}>
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
        />
      )}

      </div>
      </div>
    </div>
  );
}

export default TasksApp;
