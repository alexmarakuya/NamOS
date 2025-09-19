import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTasks, useProjects } from '../hooks/useSupabase';

const WelcomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { projects } = useProjects();

  // Calculate user-specific stats
  const userStats = useMemo(() => {
    if (!user) return { assignedTasks: 0, workingProjects: 0, supportingClients: 0 };

    // Tasks assigned to current user
    const assignedTasks = tasks.filter(task => task.assigned_to === user.id).length;

    // Projects where user is involved (either assigned tasks or created projects)
    const userTaskProjectIds = new Set(
      tasks
        .filter(task => task.assigned_to === user.id)
        .map(task => task.project_id)
        .filter(Boolean)
    );
    const workingProjects = projects.filter(project => 
      userTaskProjectIds.has(project.id) || project.created_by === user.id
    ).length;

    // Clients from projects user is working on
    const supportingClients = new Set(
      projects
        .filter(project => userTaskProjectIds.has(project.id) || project.created_by === user.id)
        .map(project => project.client_name)
        .filter(Boolean)
    ).size;

    return {
      assignedTasks,
      workingProjects,
      supportingClients
    };
  }, [user, tasks, projects]);

  const displayName = user?.full_name || user?.slack_username || 'User';

  // Navigation handlers
  const handleTasksClick = () => {
    navigate('/tasks?filter=my');
  };

  const handleProjectsClick = () => {
    navigate('/projects?filter=my');
  };

  const handleClientsClick = () => {
    navigate('/clients?filter=my');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        {/* Welcome Message */}
        <div className="mb-12">
          <h1 className="text-3xl font-light text-gray-900 font-dm-sans mb-2">
            Welcome back to NamOS
          </h1>
          <p className="text-xl text-gray-600 font-dm-sans">
            {displayName}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-xl mx-auto">
          {/* Assigned Tasks */}
          <button 
            onClick={handleTasksClick}
            className="bg-gray-50 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="text-2xl font-semibold text-gray-900 font-dm-sans mb-2">
              {userStats.assignedTasks}
            </div>
            <div className="text-sm text-gray-600 font-dm-sans">
              Tasks Assigned
            </div>
          </button>

          {/* Working Projects */}
          <button 
            onClick={handleProjectsClick}
            className="bg-gray-50 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="text-2xl font-semibold text-gray-900 font-dm-sans mb-2">
              {userStats.workingProjects}
            </div>
            <div className="text-sm text-gray-600 font-dm-sans">
              Projects Working
            </div>
          </button>

          {/* Supporting Clients */}
          <button 
            onClick={handleClientsClick}
            className="bg-gray-50 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="text-2xl font-semibold text-gray-900 font-dm-sans mb-2">
              {userStats.supportingClients}
            </div>
            <div className="text-sm text-gray-600 font-dm-sans">
              Clients Supporting
            </div>
          </button>
        </div>

        {/* Navigation Hint */}
        <div className="mt-12">
          <p className="text-sm text-gray-500 font-dm-sans">
            Use the navigation on the left to explore your projects, tasks, and clients
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
