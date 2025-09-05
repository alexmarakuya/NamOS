import React, { useState, useEffect } from 'react';
import { useTransactionOperations } from '../hooks/useSupabase';
import { DatabaseBusinessUnit } from '../lib/supabase';

// Type alias for areas
type DatabaseArea = DatabaseBusinessUnit;

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: DatabaseArea[];
  onTransactionAdded: () => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  areas,
  onTransactionAdded,
}) => {
  const { addTransaction, loading, error } = useTransactionOperations();
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    business_unit_id: '',
    date: new Date().toISOString().split('T')[0], // Today's date
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: '',
        description: '',
        type: 'income',
        category: '',
        business_unit_id: areas[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
      });
      setValidationErrors({});
    }
  }, [isOpen, areas]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }
    if (!formData.business_unit_id) {
      errors.business_unit_id = 'Business unit is required';
    }
    if (!formData.date) {
      errors.date = 'Date is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await addTransaction({
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        type: formData.type,
        category: formData.category.trim(),
        business_unit_id: formData.business_unit_id,
        date: formData.date,
      });

      onTransactionAdded();
      onClose();
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to add transaction:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidecar Modal */}
      <div className="fixed right-0 top-0 h-full w-96 bg-neutral-100 border-l border-neutral-200 shadow-2xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-neutral-200">
            <h2 className="text-xl font-medium text-neutral-900 braun-text">
              Add Transaction
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded text-lg leading-none transition-colors"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border-l-4 border-accent-500 text-red-700 px-4 py-3 braun-text">
                  {error}
                </div>
              )}

              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3 braun-label">
                  Type
                </label>
                <div className="flex space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={formData.type === 'income'}
                      onChange={handleInputChange}
                      className="mr-3 w-4 h-4 text-accent-500 focus:ring-accent-500 focus:ring-2"
                    />
                    <span className="text-neutral-700 braun-text">Income</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={formData.type === 'expense'}
                      onChange={handleInputChange}
                      className="mr-3 w-4 h-4 text-accent-500 focus:ring-accent-500 focus:ring-2"
                    />
                    <span className="text-neutral-700 braun-text">Expense</span>
                  </label>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-neutral-700 mb-3 braun-label">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 transform -translate-y-1/2 text-neutral-600 braun-text">$</span>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`w-full pl-6 pr-0 py-2 border-0 border-b bg-transparent focus:outline-none braun-text text-lg ${
                      validationErrors.amount ? 'border-red-500' : 'border-neutral-400 focus:border-neutral-700'
                    }`}
                  />
                </div>
                {validationErrors.amount && (
                  <p className="mt-2 text-sm text-red-600 braun-text">{validationErrors.amount}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-3 braun-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Enter transaction description..."
                  className={`w-full px-0 py-2 border-0 border-b bg-transparent focus:outline-none braun-text resize-none ${
                    validationErrors.description ? 'border-red-500' : 'border-neutral-400 focus:border-neutral-700'
                  }`}
                />
                {validationErrors.description && (
                  <p className="mt-2 text-sm text-red-600 braun-text">{validationErrors.description}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-3 braun-label">
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Consulting, Marketing, Food..."
                  className={`w-full px-0 py-2 border-0 border-b bg-transparent focus:outline-none braun-text ${
                    validationErrors.category ? 'border-red-500' : 'border-neutral-400 focus:border-neutral-700'
                  }`}
                />
                {validationErrors.category && (
                  <p className="mt-2 text-sm text-red-600 braun-text">{validationErrors.category}</p>
                )}
              </div>

              {/* Area */
              <div>
                <label htmlFor="business_unit_id" className="block text-sm font-medium text-neutral-700 mb-3 braun-label">
                  Area
                </label>
                <select
                  id="business_unit_id"
                  name="business_unit_id"
                  value={formData.business_unit_id}
                  onChange={handleInputChange}
                  className={`w-full px-0 py-2 border-0 border-b bg-transparent focus:outline-none braun-text appearance-none ${
                    validationErrors.business_unit_id ? 'border-red-500' : 'border-neutral-400 focus:border-neutral-700'
                  }`}
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="">Select an area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                {validationErrors.business_unit_id && (
                  <p className="mt-2 text-sm text-red-600 braun-text">{validationErrors.business_unit_id}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-neutral-700 mb-3 braun-label">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={`w-full px-0 py-2 border-0 border-b bg-transparent focus:outline-none braun-text ${
                    validationErrors.date ? 'border-red-500' : 'border-neutral-400 focus:border-neutral-700'
                  }`}
                />
                {validationErrors.date && (
                  <p className="mt-2 text-sm text-red-600 braun-text">{validationErrors.date}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex space-x-6 px-8 py-6 border-t border-neutral-200">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 text-neutral-700 hover:text-neutral-900 braun-text"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 braun-text"
              >
                {loading ? 'Adding...' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddTransactionModal;
