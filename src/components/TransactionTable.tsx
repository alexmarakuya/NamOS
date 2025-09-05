import React from 'react';
import { format } from 'date-fns';
import { Transaction } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-neutral-100">
      <div className="px-8 py-7 border-b border-neutral-200">
        <h2 className="text-xl font-medium text-neutral-900 braun-text">Recent Transactions</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="px-8 py-5 text-left braun-label text-neutral-600">
                Date
              </th>
              <th className="px-8 py-5 text-left braun-label text-neutral-600">
                Description
              </th>
              <th className="px-8 py-5 text-left braun-label text-neutral-600">
                Category
              </th>
              <th className="px-8 py-5 text-left braun-label text-neutral-600">
                Business Unit
              </th>
              <th className="px-8 py-5 text-right braun-label text-neutral-600">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-neutral-200">
                <td className="px-8 py-5 text-sm text-neutral-700 braun-text">
                  {format(transaction.date, 'MMM dd, yyyy')}
                </td>
                <td className="px-8 py-5 text-sm font-medium text-neutral-900 braun-text">
                  {transaction.description}
                </td>
                <td className="px-8 py-5 text-sm text-neutral-600 braun-text">
                  {transaction.category}
                </td>
                <td className="px-8 py-5 text-sm text-neutral-600 braun-text">
                  {transaction.businessUnit}
                </td>
                <td className="px-8 py-5 text-sm text-right font-mono font-medium">
                  <span className={transaction.type === 'income' ? 'text-neutral-900' : 'text-accent-500'}>
                    {transaction.type === 'income' ? '+' : '−'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
