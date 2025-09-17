import React, { useState } from 'react';
import { useClientsWithStatus, useClientOperations } from '../hooks/useSupabase';
import StatCard from './StatCard';

interface ClientsPageProps {
  activeStatFilter?: string | null;
}

const ClientsPage: React.FC<ClientsPageProps> = ({ activeStatFilter }) => {
  // TODO: Replace with actual user ID from auth context when implemented
  const currentUserId = 'current-user';
  const { clients, loading, refetch } = useClientsWithStatus();
  const { updateClientStatus } = useClientOperations();
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

  // Filter clients based on activeStatFilter
  const filteredClients = React.useMemo(() => {
    if (!activeStatFilter) return clients;
    
    return clients.filter(client => {
      switch (activeStatFilter) {
        case 'all':
          return true;
        case 'my':
          // Clients created by or assigned to current user (placeholder logic)
          // TODO: Update when user assignment fields are added to Client interface
          return client.name.toLowerCase().includes('my');
        case 'active':
          return client.status === 'active';
        case 'leads':
          return client.status === 'leads';
        case 'onboarding':
          return client.status === 'onboarding';
        default:
          return client.status === activeStatFilter;
      }
    });
  }, [clients, activeStatFilter, currentUserId]);

  // Group clients by status for Kanban
  const clientColumns = React.useMemo(() => {
    const columns = [
      { id: 'leads', title: 'Leads', clients: [] as any[], color: '#3B82F6' },
      { id: 'onboarding', title: 'Onboarding', clients: [] as any[], color: '#F59E0B' },
      { id: 'active', title: 'Active', clients: [] as any[], color: '#10B981' },
      { id: 'on-hold', title: 'On-Hold', clients: [] as any[], color: '#8B5CF6' },
      { id: 'off-boarded', title: 'Off-Boarded', clients: [] as any[], color: '#6B7280' }
    ];

    filteredClients.forEach(client => {
      const column = columns.find(col => col.id === client.status);
      if (column) {
        column.clients.push(client);
      } else {
        // Default to active if status not found
        columns.find(col => col.id === 'active')?.clients.push(client);
      }
    });

    return columns;
  }, [filteredClients]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 font-dm-sans">Loading clients...</div>
      </div>
    );
  }


  return (
    <>
      {/* Client Kanban Board */}
      <div className="dashboard-card">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide min-h-[500px]">
          {clientColumns.map((column) => (
            <div key={column.id} className="flex flex-col rounded-2xl p-4 min-w-[280px] w-[280px] flex-shrink-0 min-h-[800px]" style={{ 
              background: 'linear-gradient(to bottom, #F8F8F8 0%, #FFFFFF 100%)'
            }}>
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-medium text-gray-900 font-dm-sans">
                    {column.title}
                  </h3>
                  <span className="text-gray-500 text-xs">
                    {column.clients.length}
                  </span>
                </div>
              </div>
              
              {/* Clients */}
              <div 
                className="space-y-3 flex-1 overflow-y-auto"
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold font-dm-sans ${getAvatarColor(client.name)}`}>
                          {getClientAvatar(client.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 font-dm-sans text-sm truncate">
                            {client.name}
                          </h4>
                          <p className="text-xs text-gray-500 font-dm-sans">
                            {client.projectCount} project{client.projectCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Project Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500 font-dm-sans">
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
                    <p className="text-sm font-dm-sans">No clients</p>
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
