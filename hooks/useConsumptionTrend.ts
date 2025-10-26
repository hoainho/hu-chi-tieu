import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store';
import { Transaction } from '../types';
import { toDate } from '../utils/dateHelpers';
import { formatVietnameseCurrency } from '../utils/vietnamCurrency';

export interface ConsumptionTrendData {
  month: string;        // e.g., "Tháng 1/2024"
  spending: number;     // Total spending for the month
  income: number;       // Total income for the month
  balance: number;      // Net balance (income - spending)
  transactions: number; // Number of transactions
}

export const useConsumptionTrend = () => {
  const { transactions, loading: transactionsLoading } = useAppSelector(state => state.transaction);
  const { incomes, loading: incomesLoading } = useAppSelector(state => state.income);
  const [trendData, setTrendData] = useState<ConsumptionTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateTrendData = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      // Get last 12 months
      const now = new Date();
      const months: { year: number; month: number; label: string }[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          year: date.getFullYear(),
          month: date.getMonth(),
          label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`
        });
      }

      // Process data for each month
      const result: ConsumptionTrendData[] = months.map(({ year, month, label }) => {
        // Filter transactions for this month
        const monthTransactions = transactions.filter(txn => {
          const txnDate = toDate(txn.date);
          return txnDate && 
                 txnDate.getFullYear() === year && 
                 txnDate.getMonth() === month;
        });

        // Filter incomes for this month
        const monthIncomes = incomes.filter(income => {
          const incomeDate = typeof income.date === 'string' 
            ? new Date(income.date) 
            : toDate(income.date);
          return incomeDate && 
                 incomeDate.getFullYear() === year && 
                 incomeDate.getMonth() === month;
        });

        // Calculate spending (negative amounts or positive non-income/non-transfer)
        const spending = monthTransactions
          .filter(txn => 
            txn.amount < 0 || 
            (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer')
          )
          .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

        // Calculate income (positive amounts marked as income or transfer)
        const income = [
          ...monthIncomes.map(income => income.amount),
          ...monthTransactions
            .filter(txn => 
              txn.amount > 0 && 
              (txn.category === 'income' || txn.category === 'transfer')
            )
            .map(txn => txn.amount)
        ].reduce((sum, amount) => sum + amount, 0);

        // Calculate balance
        const balance = income - spending;

        // Count transactions
        const transactionCount = monthTransactions.length;

        return {
          month: label,
          spending,
          income,
          balance,
          transactions: transactionCount
        };
      });

      setTrendData(result);
    } catch (err) {
      console.error('Error calculating consumption trend:', err);
      setError('Không thể tải dữ liệu xu hướng tiêu dùng');
    } finally {
      setLoading(false);
    }
  }, [transactions, incomes]);

  useEffect(() => {
    if (!transactionsLoading && !incomesLoading) {
      calculateTrendData();
    }
  }, [transactionsLoading, incomesLoading, calculateTrendData]);

  return {
    trendData,
    loading: loading || transactionsLoading || incomesLoading,
    error,
    refresh: calculateTrendData
  };
};