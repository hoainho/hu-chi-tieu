import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import ModernCard from '../ui/ModernCard';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

const SpendingTrendsSummary: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);

  // Quick analysis of spending trends
  const quickAnalysis = useMemo(() => {
    if (!transactions.length) return null;

    // Filter expense transactions for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenseTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && 
             txnDate >= sixMonthsAgo && 
             (txn.amount < 0 || // Traditional negative amounts
              (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer')); // Or positive amounts that are not income/transfer
    });

    if (expenseTransactions.length === 0) {
      // Fallback: if no expense transactions found, try all transactions
      console.log('⚠️ No expense transactions found, using all transactions as fallback');
      const allRecentTransactions = transactions.filter(txn => {
        const txnDate = toDate(txn.date);
        return txnDate && txnDate >= sixMonthsAgo;
      });
      
      if (allRecentTransactions.length === 0) return null;
      
      // Use all transactions as expense data for debugging
      expenseTransactions.push(...allRecentTransactions);
    }

    // Create 6 months of data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthSpending = expenseTransactions
        .filter(txn => {
          const txnDate = toDate(txn.date);
          if (!txnDate) return false;
          const txnMonthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
          return txnMonthKey === monthKey;
        })
        .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

      monthlyData.push({
        month: date.toLocaleDateString('vi-VN', { month: 'short' }),
        spending: monthSpending
      });
    }

    // Calculate trends
    const totalSpending = monthlyData.reduce((sum, data) => sum + data.spending, 0);
    const avgSpending = totalSpending / monthlyData.length;
    const lastMonth = monthlyData[monthlyData.length - 1]?.spending || 0;
    const previousMonth = monthlyData[monthlyData.length - 2]?.spending || 0;
    const monthlyChange = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;

    // Find the month with the highest spending
    const maxSpendingMonth = monthlyData.reduce((max, current) => 
      current.spending > max.spending ? current : max
    );

    return {
      monthlyData,
      totalSpending,
      avgSpending,
      lastMonth,
      monthlyChange,
      maxSpendingMonth,
      transactionCount: expenseTransactions.length
    };
  }, [transactions]);

  if (!quickAnalysis) {
    return (
      <ModernCard gradient glow>
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-chart-line text-xl text-white"></i>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-1">---</div>
          <div className="text-sm text-gray-600">Xu hướng chi tiêu</div>
          <div className="text-xs text-gray-500 mt-2">Chưa có dữ liệu</div>
        </div>
      </ModernCard>
    );
  }

  return (
    <ModernCard gradient glow>
      <div className="text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
          <i className="fas fa-chart-line text-xl text-white"></i>
        </div>
        <div className="text-2xl font-bold text-gray-800 mb-1">
          {formatVietnameseCurrency(quickAnalysis.lastMonth)}
        </div>
        <div className="text-sm text-gray-600">Xu hướng chi tiêu</div>
        
        {/* Trend Indicator */}
        <div className={`text-xs flex items-center justify-center mt-2 ${
          quickAnalysis.monthlyChange >= 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          <i className={`fas ${quickAnalysis.monthlyChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
          {Math.abs(quickAnalysis.monthlyChange).toFixed(1)}% so với tháng trước
        </div>
      </div>


      {/* Quick Insight */}
      <div className={`text-center text-xs px-3 py-2 mt-2 rounded-full ${
        quickAnalysis.monthlyChange > 15 ? 'bg-red-100 text-red-700' :
        quickAnalysis.monthlyChange < -15 ? 'bg-green-100 text-green-700' :
        'bg-blue-100 text-blue-700'
      }`}>
        {quickAnalysis.monthlyChange > 15 
          ? 'Cần kiểm soát ngân sách'
          : quickAnalysis.monthlyChange < -15 
          ? 'Tiết kiệm xuất sắc!'
          : 'Chi tiêu ổn định'
        }
      </div>
    </ModernCard>
  );
};

export default SpendingTrendsSummary;
