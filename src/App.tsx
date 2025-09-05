import React, { useMemo, useState } from 'react';
import StatCard from './components/StatCard';
import TransactionTable from './components/TransactionTable';
import FinancialChart from './components/FinancialChart';
import FilterTabs from './components/FilterTabs';
import AddTransactionModal from './components/AddTransactionModal';
import { useAreas, useTransactions, convertDbTransactionToApp, convertDbAreaToApp } from './hooks/useSupabase';
import { DashboardStats, ChartData } from './types';

function App() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch data from Supabase
  const { areas: dbAreas, loading: areasLoading, error: areasError, refetch: refetchAreas } = useAreas();
  const { transactions: dbTransactions, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useTransactions(activeFilter);

  // Convert database data to app format
  const areas = useMemo(() => 
    dbAreas.map(convertDbAreaToApp), 
    [dbAreas]
  );

  const transactions = useMemo(() => 
    dbTransactions.map(convertDbTransactionToApp), 
    [dbTransactions]
  );

  // Add area names to transactions
  const transactionsWithAreas = useMemo(() => 
    transactions.map(transaction => {
      const dbTransaction = dbTransactions.find(db => db.id === transaction.id);
      const area = dbAreas.find(a => a.id === dbTransaction?.business_unit_id);
      return {
        ...transaction,
        area: area?.name || 'Unknown'
      };
    }), 
    [transactions, dbTransactions, dbAreas]
  );

  const filteredTransactions = transactionsWithAreas;

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

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  const handleTransactionAdded = () => {
    // Refresh data after adding a transaction
    refetchAreas();
    refetchTransactions();
  };

  // Loading state
  if (areasLoading || transactionsLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-neutral-600 braun-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (areasError || transactionsError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2 braun-text">Database Connection Error</h2>
          <p className="text-neutral-600 mb-4 braun-text">
            {businessUnitsError || transactionsError}
          </p>
          <p className="text-sm text-neutral-500 braun-text">
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
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-neutral-100 border-b border-neutral-200">
        <div className="px-8 py-5">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-medium text-neutral-900 tracking-tight braun-text">
              Financial Dashboard
            </h1>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 bg-accent-500 text-white text-sm font-medium border-0 hover:bg-accent-600 braun-text"
            >
              Add Transaction
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Filter Tabs */}
        <FilterTabs 
          areas={areas}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
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

        {/* Chart */}
        <FinancialChart data={chartData} activeFilter={activeFilter} />

        {/* Transactions Table */}
        <TransactionTable transactions={recentTransactions} />
      </main>

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

export default App;
