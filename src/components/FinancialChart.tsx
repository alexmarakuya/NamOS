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
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-white braun-text">
                Financial Overview
              </h2>
              <p className="text-xs text-neutral-300 mt-1 braun-text">
                Monthly income vs expenses across all business units
                {activeFilter !== 'all' && (
                  <span className="ml-2 px-2 py-1 bg-accent-900 text-accent-200 text-xs rounded-full braun-text">
                    Filtered
                  </span>
                )}
              </p>
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
                  <rect width="6" height="6" fill="transparent"/>
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#D4CFC1" strokeWidth="0.5"/>
                </pattern>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontWeight: 500 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontWeight: 500 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Bar 
              dataKey="income" 
              fill="#92B590"
              name="Income"
              onClick={(data) => handleBarClick(data, 'income')}
              style={{ cursor: 'pointer' }}
            />
            <Bar 
              dataKey="expenses" 
              fill="url(#diagonalHatch)"
              stroke="#D4CFC1"
              strokeWidth="0.5"
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
            <div className="w-4 h-4 bg-accent-500"></div>
            <span className="text-neutral-600 braun-text font-medium">Income</span>
          </div>
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
                  <rect width="3" height="3" fill="transparent"/>
                  <line x1="0" y1="0" x2="0" y2="3" stroke="#D4CFC1" strokeWidth="0.3"/>
                </pattern>
              </defs>
              <rect width="16" height="16" fill="url(#legendHatch)" stroke="#D4CFC1" strokeWidth="0.5"/>
            </svg>
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
