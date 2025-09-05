import { Transaction } from '../types';

export const calculateTotalIncome = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const calculateTotalExpenses = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const calculateNetIncome = (transactions: Transaction[]): number => {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
};

export const calculateProfitMargin = (transactions: Transaction[]): number => {
  const income = calculateTotalIncome(transactions);
  const expenses = calculateTotalExpenses(transactions);
  return income > 0 ? ((income - expenses) / income) * 100 : 0;
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const groupTransactionsByBusinessUnit = (transactions: Transaction[]) => {
  return transactions.reduce((acc, transaction) => {
    const unit = transaction.businessUnit;
    if (!acc[unit]) {
      acc[unit] = [];
    }
    acc[unit].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);
};

export const groupTransactionsByCategory = (transactions: Transaction[]) => {
  return transactions.reduce((acc, transaction) => {
    const category = transaction.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);
};
