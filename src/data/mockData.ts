import { Transaction, BusinessUnit, Category } from '../types';

export const businessUnits: BusinessUnit[] = [
  { id: '1', name: 'Personal', type: 'personal', color: '#3b82f6' },
  { id: '2', name: 'Consulting LLC', type: 'business', color: '#10b981' },
  { id: '3', name: 'E-commerce Store', type: 'business', color: '#f59e0b' },
  { id: '4', name: 'Real Estate', type: 'business', color: '#ef4444' },
];

export const categories: Category[] = [
  // Income categories
  { id: '1', name: 'Salary', type: 'income', color: '#10b981' },
  { id: '2', name: 'Consulting', type: 'income', color: '#059669' },
  { id: '3', name: 'Product Sales', type: 'income', color: '#047857' },
  { id: '4', name: 'Rental Income', type: 'income', color: '#065f46' },
  { id: '5', name: 'Investments', type: 'income', color: '#064e3b' },
  
  // Expense categories
  { id: '6', name: 'Office Supplies', type: 'expense', color: '#ef4444' },
  { id: '7', name: 'Marketing', type: 'expense', color: '#dc2626' },
  { id: '8', name: 'Software', type: 'expense', color: '#b91c1c' },
  { id: '9', name: 'Travel', type: 'expense', color: '#991b1b' },
  { id: '10', name: 'Utilities', type: 'expense', color: '#7f1d1d' },
  { id: '11', name: 'Insurance', type: 'expense', color: '#6b1a1a' },
  { id: '12', name: 'Professional Services', type: 'expense', color: '#581c1c' },
];

export const transactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    description: 'Client Project Payment',
    amount: 5000,
    type: 'income',
    category: 'Consulting',
    businessUnit: 'Consulting LLC',
    tags: ['project-alpha', 'web-development']
  },
  {
    id: '2',
    date: new Date('2024-01-14'),
    description: 'Adobe Creative Suite',
    amount: 52.99,
    type: 'expense',
    category: 'Software',
    businessUnit: 'Consulting LLC'
  },
  {
    id: '3',
    date: new Date('2024-01-13'),
    description: 'Product Sales - January',
    amount: 1250,
    type: 'income',
    category: 'Product Sales',
    businessUnit: 'E-commerce Store'
  },
  {
    id: '4',
    date: new Date('2024-01-12'),
    description: 'Monthly Salary',
    amount: 6500,
    type: 'income',
    category: 'Salary',
    businessUnit: 'Personal'
  },
  {
    id: '5',
    date: new Date('2024-01-11'),
    description: 'Facebook Ads',
    amount: 350,
    type: 'expense',
    category: 'Marketing',
    businessUnit: 'E-commerce Store'
  },
  {
    id: '6',
    date: new Date('2024-01-10'),
    description: 'Rental Property Income',
    amount: 2200,
    type: 'income',
    category: 'Rental Income',
    businessUnit: 'Real Estate'
  },
  {
    id: '7',
    date: new Date('2024-01-09'),
    description: 'Property Management Fee',
    amount: 220,
    type: 'expense',
    category: 'Professional Services',
    businessUnit: 'Real Estate'
  },
  {
    id: '8',
    date: new Date('2024-01-08'),
    description: 'Office Equipment',
    amount: 899,
    type: 'expense',
    category: 'Office Supplies',
    businessUnit: 'Consulting LLC'
  },
  {
    id: '9',
    date: new Date('2024-01-07'),
    description: 'Business Trip - Client Meeting',
    amount: 450,
    type: 'expense',
    category: 'Travel',
    businessUnit: 'Consulting LLC'
  },
  {
    id: '10',
    date: new Date('2024-01-05'),
    description: 'Dividend Payment',
    amount: 800,
    type: 'income',
    category: 'Investments',
    businessUnit: 'Personal'
  }
];
