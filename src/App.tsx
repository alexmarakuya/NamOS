import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import FinancialApp from './FinancialApp';
import TimeApp from './TimeApp';
import TasksApp from './TasksApp';
import LeftNav from './components/LeftNav';
import { SpiritProvider } from './contexts/SpiritContext';

function AppContent() {
  const location = useLocation();
  
  // Determine active app from URL
  const getActiveApp = (): 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients' => {
    if (location.pathname.startsWith('/financial')) return 'financial';
    if (location.pathname.startsWith('/timesheet')) return 'timesheet';
    if (location.pathname.startsWith('/projects')) return 'projects';
    if (location.pathname.startsWith('/tasks')) return 'tasks';
    if (location.pathname.startsWith('/clients')) return 'clients';
    return 'projects';
  };

  const handleAppChange = (app: 'financial' | 'timesheet' | 'projects' | 'tasks' | 'clients') => {
    switch (app) {
      case 'financial':
        window.location.href = '/financial';
        break;
      case 'timesheet':
        window.location.href = '/timesheet';
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
    }
  };

  return (
    <div className="dashboard-container flex">
      {/* Left Navigation */}
      <LeftNav 
        activeApp={getActiveApp()} 
        onAppChange={handleAppChange}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 dashboard-main py-12">
        <Routes>
          <Route path="/financial/*" element={<FinancialApp />} />
          <Route path="/timesheet/*" element={<TimeApp />} />
          <Route path="/tasks" element={<TasksApp />} />
          <Route path="/projects" element={<TasksApp />} />
          <Route path="/projects/:projectId" element={<TasksApp />} />
          <Route path="/clients" element={<TasksApp />} />
          <Route path="/" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <SpiritProvider>
        <AppContent />
      </SpiritProvider>
    </Router>
  );
}

export default App;
