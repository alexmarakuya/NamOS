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
    <div className="flex flex-wrap gap-2">
      {allAreas.map((area) => {
        const isActive = activeFilter === area.id;
        
        return (
          <button
            key={area.id}
            onClick={() => onFilterChange(area.id)}
            className={`
              px-4 text-sm font-medium rounded-lg transition-all duration-200 font-epilogue border
              ${isActive
                ? 'border-neutral-300 bg-neutral-100 text-neutral-900'
                : 'border-neutral-200 bg-transparent text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900'
              }
            `}
            style={{ paddingTop: '10px', paddingBottom: '6px' }}
          >
            {area.name}
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
