import React, { useState, useRef, useEffect } from 'react';
import { Project, BusinessUnit } from '../types';
import { useClients } from '../hooks/useSupabase';

interface AddProjectModalProps {
  businessUnits: BusinessUnit[];
  onClose: () => void;
  onSubmit: (projectData: {
    name: string;
    description?: string;
    client_name?: string;
    business_unit_id?: string;
    status: 'active' | 'upcoming' | 'completed' | 'on_hold';
    deadline?: string;
  }) => void;
  editProject?: Project;
  onDelete?: (projectId: string) => void;
}

function AddProjectModal({ businessUnits, onClose, onSubmit, editProject, onDelete }: AddProjectModalProps) {
  const { clients, addClient } = useClients();
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  
  // Custom dropdown states
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [businessUnitDropdownOpen, setBusinessUnitDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  // Refs for dropdown management
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const businessUnitDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: editProject?.name || '',
    description: editProject?.description || '',
    client_name: editProject?.client_name || '',
    business_unit_id: editProject?.business_unit_id || '',
    status: editProject?.status || 'active' as const,
    deadline: editProject?.deadline ? editProject.deadline.split('T')[0] : ''
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
      if (businessUnitDropdownRef.current && !businessUnitDropdownRef.current.contains(event.target as Node)) {
        setBusinessUnitDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData = {
      name: formData.name,
      description: formData.description || undefined,
      client_name: formData.client_name || undefined,
      business_unit_id: formData.business_unit_id || undefined,
      status: formData.status,
      deadline: formData.deadline || undefined
    };

    onSubmit(projectData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNewClient = () => {
    if (newClientName.trim()) {
      addClient(newClientName.trim());
      setFormData(prev => ({ ...prev, client_name: newClientName.trim() }));
      setNewClientName('');
      setShowNewClientInput(false);
    }
  };

  const handleClientSelect = (clientName: string) => {
    if (clientName === '__new__') {
      setShowNewClientInput(true);
      setNewClientName('');
    } else {
      setFormData(prev => ({ ...prev, client_name: clientName }));
      setShowNewClientInput(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-epilogue">
            {editProject ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-epilogue"
              placeholder="Enter project name..."
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-epilogue"
              placeholder="Enter project description..."
            />
          </div>

          {/* Client and Business Unit Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client */}
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-2">
                Client
              </label>
              {showNewClientInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-epilogue"
                    placeholder="Enter new client name..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewClient()}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewClient}
                    className="px-3 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewClientInput(false)}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="relative" ref={clientDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                    className="w-full px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 font-epilogue border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-left flex items-center justify-between"
                  >
                    <span className={formData.client_name ? 'text-neutral-900' : 'text-neutral-500'}>
                      {formData.client_name || 'Select client...'}
                    </span>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${clientDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {clientDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          handleClientSelect('');
                          setClientDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 transition-colors font-epilogue"
                      >
                        Select client...
                      </button>
                      {clients.map(client => (
                        <button
                          key={client}
                          type="button"
                          onClick={() => {
                            handleClientSelect(client);
                            setClientDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 transition-colors font-epilogue"
                        >
                          {client}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          handleClientSelect('__new__');
                          setClientDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-accent-600 hover:bg-neutral-50 transition-colors font-epilogue border-t border-neutral-200"
                      >
                        + Add new client
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Business Unit */}
            <div>
              <label htmlFor="business_unit_id" className="block text-sm font-medium text-gray-700 mb-2">
                Business Unit
              </label>
              <div className="relative" ref={businessUnitDropdownRef}>
                <button
                  type="button"
                  onClick={() => setBusinessUnitDropdownOpen(!businessUnitDropdownOpen)}
                  className="w-full px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 font-epilogue border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-left flex items-center justify-between"
                >
                  <span className={formData.business_unit_id ? 'text-neutral-900' : 'text-neutral-500'}>
                    {businessUnits.find(unit => unit.id === formData.business_unit_id)?.name || 'Select business unit...'}
                  </span>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${businessUnitDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {businessUnitDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('business_unit_id', '');
                        setBusinessUnitDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 transition-colors font-epilogue"
                    >
                      Select business unit...
                    </button>
                    {businessUnits.map(unit => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => {
                          handleChange('business_unit_id', unit.id);
                          setBusinessUnitDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 transition-colors font-epilogue"
                      >
                        {unit.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="w-full px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 font-epilogue border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-left flex items-center justify-between"
              >
                <span className="text-neutral-900 capitalize">
                  {formData.status.replace('_', ' ')}
                </span>
                <svg className={`w-4 h-4 transition-transform duration-200 ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {statusDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                  {[
                    { value: 'active', label: 'Active' },
                    { value: 'upcoming', label: 'Upcoming' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'on_hold', label: 'On Hold' }
                  ].map(status => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => {
                        handleChange('status', status.value);
                        setStatusDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 transition-colors font-epilogue"
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
              Deadline
            </label>
            <input
              type="date"
              id="deadline"
              value={formData.deadline}
              onChange={(e) => handleChange('deadline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent font-epilogue"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            {editProject && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete the project "${editProject.name}"? This action cannot be undone.`)) {
                    // Call delete function - we'll need to pass this as a prop
                    if (onDelete) {
                      onDelete(editProject.id);
                    }
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors font-epilogue"
              >
                Delete Project
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-600 bg-transparent border border-neutral-200 hover:border-neutral-300 rounded-lg hover:bg-cream-dark transition-colors font-epilogue"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors font-epilogue"
              >
                {editProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProjectModal;
