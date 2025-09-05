import React from 'react';
import { BusinessUnit } from '../types';

// Type alias for areas (keeping compatibility)
type Area = BusinessUnit;

interface FilterTabsProps {
  areas: Area[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ areas, activeFilter, onFilterChange }) => {
  const allAreas = [
    { id: 'all', name: 'All Areas', type: 'business' as const, color: '#171717' },
    ...areas
  ];

  return (
    <div className="bg-neutral-100 border-b border-neutral-200">
      <div className="flex flex-wrap">
        {allAreas.map((area) => {
          const isActive = activeFilter === area.id;
          
          return (
            <button
              key={area.id}
              onClick={() => onFilterChange(area.id)}
              className={`
                px-6 py-3 text-sm font-medium braun-text
                ${isActive 
                  ? 'bg-accent-500 text-white font-semibold' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-700'
                }
              `              }
            >
              {area.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterTabs;
