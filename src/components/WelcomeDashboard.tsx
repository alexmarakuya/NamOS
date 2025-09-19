import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks, useProjects, useTimeEntries } from '../hooks/useSupabase';

const WelcomeDashboard: React.FC = () => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { timeEntries } = useTimeEntries();

  // Calculate user-specific stats
  const userStats = useMemo(() => {
    if (!user) return { assignedTasks: 0, workingProjects: 0, supportingClients: 0, monthlyHours: 0 };

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

    // Hours logged this month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyHours = timeEntries
      .filter(entry => {
        if (!entry.date || !entry.user_id) return false;
        const entryDate = new Date(entry.date);
        return (
          entry.user_id === user.id &&
          entryDate.getMonth() === currentMonth &&
          entryDate.getFullYear() === currentYear
        );
      })
      .reduce((total, entry) => total + (entry.hours || 0), 0);

    return {
      assignedTasks,
      workingProjects,
      supportingClients,
      monthlyHours: Math.round(monthlyHours * 10) / 10 // Round to 1 decimal
    };
  }, [user, tasks, projects, timeEntries]);

  const displayName = user?.full_name || user?.slack_username || 'User';

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Assigned Tasks */}
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 font-dm-sans mb-2">
              {userStats.assignedTasks}
            </div>
            <div className="text-sm text-gray-600 font-dm-sans">
              Tasks Assigned
            </div>
          </div>

          {/* Working Projects */}
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 font-dm-sans mb-2">
              {userStats.workingProjects}
            </div>
            <div className="text-sm text-gray-600 font-dm-sans">
              Projects Working
            </div>
          </div>

          {/* Supporting Clients */}
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 font-dm-sans mb-2">
              {userStats.supportingClients}
            </div>
            <div className="text-sm text-gray-600 font-dm-sans">
              Clients Supporting
            </div>
          </div>

          {/* Monthly Hours */}
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="text-2xl font-semibold text-gray-900 font-dm-sans mb-2">
              {userStats.monthlyHours}h
            </div>
            <div className="text-sm text-gray-600 font-dm-sans">
              Hours This Month
            </div>
          </div>
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
