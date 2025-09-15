import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TimeChartData, Project } from '../types';

interface TimeChartProps {
  data: TimeChartData[];
  activeFilter: string;
  projects: Project[];
}

type ViewMode = 'time' | 'revenue';

const TimeChart: React.FC<TimeChartProps> = ({ data, activeFilter, projects }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('time');
  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatRevenue = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Convert time data to revenue data (assuming $150/hour rate)
  const getRevenueData = (timeData: TimeChartData[]) => {
    const hourlyRate = 150;
    return timeData.map(day => {
      const revenueProjects: { [key: string]: number } = {};
      Object.entries(day.projects).forEach(([projectId, hours]) => {
        revenueProjects[projectId] = (hours as number) * hourlyRate;
      });
      return {
        ...day,
        projects: revenueProjects,
        total: day.total * hourlyRate,
        billable: day.billable * hourlyRate,
        nonBillable: day.nonBillable * hourlyRate,
      };
    });
  };

  // Generate distinct colors for each client
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

  // Get chart data based on view mode
  const chartData = React.useMemo(() => {
    return viewMode === 'revenue' ? getRevenueData(data) : data;
  }, [data, viewMode]);

  // Get all unique projects from the data
  const allProjects = React.useMemo(() => {
    const projectIds = new Set<string>();
    chartData.forEach(day => {
      Object.keys(day.projects).forEach(projectId => {
        projectIds.add(projectId);
      });
    });
    return Array.from(projectIds);
  }, [chartData]);

  const projectColors = React.useMemo(() => {
    const clientColors = getClientColors();
    const colorMap: { [key: string]: string } = {};
    
    // Group projects by client
    const projectsByClient: { [client: string]: string[] } = {};
    allProjects.forEach(projectId => {
      const project = projects.find(p => p.id === projectId);
      const clientName = project?.client_name || 'Default';
      if (!projectsByClient[clientName]) {
        projectsByClient[clientName] = [];
      }
      projectsByClient[clientName].push(projectId);
    });
    
    // Assign colors based on client
    Object.entries(projectsByClient).forEach(([clientName, projectIds]) => {
      const clientColorScheme = clientColors[clientName] || clientColors['Default'];
      projectIds.forEach((projectId, index) => {
        // Use different shades for projects within the same client
        const shadeIndex = index % clientColorScheme.shades.length;
        colorMap[projectId] = clientColorScheme.shades[shadeIndex];
      });
    });
    
    return colorMap;
  }, [allProjects, projects]);

  // Custom bar shape with horizontal line below bar
  const CustomBar = (props: any) => {
    const { fill, x, y, width, height } = props;
    return (
      <g>
        {/* Original bar */}
        <rect x={x} y={y} width={width} height={height} fill={fill} />
        {/* Horizontal line below bar, above day number */}
        <line
          x1={x}
          y1={y + height + 8}
          x2={x + width}
          y2={y + height + 8}
          stroke="#D4CFC1"
          strokeWidth={1}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = chartData.find(d => d.name === label);
      const formatter = viewMode === 'revenue' ? formatRevenue : formatHours;
      const unit = viewMode === 'revenue' ? 'Revenue' : 'Hours';
      
      return (
        <div className="p-4 braun-text border border-neutral-300" style={{ backgroundColor: '#F2EFE6' }}>
          <p className="font-medium text-neutral-800 mb-2">Day {label}</p>
          {dayData && Object.entries(dayData.projects).map(([projectId, value]) => {
            const project = projects.find(p => p.id === projectId);
            const projectName = project ? project.name : (projectId === 'no-project' ? 'No Project' : 'Unknown Project');
            const clientName = project?.client_name || 'Unknown Client';
            return (
              <p key={projectId} className="text-sm" style={{ color: projectColors[projectId] }}>
                <span className="font-medium">{clientName}</span> - {projectName}: {formatter(value as number)}
              </p>
            );
          })}
          <p className="text-sm font-medium text-neutral-800 mt-1 pt-1">
            Total {unit}: {formatter(dayData?.total || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-medium text-white braun-text">
            {viewMode === 'revenue' ? 'Revenue Overview' : 'Time Overview'}
          </h2>
          <p className="text-xs text-neutral-300 mt-1 braun-text">
            Daily project {viewMode === 'revenue' ? 'revenue' : 'hours'} for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {activeFilter !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-accent-900 text-accent-200 text-xs rounded-full braun-text">
                Filtered
              </span>
            )}
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex border border-neutral-200 rounded-lg overflow-hidden bg-white">
          <button
            onClick={() => setViewMode('time')}
            className={`px-4 py-2 text-xs font-medium transition-colors duration-200 font-epilogue ${
              viewMode === 'time'
                ? 'bg-white text-neutral-800 border-b-2 border-accent-500'
                : 'bg-white text-neutral-500 hover:text-neutral-600 hover:bg-cream-dark'
            }`}
          >
            Time
          </button>
          <button
            onClick={() => setViewMode('revenue')}
            className={`px-4 py-2 text-xs font-medium transition-colors duration-200 font-epilogue border-l border-neutral-200 ${
              viewMode === 'revenue'
                ? 'bg-white text-neutral-800 border-b-2 border-accent-500'
                : 'bg-white text-neutral-500 hover:text-neutral-600 hover:bg-cream-dark'
            }`}
          >
            Revenue
          </button>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: '360px' }}>
        <ResponsiveContainer>
          <BarChart
            key={viewMode}
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 40,
              bottom: 25,
            }}
          >
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af"
              fontSize={12}
              fontFamily="'Braun Mono', monospace"
              axisLine={false}
              tickLine={false}
              tick={{ dy: 15 }}
            />
            <YAxis 
              hide={true}
            />
            <Tooltip content={<CustomTooltip />} />
            {allProjects.map((projectId, index) => {
              const project = projects.find(p => p.id === projectId);
              const projectName = project ? project.name : (projectId === 'no-project' ? 'No Project' : 'Unknown Project');
              return (
                <Bar
                  key={projectId}
                  dataKey={`projects.${projectId}`}
                  name={projectName}
                  stackId="hours"
                  fill={projectColors[projectId]}
                  radius={index === allProjects.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  shape={index === 0 ? <CustomBar /> : undefined}
                  animationBegin={0}
                  animationDuration={500}
                  isAnimationActive={true}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default TimeChart;
