export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  businessUnit: string;
  tags?: string[];
  notes?: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  type: 'business' | 'personal' | 'project' | 'mixed' | 'us_business';
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  monthlyGrowth: number;
}

export interface ChartData {
  name: string;
  income: number;
  expenses: number;
  net: number;
}
