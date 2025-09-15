import React from 'react';
import { TimeEntry } from '../types';

interface TimeEntryTableProps {
  timeEntries: TimeEntry[];
}

// Client color system (same as TimeChart)
const getClientColors = (): { [key: string]: { primary: string; shades: string[] } } => {
  return {
    'AmexGBT': {
      primary: '#92B590',   // Sage green (brand primary)
      shades: ['#92B590', '#7BA378', '#A5C4A3', '#6B9B69', '#8FAD8D']
    },
    'Internal': {
      primary: '#2B3A2C',   // Dark forest green (brand secondary)
      shades: ['#2B3A2C', '#3E4F3F', '#4A5D4B', '#5C7A5A', '#1F2B20']
    },
    'Microsoft': {
      primary: '#4A90E2',   // Blue
      shades: ['#4A90E2', '#5BA0F2', '#6BB0FF', '#3A80D2', '#2A70C2']
    },
    'Google': {
      primary: '#E67E22',   // Orange
      shades: ['#E67E22', '#F39C12', '#FF8C00', '#D35400', '#C0392B']
    },
    'Apple': {
      primary: '#8E44AD',   // Purple
      shades: ['#8E44AD', '#9B59B6', '#A569BD', '#7D3C98', '#6C3483']
    },
    'Amazon': {
      primary: '#E74C3C',   // Red
      shades: ['#E74C3C', '#EC7063', '#F1948A', '#CD6155', '#B03A2E']
    },
    'Default': {
      primary: '#95A5A6',   // Gray
      shades: ['#95A5A6', '#BDC3C7', '#D5DBDB', '#85929E', '#7B8A8B']
    }
  };
};

const TimeEntryTable: React.FC<TimeEntryTableProps> = ({ timeEntries }) => {
  const clientColors = getClientColors();

  const getClientColor = (clientName: string | undefined) => {
    if (!clientName) return clientColors['Default'].primary;
    return clientColors[clientName]?.primary || clientColors['Default'].primary;
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const calculateValue = (entry: TimeEntry) => {
    if (!entry.project?.hourly_rate) return 0;
    return entry.hours * entry.project.hourly_rate;
  };

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="mb-6">
          <h2 className="text-lg font-medium text-white braun-text">
            Recent Time Entries
          </h2>
          <p className="text-xs text-neutral-300 mt-1 braun-text">
            Latest time entries from team members
          </p>
        </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-cell-header text-left uppercase tracking-wider braun-text">
                Date
              </th>
              <th className="table-cell-header text-left uppercase tracking-wider braun-text">
                User
              </th>
              <th className="table-cell-header text-left uppercase tracking-wider braun-text">
                Description
              </th>
              <th className="table-cell-header text-left uppercase tracking-wider braun-text">
                Project
              </th>
              <th className="table-cell-header text-right uppercase tracking-wider braun-text">
                Hours
              </th>
              <th className="table-cell-header text-right uppercase tracking-wider braun-text">
                Value
              </th>
              <th className="table-cell-header text-center uppercase tracking-wider braun-text">
                Billable
              </th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-neutral-400 braun-text">
                  No time entries found
                </td>
              </tr>
            ) : (
              timeEntries.map((entry) => (
                <tr key={entry.id} style={{ borderTop: '1px solid #E8E3D7' }}>
                  <td className="table-cell whitespace-nowrap braun-text">
                    {formatDate(entry.date)}
                  </td>
                  <td className="table-cell whitespace-nowrap braun-text">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-accent-500 flex items-center justify-center">
                          <span className="text-xs font-medium text-white braun-text">
                            {entry.user_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-neutral-200 braun-text">
                          {entry.user_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm text-neutral-200 braun-text max-w-xs">
                    <div className="truncate" title={entry.description}>
                      {entry.description}
                    </div>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-neutral-200 braun-text">
                    {entry.project ? (
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getClientColor(entry.project.client_name) }}
                        ></div>
                        <div>
                          <div className="font-medium">{entry.project.name}</div>
                          {entry.project.client_name && (
                            <div className="text-xs text-neutral-400">
                              {entry.project.client_name}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getClientColor(undefined) }}
                        ></div>
                        <span className="text-neutral-500 italic">No project</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-right text-sm font-medium text-neutral-200 braun-text">
                    {formatHours(entry.hours)}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-right text-sm font-medium text-neutral-200 braun-text">
                    {entry.project?.hourly_rate ? (
                      formatCurrency(calculateValue(entry))
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full braun-text ${
                      entry.is_billable 
                        ? 'text-neutral-800' 
                        : 'bg-neutral-700 text-neutral-300'
                    }`} style={entry.is_billable ? { backgroundColor: '#D4CFC1' } : {}}>
                      {entry.is_billable ? 'Billable' : 'Non-billable'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeEntryTable;
