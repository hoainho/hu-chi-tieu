import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import ModernCard from '../ui/ModernCard';
import TrendIndicator from '../ui/TrendIndicator';
import MonthlyComparisonBarChart from '../charts/MonthlyComparisonBarChart';

const MonthlyComparison: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);
  const { incomes } = useAppSelector(state => state.income);

  const comparisonData = useMemo(() => {
    if (!transactions.length && !incomes.length) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get last month
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Helper function to get month data
    const getMonthData = (month: number, year: number) => {
      const monthSpending = transactions
        .filter(txn => {
          const txnDate = toDate(txn.date);
          return txnDate && 
                 txnDate.getMonth() === month && 
                 txnDate.getFullYear() === year &&
                 (txn.amount < 0 || 
                  (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
        })
        .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

      const monthIncome = incomes
        .filter(income => {
          const incomeDate = typeof income.date === 'string' 
            ? new Date(income.date)
            : toDate(income.date);
          return incomeDate && 
                 incomeDate.getMonth() === month && 
                 incomeDate.getFullYear() === year;
        })
        .reduce((sum, income) => sum + income.amount, 0);

      const transactionCount = transactions
        .filter(txn => {
          const txnDate = toDate(txn.date);
          return txnDate && 
                 txnDate.getMonth() === month && 
                 txnDate.getFullYear() === year &&
                 (txn.amount < 0 || 
                  (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
        }).length;

      return {
        spending: monthSpending,
        income: monthIncome,
        balance: monthIncome - monthSpending,
        transactionCount
      };
    };

    const currentMonthData = getMonthData(currentMonth, currentYear);
    const lastMonthData = getMonthData(lastMonth, lastMonthYear);

    // Calculate changes
    const spendingChange = currentMonthData.spending - lastMonthData.spending;
    const spendingChangePercent = lastMonthData.spending > 0 ? 
      (spendingChange / lastMonthData.spending) * 100 : 0;

    const incomeChange = currentMonthData.income - lastMonthData.income;
    const incomeChangePercent = lastMonthData.income > 0 ? 
      (incomeChange / lastMonthData.income) * 100 : 0;

    const balanceChange = currentMonthData.balance - lastMonthData.balance;
    const balanceChangePercent = lastMonthData.balance !== 0 ? 
      (balanceChange / Math.abs(lastMonthData.balance)) * 100 : 0;

    // Chart data
    const chartData = [
      {
        name: 'Tháng trước',
        'Thu nhập': lastMonthData.income,
        'Chi tiêu': lastMonthData.spending,
        'Số dư': lastMonthData.balance
      },
      {
        name: 'Tháng này',
        'Thu nhập': currentMonthData.income,
        'Chi tiêu': currentMonthData.spending,
        'Số dư': currentMonthData.balance
      }
    ];

    // Get month names
    const currentMonthName = new Date(currentYear, currentMonth).toLocaleDateString('vi-VN', { month: 'long' });
    const lastMonthName = new Date(lastMonthYear, lastMonth).toLocaleDateString('vi-VN', { month: 'long' });

    return {
      currentMonth: {
        ...currentMonthData,
        name: currentMonthName
      },
      lastMonth: {
        ...lastMonthData,
        name: lastMonthName
      },
      changes: {
        spending: { amount: spendingChange, percent: spendingChangePercent },
        income: { amount: incomeChange, percent: incomeChangePercent },
        balance: { amount: balanceChange, percent: balanceChangePercent }
      },
      chartData
    };
  }, [transactions, incomes]);

  if (!comparisonData) {
    return (
      <ModernCard>
        <div className="text-center py-8">
          <i className="fas fa-balance-scale text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Chưa có dữ liệu so sánh</h3>
          <p className="text-gray-500">Cần ít nhất 2 tháng dữ liệu để so sánh</p>
        </div>
      </ModernCard>
    );
  }

  return (
    <ModernCard gradient glow>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <i className="fas fa-balance-scale text-purple-600 mr-3"></i>
          So sánh tháng này vs tháng trước
        </h3>
      </div>

      {/* Comparison Chart */}
      <div className="mb-6">
        <MonthlyComparisonBarChart data={comparisonData.chartData} />
      </div>

      {/* Detailed Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Income Comparison */}
        <div className="bg-green-50/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-green-800">Thu nhập</h4>
            <i className="fas fa-arrow-up text-green-600"></i>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{comparisonData.lastMonth.name}:</span>
              <span className="font-medium">{formatVietnameseCurrency(comparisonData.lastMonth.income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{comparisonData.currentMonth.name}:</span>
              <span className="font-medium">{formatVietnameseCurrency(comparisonData.currentMonth.income)}</span>
            </div>
            <div className="pt-2 border-t border-green-200">
              <TrendIndicator 
                value={comparisonData.changes.income.amount}
                percentage={comparisonData.changes.income.percent}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Spending Comparison */}
        <div className="bg-red-50/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-red-800">Chi tiêu</h4>
            <i className="fas fa-arrow-down text-red-600"></i>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{comparisonData.lastMonth.name}:</span>
              <span className="font-medium">{formatVietnameseCurrency(comparisonData.lastMonth.spending)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{comparisonData.currentMonth.name}:</span>
              <span className="font-medium">{formatVietnameseCurrency(comparisonData.currentMonth.spending)}</span>
            </div>
            <div className="pt-2 border-t border-red-200">
              <TrendIndicator 
                value={comparisonData.changes.spending.amount}
                percentage={comparisonData.changes.spending.percent}
                size="sm"
                inverted={true} // Red for increase, green for decrease
              />
            </div>
          </div>
        </div>

        {/* Balance Comparison */}
        <div className="bg-purple-50/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-purple-800">Số dư</h4>
            <i className="fas fa-wallet text-purple-600"></i>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{comparisonData.lastMonth.name}:</span>
              <span className={`font-medium ${
                comparisonData.lastMonth.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatVietnameseCurrency(comparisonData.lastMonth.balance)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{comparisonData.currentMonth.name}:</span>
              <span className={`font-medium ${
                comparisonData.currentMonth.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatVietnameseCurrency(comparisonData.currentMonth.balance)}
              </span>
            </div>
            <div className="pt-2 border-t border-purple-200">
              <TrendIndicator 
                value={comparisonData.changes.balance.amount}
                percentage={comparisonData.changes.balance.percent}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-3 bg-gray-50/80 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">GD tháng trước</div>
          <div className="font-semibold text-gray-800 text-sm">
            {comparisonData.lastMonth.transactionCount}
          </div>
        </div>
        
        <div className="text-center p-3 bg-gray-50/80 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">GD tháng này</div>
          <div className="font-semibold text-gray-800 text-sm">
            {comparisonData.currentMonth.transactionCount}
          </div>
        </div>

        <div className="text-center p-3 bg-blue-50/80 rounded-lg">
          <div className="text-xs text-blue-600 mb-1">Tỷ lệ chi/thu (trước)</div>
          <div className="font-semibold text-blue-800 text-sm">
            {comparisonData.lastMonth.income > 0 ? 
              ((comparisonData.lastMonth.spending / comparisonData.lastMonth.income) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="text-center p-3 bg-blue-50/80 rounded-lg">
          <div className="text-xs text-blue-600 mb-1">Tỷ lệ chi/thu (nay)</div>
          <div className="font-semibold text-blue-800 text-sm">
            {comparisonData.currentMonth.income > 0 ? 
              ((comparisonData.currentMonth.spending / comparisonData.currentMonth.income) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-2">
        {/* Income Insight */}
        {Math.abs(comparisonData.changes.income.percent) > 5 && (
          <div className={`text-xs px-3 py-2 rounded-full ${
            comparisonData.changes.income.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {comparisonData.changes.income.amount > 0 ? '📈' : '📉'} Thu nhập {
              comparisonData.changes.income.amount > 0 ? 'tăng' : 'giảm'
            } {Math.abs(comparisonData.changes.income.percent).toFixed(1)}% so với tháng trước
          </div>
        )}

        {/* Spending Insight */}
        {Math.abs(comparisonData.changes.spending.percent) > 5 && (
          <div className={`text-xs px-3 py-2 rounded-full ${
            comparisonData.changes.spending.amount < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {comparisonData.changes.spending.amount < 0 ? '👍' : '⚠️'} Chi tiêu {
              comparisonData.changes.spending.amount > 0 ? 'tăng' : 'giảm'
            } {Math.abs(comparisonData.changes.spending.percent).toFixed(1)}% so với tháng trước
          </div>
        )}

        {/* Balance Insight */}
        <div className={`text-xs px-3 py-2 rounded-full ${
          comparisonData.currentMonth.balance > comparisonData.lastMonth.balance ? 
            'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          💰 Số dư tháng này {
            comparisonData.currentMonth.balance > comparisonData.lastMonth.balance ? 'tốt hơn' : 'kém hơn'
          } tháng trước {formatVietnameseCurrency(Math.abs(comparisonData.changes.balance.amount))}
        </div>
      </div>
    </ModernCard>
  );
};

export default MonthlyComparison;
