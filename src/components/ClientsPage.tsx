import React, { useState } from 'react';
import { useClientsWithStatus, useClientOperations } from '../hooks/useSupabase';
import StatCard from './StatCard';

const ClientsPage: React.FC = () => {
  const { clients, loading, refetch } = useClientsWithStatus();
  const { updateClientStatus } = useClientOperations();
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [draggedClient, setDraggedClient] = useState<any>(null);

  // Generate client avatar (initials or logo)
  const getClientAvatar = (clientName: string) => {
    const initials = clientName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return initials;
  };

  // Generate avatar background color based on client name
  const getAvatarColor = (clientName: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
    ];
    const index = clientName.length % colors.length;
    return colors[index];
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, client: any) => {
    setDraggedClient(client);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedClient && draggedClient.status !== newStatus) {
      // Update client status
      handleUpdateClientStatus(draggedClient.name, newStatus);
    }
    setDraggedClient(null);
  };

  const handleUpdateClientStatus = async (clientName: string, newStatus: string) => {
    const success = await updateClientStatus(clientName, newStatus);
    if (success) {
      // Refetch clients to update the UI
      refetch();
    }
  };

  // Group clients by status for Kanban
  const clientColumns = React.useMemo(() => {
    const columns = [
      { id: 'leads', title: 'Leads', clients: [] as any[] },
      { id: 'onboarding', title: 'Onboarding', clients: [] as any[] },
      { id: 'active', title: 'Active', clients: [] as any[] },
      { id: 'on-hold', title: 'On-Hold', clients: [] as any[] },
      { id: 'off-boarded', title: 'Off-Boarded', clients: [] as any[] }
    ];

    clients.forEach(client => {
      const column = columns.find(col => col.id === client.status);
      if (column) {
        column.clients.push(client);
      } else {
        // Default to active if status not found
        columns.find(col => col.id === 'active')?.clients.push(client);
      }
    });

    return columns;
  }, [clients]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 font-epilogue">Loading clients...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-epilogue">Clients</h1>
        <p className="text-gray-600 font-epilogue mt-1">Manage and view all your clients</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div 
            onClick={() => setActiveStatFilter(activeStatFilter === 'all' ? null : 'all')}
            className="cursor-pointer"
          >
            <StatCard
              title="All Clients"
              value={clients.length.toString()}
              change={activeStatFilter === 'all' ? 'Clear' : 'Show'}
              changeType={activeStatFilter === 'all' ? 'positive' : 'neutral'}
            />
          </div>
          <div 
            onClick={() => setActiveStatFilter(activeStatFilter === 'active' ? null : 'active')}
            className="cursor-pointer"
          >
            <StatCard
              title="Active Clients"
              value={clientColumns.find(col => col.id === 'active')?.clients.length.toString() || '0'}
              change={activeStatFilter === 'active' ? 'Clear' : 'Show'}
              changeType={activeStatFilter === 'active' ? 'positive' : 'neutral'}
            />
          </div>
          <div 
            onClick={() => setActiveStatFilter(activeStatFilter === 'leads' ? null : 'leads')}
            className="cursor-pointer"
          >
            <StatCard
              title="Leads"
              value={clientColumns.find(col => col.id === 'leads')?.clients.length.toString() || '0'}
              change={activeStatFilter === 'leads' ? 'Clear' : 'Show'}
              changeType={activeStatFilter === 'leads' ? 'positive' : 'neutral'}
            />
          </div>
          <div 
            onClick={() => setActiveStatFilter(activeStatFilter === 'onboarding' ? null : 'onboarding')}
            className="cursor-pointer"
          >
            <StatCard
              title="Onboarding"
              value={clientColumns.find(col => col.id === 'onboarding')?.clients.length.toString() || '0'}
              change={activeStatFilter === 'onboarding' ? 'Clear' : 'Show'}
              changeType={activeStatFilter === 'onboarding' ? 'positive' : 'neutral'}
            />
          </div>
        </div>

      {/* Client Kanban Board */}
      <div className="p-6 rounded-[28px]" style={{ backgroundColor: 'rgb(252, 252, 250)' }}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 min-h-[500px]">
          {clientColumns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 font-epilogue">
                  {column.title}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-epilogue">
                  {column.clients.length}
                </span>
              </div>
              <div 
                className="flex-1 rounded-xl p-4 space-y-3 min-h-[400px]"
                style={{ backgroundColor: 'rgb(248, 247, 244)' }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {column.clients.map((client) => (
                  <div
                    key={client.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, client)}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow cursor-move"
                  >
                    <div className="space-y-3">
                      {/* Client Avatar and Name */}
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold font-epilogue ${getAvatarColor(client.name)}`}>
                          {getClientAvatar(client.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 font-epilogue text-sm truncate">
                            {client.name}
                          </h4>
                          <p className="text-xs text-gray-500 font-epilogue">
                            {client.projectCount} project{client.projectCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Project Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500 font-epilogue">
                        <span className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                          {client.activeProjects} active
                        </span>
                        <span className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></div>
                          {client.completedProjects} done
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {column.clients.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-400">
                    <p className="text-sm font-epilogue">No clients</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ClientsPage;
