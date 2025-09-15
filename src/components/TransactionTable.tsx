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
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-white braun-text">
          Recent Transactions
        </h2>
        <p className="text-xs text-neutral-300 mt-1 braun-text">
          Latest financial activity across all business units
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="table-cell-header text-left braun-label">
                Date
              </th>
              <th className="table-cell-header text-left braun-label">
                Description
              </th>
              <th className="table-cell-header text-left braun-label">
                Category
              </th>
              <th className="table-cell-header text-left braun-label">
                Business Unit
              </th>
              <th className="table-cell-header text-right braun-label">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-neutral-700 hover:bg-neutral-700">
                <td className="table-cell braun-text">
                  {format(transaction.date, 'MMM dd, yyyy')}
                </td>
                <td className="table-cell font-medium text-white braun-text">
                  {transaction.description}
                </td>
                <td className="table-cell text-neutral-300 braun-text">
                  {transaction.category}
                </td>
                <td className="table-cell text-neutral-300 braun-text">
                  {transaction.businessUnit}
                </td>
                <td className="table-cell text-right font-medium">
                  <span className={`mono ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
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
