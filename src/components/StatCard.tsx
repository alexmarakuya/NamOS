import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType }) => {
  return (
    <div className="bg-neutral-100 border-r border-b border-neutral-200 p-8">
      <div className="space-y-5">
        <div>
          <h3 className="braun-label text-neutral-600 mb-4">
            {title}
          </h3>
          <p className="text-4xl font-normal text-neutral-900 tracking-tight braun-text">
            {value}
          </p>
        </div>
        
        {change && (
          <div className="pt-3 border-t border-neutral-200">
            <p className={`text-sm font-medium braun-text ${
              changeType === 'positive' ? 'text-neutral-700' : 
              changeType === 'negative' ? 'text-accent-500' : 'text-neutral-600'
            }`}>
              {change}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
