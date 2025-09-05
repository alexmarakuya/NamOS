import React, { useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useCategoryBreakdown } from '../hooks/useSupabase';

interface CategoryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string;
  year: number;
  type: 'income' | 'expense';
  businessUnitId?: string;
  totalAmount: number;
}

const CategoryBreakdownModal: React.FC<CategoryBreakdownModalProps> = ({
  isOpen,
  onClose,
  month,
  year,
  type,
  businessUnitId,
  totalAmount,
}) => {
  const { breakdown, loading, error, fetchBreakdown } = useCategoryBreakdown(month, year, type, businessUnitId);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && month && year) {
      console.log('Modal opened, fetching data for:', { month, year, type, businessUnitId });
      fetchBreakdown();
    }
  }, [isOpen, month, year, type, businessUnitId, fetchBreakdown]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPercentage = (amount: number) => {
    return totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0';
  };

  // Generate colors for pie chart - neutral grays and orange accent
  const generateColors = (count: number) => {
    const colors = [
      '#ff6b35', // Primary orange
      '#9a9a9a', // Medium gray
      '#6b6b6b', // Darker gray
      '#c4c4c4', // Lighter gray
      '#525252', // Dark gray
      '#e0e0e0', // Very light gray
      '#3d3d3d', // Very dark gray
      '#f0f0f0', // Almost white
    ];
    
    // Repeat colors if needed
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  const pieChartData = breakdown.map(item => ({
    name: item.category,
    value: item.amount,
    count: item.count,
    percentage: getPercentage(item.amount)
  }));

  const colors = generateColors(breakdown.length);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-neutral-100 border border-neutral-200 px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-neutral-900 braun-text">{data.name}</p>
          <p className="text-sm text-neutral-600 braun-text">
            {formatCurrency(data.value)} ({data.percentage}%)
          </p>
          <p className="text-xs text-neutral-500 braun-text">
            {data.count} transaction{data.count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="bg-neutral-100 border border-neutral-200 max-w-4xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-medium text-neutral-900 braun-text">
                {type === 'income' ? 'Income' : 'Expense'} Breakdown
              </h2>
              <p className="text-sm text-neutral-600 braun-text mt-1">
                {month} {year} • {formatCurrency(totalAmount)} total
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 text-lg leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 braun-text">{error}</p>
              </div>
            ) : breakdown.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-600 braun-text">
                  No {type === 'income' ? 'income' : 'expenses'} found for {month} {year}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium text-neutral-900 mb-4 braun-text">Visual Breakdown</h3>
                  <div className="h-80 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category List */}
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium text-neutral-900 mb-4 braun-text">Category Details</h3>
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    {breakdown.map((item, index) => (
                      <div key={item.category} className="flex items-center justify-between py-3 border-b border-neutral-200 last:border-b-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-sm" 
                              style={{ backgroundColor: colors[index] }}
                            ></div>
                            <div>
                              <h4 className="font-medium text-neutral-900 braun-text">
                                {item.category}
                              </h4>
                              <p className="text-sm text-neutral-600 braun-text">
                                {item.count} transaction{item.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-neutral-900 braun-text">
                            {formatCurrency(item.amount)}
                          </p>
                          <p className="text-sm text-neutral-600 braun-text">
                            {getPercentage(item.amount)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-neutral-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-neutral-600 braun-text">
                {breakdown.length} categor{breakdown.length !== 1 ? 'ies' : 'y'}
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-accent-500 text-white hover:bg-accent-600 braun-text"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryBreakdownModal;
