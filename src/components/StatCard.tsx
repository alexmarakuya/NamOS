import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType }) => {
  const getChangeClass = () => {
    switch (changeType) {
      case 'positive': return 'stat-change-positive';
      case 'negative': return 'stat-change-negative';
      default: return 'stat-change-neutral';
    }
  };

  return (
    <div className="stat-card">
      <div className="stat-title">
        {title}
      </div>
      <div className="stat-value">
        {value}
      </div>
      {change && (
        <div className={`stat-change ${getChangeClass()}`}>
          <span>{changeType === 'positive' ? '↗' : changeType === 'negative' ? '↘' : '→'}</span>
          <span>{change}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
