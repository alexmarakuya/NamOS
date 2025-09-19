import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import FinancialApp from './FinancialApp';
// import TimeApp from './TimeApp'; // Temporarily hidden
import TasksApp from './TasksApp';
import UserApp from './UserApp';
import WelcomeDashboard from './components/WelcomeDashboard';
import LeftNav from './components/LeftNav';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { SpiritProvider } from './contexts/SpiritContext';

function AppContent() {
  const location = useLocation();
  
  // Determine active app from URL
  const getActiveApp = (): 'dashboard' | 'financial' | 'projects' | 'tasks' | 'clients' | 'users' => {
    if (location.pathname === '/dashboard' || location.pathname === '/') return 'dashboard';
    if (location.pathname.startsWith('/financial')) return 'financial';
    if (location.pathname.startsWith('/projects')) return 'projects';
    if (location.pathname.startsWith('/tasks')) return 'tasks';
    if (location.pathname.startsWith('/clients')) return 'clients';
    if (location.pathname.startsWith('/users')) return 'users';
    return 'dashboard';
  };

  const handleAppChange = (app: 'dashboard' | 'financial' | 'projects' | 'tasks' | 'clients' | 'users') => {
    switch (app) {
      case 'dashboard':
        window.location.href = '/dashboard';
        break;
      case 'financial':
        window.location.href = '/financial';
        break;
      case 'projects':
        window.location.href = '/projects';
        break;
      case 'tasks':
        window.location.href = '/tasks';
        break;
      case 'clients':
        window.location.href = '/clients';
        break;
      case 'users':
        window.location.href = '/users';
        break;
    }
  };

  // Check if we're on a project detail page
  const isProjectDetailPage = location.pathname.match(/^\/projects\/[^/]+$/);
  const dashboardMainClass = `flex-1 dashboard-main${isProjectDetailPage ? ' project-detail' : ''}`;

  return (
    <ProtectedRoute>
      <div className="dashboard-container flex h-screen">
        {/* Left Navigation */}
        <LeftNav 
          activeApp={getActiveApp()} 
          onAppChange={handleAppChange}
        />
        
        {/* Main Content Area */}
        <div className={dashboardMainClass}>
          <Routes>
            <Route path="/dashboard" element={<WelcomeDashboard />} />
            <Route path="/financial/*" element={<FinancialApp />} />
            {/* Temporarily hide timesheet */}
            {/* <Route path="/timesheet/*" element={<TimeApp />} /> */}
            <Route path="/tasks" element={<TasksApp />} />
            <Route path="/projects" element={<TasksApp />} />
            <Route path="/projects/:projectId" element={<TasksApp />} />
            <Route path="/clients" element={<TasksApp />} />
            <Route path="/users" element={<UserApp />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SpiritProvider>
          <AppContent />
        </SpiritProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
