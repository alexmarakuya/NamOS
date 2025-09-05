import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartData } from '../types';
import CategoryBreakdownModal from './CategoryBreakdownModal';

interface FinancialChartProps {
  data: ChartData[];
  activeFilter?: string;
}

const FinancialChart: React.FC<FinancialChartProps> = ({ data, activeFilter }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    month: string;
    year: number;
    type: 'income' | 'expense';
    totalAmount: number;
  }>({
    isOpen: false,
    month: '',
    year: new Date().getFullYear(),
    type: 'income',
    totalAmount: 0,
  });

  const handleBarClick = (data: any, type: 'income' | 'expense') => {
    console.log('Bar clicked:', { data, type });
    if (data && data.name) {
      console.log('Opening modal with:', {
        month: data.name,
        year: new Date().getFullYear(),
        type,
        totalAmount: data[type],
        activeFilter
      });
      setModalState({
        isOpen: true,
        month: data.name,
        year: new Date().getFullYear(),
        type,
        totalAmount: data[type],
      });
    }
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };
  return (
    <div className="bg-neutral-100 border-b border-neutral-200 p-8">
      <div className="mb-8">
        <h2 className="text-xl font-medium text-neutral-900 mb-3 braun-text">Monthly Overview</h2>
        <p className="text-sm text-neutral-600 braun-text">Financial performance across time • Click bars for category breakdown</p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
            barGap={12}
          >
            <defs>
              <pattern 
                id="diagonalHatch" 
                patternUnits="userSpaceOnUse" 
                width="6" 
                height="6"
                patternTransform="rotate(45)"
                              >
                  <rect width="6" height="6" fill="#f0f0f0"/>
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#9a9a9a" strokeWidth="0.5"/>
                </pattern>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9a9a9a', fontSize: 12, fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontWeight: 500 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9a9a9a', fontSize: 12, fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontWeight: 500 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Bar 
              dataKey="income" 
              fill="url(#diagonalHatch)"
              stroke="#9a9a9a"
              strokeWidth="0.5"
              name="Income"
              onClick={(data) => handleBarClick(data, 'income')}
              style={{ cursor: 'pointer' }}
            />
            <Bar 
              dataKey="expenses" 
              fill="#ff6b35" 
              name="Expenses"
              onClick={(data) => handleBarClick(data, 'expense')}
              style={{ cursor: 'pointer' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 pt-6 border-t border-neutral-200">
        <div className="flex items-center space-x-8 text-sm">
          <div className="flex items-center space-x-3">
            <svg width="16" height="16">
              <defs>
                <pattern 
                  id="legendHatch" 
                  patternUnits="userSpaceOnUse" 
                  width="3" 
                  height="3"
                  patternTransform="rotate(45)"
                >
                  <rect width="3" height="3" fill="#f0f0f0"/>
                  <line x1="0" y1="0" x2="0" y2="3" stroke="#9a9a9a" strokeWidth="0.3"/>
                </pattern>
              </defs>
              <rect width="16" height="16" fill="url(#legendHatch)" stroke="#9a9a9a" strokeWidth="0.5"/>
            </svg>
            <span className="text-neutral-600 braun-text font-medium">Income</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-accent-500"></div>
            <span className="text-neutral-600 braun-text font-medium">Expenses</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Modal */}
      <CategoryBreakdownModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        month={modalState.month}
        year={modalState.year}
        type={modalState.type}
        businessUnitId={activeFilter}
        totalAmount={modalState.totalAmount}
      />
    </div>
  );
};

export default FinancialChart;
