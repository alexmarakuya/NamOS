import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Client } from '../types';
import { useClientOperations, useProjects } from '../hooks/useSupabase';

interface ClientDetailModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdate?: (clientId: string, updates: Partial<Client>) => void;
  onClientDelete?: (clientId: string) => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  isOpen,
  onClose,
  onClientUpdate,
  onClientDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>(client);
  const [activeTab, setActiveTab] = useState<'details' | 'projects' | 'files'>('details');
  
  const { updateClient, deleteClient } = useClientOperations();
  const { projects } = useProjects();
  
  // Filter projects for this client
  const clientProjects = projects.filter(project => 
    project.client_id === client.id || project.client_name === client.name
  );

  useEffect(() => {
    setEditedClient(client);
  }, [client]);

  const handleSave = async () => {
    try {
      await updateClient(client.id, editedClient);
      onClientUpdate?.(client.id, editedClient);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update client:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      try {
        await deleteClient(client.id);
        onClientDelete?.(client.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete client:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'leads': return 'bg-blue-100 text-blue-800';
      case 'onboarding': return 'bg-yellow-100 text-yellow-800';
      case 'off-boarded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClientAvatar = (clientName: string) => {
    const initials = clientName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return initials;
  };

  const getAvatarColor = (clientName: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
    ];
    const index = clientName.length % colors.length;
    return colors[index];
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex">
      <div className="fixed top-0 right-0 bottom-0 bg-white shadow-2xl z-[60] flex flex-col overflow-hidden border-l border-gray-200" style={{ width: '48vw', minWidth: '640px' }}>
        {/* Control Bar - Full Width */}
        <div className="flex-shrink-0 w-full bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors border-none bg-transparent"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-dm-sans border-none bg-transparent flex items-center space-x-1.5"
              >
                {isEditing ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-md transition-colors font-dm-sans border-none bg-transparent flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Header - Client Title */}
        <div className="flex-shrink-0 px-12 pt-8 pb-6">
          <div className="flex items-center space-x-4 mb-2">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-semibold ${getAvatarColor(client.name)}`}>
              {getClientAvatar(client.name)}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 font-dm-sans mb-1">{client.name}</h1>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.status)}`}>
                  {client.status}
                </span>
                <span className="text-sm text-gray-500 font-dm-sans">
                  {client.projectCount} project{client.projectCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Notion-like */}
        <div className="flex-shrink-0 px-12 pb-6">
          <div className="flex items-center space-x-6">
            {(['details', 'projects', 'files'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-0 py-1 text-base font-medium capitalize transition-colors font-dm-sans border-none bg-transparent ${
                  activeTab === tab
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'projects' && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {clientProjects.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Notion-like */}
        <div className="flex-1 px-12 pb-12 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-1">
                {/* Client Name */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Client</span>
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedClient.name || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                        className="w-full px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md border-0 focus:ring-0 font-dm-sans font-medium"
                        placeholder="Enter client name"
                      />
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md font-medium font-dm-sans">
                        ☀️ {client.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Email */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Email</span>
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedClient.contact_email || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, contact_email: e.target.value })}
                        className="w-full px-0 py-1 text-sm text-gray-700 bg-transparent border-0 focus:ring-0 font-dm-sans"
                        placeholder="Enter contact email"
                      />
                    ) : (
                      <span className="text-sm text-gray-600 font-dm-sans">
                        {client.contact_email || 'Empty'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Phone</span>
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedClient.contact_phone || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, contact_phone: e.target.value })}
                        className="w-full px-0 py-1 text-sm text-gray-700 bg-transparent border-0 focus:ring-0 font-dm-sans"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <span className="text-sm text-gray-600 font-dm-sans">
                        {client.contact_phone || 'Empty'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 00-9 9m0 0a9 9 0 019-9" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Website</span>
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="url"
                        value={editedClient.website || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, website: e.target.value })}
                        className="w-full px-0 py-1 text-sm text-gray-700 bg-transparent border-0 focus:ring-0 font-dm-sans"
                        placeholder="Enter website URL"
                      />
                    ) : (
                      <span className="text-sm text-gray-600 font-dm-sans">
                        {client.website ? (
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {client.website}
                          </a>
                        ) : (
                          'Empty'
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center py-1.5 hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors">
                  <div className="flex items-center space-x-3 w-32 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600 font-dm-sans">Status</span>
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <select
                        value={editedClient.status || ''}
                        onChange={(e) => setEditedClient({ ...editedClient, status: e.target.value as any })}
                        className="w-full px-2 py-1 text-sm bg-green-100 text-green-800 rounded-md border-0 focus:ring-0 font-dm-sans font-medium"
                      >
                        <option value="leads">Leads</option>
                        <option value="onboarding">Onboarding</option>
                        <option value="active">Active</option>
                        <option value="off-boarded">Off-boarded</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 text-sm rounded-md font-medium font-dm-sans ${getStatusColor(client.status)}`}>
                        ● {client.status}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Statistics */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 font-dm-sans">Statistics</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 font-dm-sans">Total Projects</p>
                    <p className="text-2xl font-semibold text-gray-900 font-dm-sans">{clientProjects.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 font-dm-sans">Active Projects</p>
                    <p className="text-2xl font-semibold text-gray-900 font-dm-sans">
                      {clientProjects.filter(p => p.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 font-dm-sans">Projects</h3>
              {clientProjects.length > 0 ? (
                <div className="grid gap-4">
                  {clientProjects.map((project) => (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 font-dm-sans">{project.name}</h4>
                          <p className="text-sm text-gray-600 font-dm-sans">{project.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          project.status === 'active' ? 'bg-green-100 text-green-800' :
                          project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 font-dm-sans">No projects found for this client.</p>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 font-dm-sans">Files & Documents</h3>
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 font-dm-sans">File management coming soon</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-dm-sans"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-dm-sans"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ClientDetailModal;