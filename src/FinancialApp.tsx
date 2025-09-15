import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import StatCard from './components/StatCard';
import TransactionTable from './components/TransactionTable';
import FinancialChart from './components/FinancialChart';
import AddTransactionModal from './components/AddTransactionModal';
import { useAreas, useTransactions, convertDbTransactionToApp, convertDbAreaToApp } from './hooks/useSupabase';
import { DatabaseBusinessUnit } from './lib/supabase';
import { DashboardStats, ChartData } from './types';

function FinancialApp() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  
  const areaDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(event.target as Node)) {
        setAreaDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch data from Supabase (fetch all data once, filter client-side)
  const { areas: dbAreas, loading: areasLoading, error: areasError, refetch: refetchAreas } = useAreas();
  const { transactions: dbTransactions, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useTransactions();

  // Convert database data to app format
  const areas = useMemo(() => 
    dbAreas.map(convertDbAreaToApp), 
    [dbAreas]
  );

  // Convert and filter transactions client-side
  const transactionsWithAreas = useMemo(() => {
    let allTransactions = dbTransactions.map(dbTransaction => {
      const transaction = convertDbTransactionToApp(dbTransaction);
      const area = dbAreas.find((a: DatabaseBusinessUnit) => a.id === dbTransaction.business_unit_id);
      return {
        ...transaction,
        area: area?.name || 'Unknown'
      };
    });

    // Apply area filter
    if (activeFilter !== 'all') {
      allTransactions = allTransactions.filter(transaction => {
        const dbTransaction = dbTransactions.find(db => db.id === transaction.id);
        return dbTransaction?.business_unit_id === activeFilter;
      });
    }

    return allTransactions;
  }, [dbTransactions, dbAreas, activeFilter]);

  const filteredTransactions = transactionsWithAreas;

  // Optimized filter handlers to prevent unnecessary re-renders
  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilter(filterId);
  }, []);

  const closeAreaDropdown = useCallback(() => {
    setAreaDropdownOpen(false);
  }, []);

  const stats = useMemo((): DashboardStats => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netIncome = totalIncome - totalExpenses;
    
    // Mock monthly growth calculation
    const monthlyGrowth = 12.5;
    
    return {
      totalIncome,
      totalExpenses,
      netIncome,
      monthlyGrowth
    };
  }, [filteredTransactions]);

  const chartData = useMemo((): ChartData[] => {
    // Generate 12 months of chart data based on filtered transactions
    const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    const currentMonth = filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expenses += t.amount;
      return acc;
    }, { income: 0, expenses: 0 });

    // Create realistic historical data with seasonal trends
    const baseIncome = currentMonth.income || 12000;
    const baseExpenses = currentMonth.expenses || 6000;
    
    return months.map((month, index) => {
      // Create seasonal variations and growth trends
      const seasonalMultiplier = 1 + Math.sin((index / 12) * 2 * Math.PI) * 0.15; // ±15% seasonal variation
      const growthTrend = 1 + (index / 12) * 0.1; // 10% growth over the year
      const randomVariation = 0.9 + Math.random() * 0.2; // ±10% random variation
      
      // Current month (January) uses actual data
      const income = index === 11 ? currentMonth.income : Math.round(baseIncome * seasonalMultiplier * growthTrend * randomVariation);
      const expenses = index === 11 ? currentMonth.expenses : Math.round(baseExpenses * seasonalMultiplier * (growthTrend * 0.8) * randomVariation);
      
      return {
        name: month,
        income,
        expenses,
        net: income - expenses
      };
    });
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const recentTransactions = filteredTransactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);


  const handleTransactionAdded = () => {
    // Refresh data after adding a transaction
    refetchAreas();
    refetchTransactions();
  };

  // Loading state
  if (areasLoading || transactionsLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-neutral-300 braun-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (areasError || transactionsError) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2 braun-text">Database Connection Error</h2>
          <p className="text-neutral-300 mb-4 braun-text">
            {areasError || transactionsError}
          </p>
          <p className="text-sm text-neutral-400 braun-text">
            Please check your Supabase configuration in the .env file and ensure your database is set up correctly.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2.5 bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 braun-text"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1 font-epilogue">
            Financial Dashboard
          </h1>
          <p className="text-sm text-neutral-600 font-epilogue">
            Overview of your financial performance
          </p>
        </div>
        <div className="flex space-x-4">
          {/* Areas Filter Dropdown */}
          <div className="relative" ref={areaDropdownRef}>
            <button
              onClick={() => {
                setAreaDropdownOpen(!areaDropdownOpen);
              }}
              className="flex items-center space-x-3 px-4 border border-neutral-200 hover:border-neutral-300 bg-transparent hover:bg-cream-dark text-neutral-500 hover:text-neutral-600 text-sm rounded-lg transition-colors duration-200 ease-in-out font-epilogue"
              style={{ paddingTop: '10px', paddingBottom: '6px' }}
            >
              {activeFilter === 'all' ? (
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              ) : (
                <div className="w-6 h-6 rounded bg-neutral-300 hover:bg-neutral-400 flex items-center justify-center text-white text-xs font-medium transition-colors duration-200" style={{ transform: 'translateY(-2px)' }}>
                  {areas.find(a => a.id === activeFilter)?.name.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <span>{activeFilter === 'all' ? 'All Areas' : areas.find(a => a.id === activeFilter)?.name || 'Area'}</span>
            </button>
            
            {areaDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 pl-2 max-h-64 overflow-y-auto dropdown-scrollbar">
                <button
                  onClick={() => {
                    handleFilterChange('all');
                    closeAreaDropdown();
                  }}
                  className={`w-full text-left px-3 py-3 text-sm hover:bg-cream-dark transition-colors font-epilogue rounded-md ${
                    activeFilter === 'all' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                  }`}
                >
                  <span>Show all</span>
                </button>
                {areas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => {
                      handleFilterChange(area.id);
                      setAreaDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-3 text-sm hover:bg-cream-dark transition-colors font-epilogue rounded-md ${
                      activeFilter === area.id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded bg-neutral-300 hover:bg-neutral-400 flex items-center justify-center text-white text-xs font-medium transition-colors duration-200" style={{ transform: 'translateY(-2px)' }}>
                        {area.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{area.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 ease-in-out font-epilogue"
            style={{ paddingTop: '10px', paddingBottom: '6px' }}
          >
            Add Transaction
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="dashboard-grid">
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome)}
          change={`+${stats.monthlyGrowth}% from last month`}
          changeType="positive"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          change="−5.2% from last month"
          changeType="negative"
        />
        <StatCard
          title="Net Income"
          value={formatCurrency(stats.netIncome)}
          change={`+${(stats.monthlyGrowth + 2.1).toFixed(1)}% from last month`}
          changeType="positive"
        />
        <StatCard
          title="Profit Margin"
          value={`${((stats.netIncome / stats.totalIncome) * 100).toFixed(1)}%`}
          change="+3.1% from last month"
          changeType="positive"
        />
      </div>

      {/* Data Section Container */}
      <div className="data-section-container">
        {/* Charts Grid */}
        <div className="dashboard-card">
          <FinancialChart data={chartData} activeFilter={activeFilter} />
        </div>

        {/* Recent Transactions */}
        <div className="dashboard-card">
          <TransactionTable transactions={recentTransactions} />
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        areas={dbAreas}
        onTransactionAdded={handleTransactionAdded}
      />
    </div>
  );
}

export default FinancialApp;
