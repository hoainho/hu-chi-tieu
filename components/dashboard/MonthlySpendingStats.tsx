import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import ModernCard from '../ui/ModernCard';
import TrendIndicator from '../ui/TrendIndicator';
import AnimatedNumber from '../ui/AnimatedNumber';
import { formatCurrency } from '@/utils/formatters';

const MonthlySpendingStats: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);
  const { incomes } = useAppSelector(state => state.income);

  const monthlySpendingAnalysis = useMemo(() => {
    if (!transactions.length && !incomes.length) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get current month spending (positive amounts that are not income/transfer)
    const currentMonthSpending = transactions
      .filter(txn => {
        const txnDate = toDate(txn.date);
        return txnDate && 
               txnDate.getMonth() === currentMonth && 
               txnDate.getFullYear() === currentYear &&
               (txn.amount < 0 || // Traditional negative amounts
                (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

    // Get current month income
    const currentMonthIncome = incomes
      .filter(income => {
        const incomeDate = typeof income.date === 'string' 
          ? new Date(income.date)
          : toDate(income.date);
        return incomeDate && 
               incomeDate.getMonth() === currentMonth && 
               incomeDate.getFullYear() === currentYear;
      })
      .reduce((sum, income) => sum + income.amount, 0);

    // Calculate current month surplus/deficit
    const currentMonthBalance = currentMonthIncome - currentMonthSpending;

    // Get last month data
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const lastMonthSpending = transactions
      .filter(txn => {
        const txnDate = toDate(txn.date);
        return txnDate && 
               txnDate.getMonth() === lastMonth && 
               txnDate.getFullYear() === lastMonthYear &&
               (txn.amount < 0 || 
                (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

    const lastMonthIncome = incomes
      .filter(income => {
        const incomeDate = typeof income.date === 'string' 
          ? new Date(income.date)
          : toDate(income.date);
        return incomeDate && 
               incomeDate.getMonth() === lastMonth && 
               incomeDate.getFullYear() === lastMonthYear;
      })
      .reduce((sum, income) => sum + income.amount, 0);

    const lastMonthBalance = lastMonthIncome - lastMonthSpending;

    // Calculate changes
    const spendingChange = currentMonthSpending - lastMonthSpending;
    const spendingChangePercent = lastMonthSpending > 0 ? (spendingChange / lastMonthSpending) * 100 : 0;
    const balanceChange = currentMonthBalance - lastMonthBalance;

    // Get last 6 months data for trend
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.getMonth();
      const yearKey = date.getFullYear();
      
      const monthSpending = transactions
        .filter(txn => {
          const txnDate = toDate(txn.date);
          return txnDate && 
                 txnDate.getMonth() === monthKey && 
                 txnDate.getFullYear() === yearKey &&
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
                 incomeDate.getMonth() === monthKey && 
                 incomeDate.getFullYear() === yearKey;
        })
        .reduce((sum, income) => sum + income.amount, 0);

      monthlyData.push({
        month: date.toLocaleDateString('vi-VN', { month: 'short' }),
        spending: monthSpending,
        income: monthIncome,
        balance: monthIncome - monthSpending,
        fullDate: new Date(yearKey, monthKey)
      });
    }

    // Calculate averages
    const avgSpending = monthlyData.reduce((sum, month) => sum + month.spending, 0) / monthlyData.length;
    const avgBalance = monthlyData.reduce((sum, month) => sum + month.balance, 0) / monthlyData.length;

    // Find highest spending month
    const highestSpendingMonth = monthlyData.reduce((max, month) => 
      month.spending > max.spending ? month : max, monthlyData[0]);

    // Calculate spending rate (spending/income ratio)
    const spendingRate = currentMonthIncome > 0 ? (currentMonthSpending / currentMonthIncome) * 100 : 0;

    return {
      currentMonthSpending,
      currentMonthIncome,
      currentMonthBalance,
      lastMonthSpending,
      lastMonthBalance,
      spendingChange,
      spendingChangePercent,
      balanceChange,
      monthlyData,
      avgSpending,
      avgBalance,
      highestSpendingMonth,
      spendingRate,
      transactionCount: transactions.filter(txn => {
        const txnDate = toDate(txn.date);
        return txnDate && 
               txnDate.getMonth() === currentMonth && 
               txnDate.getFullYear() === currentYear &&
               (txn.amount < 0 || 
                (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
      }).length
    };
  }, [transactions, incomes]);

  if (!monthlySpendingAnalysis) {
    return (
      <ModernCard>
        <div className="text-center py-8">
          <i className="fas fa-chart-pie text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Chưa có dữ liệu chi tiêu</h3>
          <p className="text-gray-500">Thêm giao dịch để xem thống kê</p>
        </div>
      </ModernCard>
    );
  }

  return (
    <ModernCard gradient glow>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <i className="fas fa-chart-pie text-red-600 mr-3"></i>
          Chi tiêu & Số dư tháng này
        </h3>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Current Month Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Spending */}
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-1">
            <AnimatedNumber 
              value={monthlySpendingAnalysis.currentMonthSpending}
              formatter={(val) => formatVietnameseCurrency(val)}
            />
          </div>
          <div className="text-xs text-gray-600 mb-2">
            Tổng chi tiêu ({monthlySpendingAnalysis.transactionCount} GD)
          </div>
          <TrendIndicator 
            value={monthlySpendingAnalysis.spendingChange}
            size="xs"
            inverted={true} // Red for increase, green for decrease
          />
        </div>

        {/* Balance/Surplus */}
        <div className="text-center">
          <div className={`text-2xl font-bold mb-1 ${
            monthlySpendingAnalysis.currentMonthBalance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <AnimatedNumber 
              value={monthlySpendingAnalysis.currentMonthBalance}
              formatter={(val) => formatVietnameseCurrency(val)}
            />
          </div>
          <div className="text-xs text-gray-600 mb-2">
            {monthlySpendingAnalysis.currentMonthBalance >= 0 ? 'Số dư' : 'Thâm hụt'}
          </div>
          <TrendIndicator 
            value={monthlySpendingAnalysis.balanceChange}
            size="xs"
          />
        </div>
      </div>

      {/* Spending Rate */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Tỷ lệ chi tiêu</span>
          <span className={`text-sm font-semibold ${
            monthlySpendingAnalysis.spendingRate > 80 ? 'text-red-600' :
            monthlySpendingAnalysis.spendingRate > 60 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {monthlySpendingAnalysis.spendingRate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              monthlySpendingAnalysis.spendingRate > 80 ? 'bg-red-500' :
              monthlySpendingAnalysis.spendingRate > 60 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(monthlySpendingAnalysis.spendingRate, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-red-50/80 rounded-lg">
          <div className="text-xs text-red-600 mb-1">TB chi tiêu</div>
          <div className="font-semibold text-red-800 text-xs">
            {formatVietnameseCurrency(monthlySpendingAnalysis.avgSpending)}
          </div>
        </div>
        
        <div className="text-center p-2 bg-orange-50/80 rounded-lg">
          <div className="text-xs text-orange-600 mb-1">Chi nhiều nhất</div>
          <div className="font-semibold text-orange-800 text-xs">
            {monthlySpendingAnalysis.highestSpendingMonth.month}
          </div>
        </div>

        <div className="text-center p-2 bg-blue-50/80 rounded-lg">
          <div className="text-xs text-blue-600 mb-1">TB số dư</div>
          <div className={`font-semibold text-xs ${
            monthlySpendingAnalysis.avgBalance >= 0 ? 'text-blue-800' : 'text-red-800'
          }`}>
            {formatVietnameseCurrency(monthlySpendingAnalysis.avgBalance)}
          </div>
        </div>
      </div>

      {/* Mini Balance Trend Chart */}
      <div className="mt-4">
        <div className="text-xs text-gray-500 mb-2">Xu hướng số dư 6 tháng</div>
        <div className="flex items-center justify-between h-12 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-2">
          {monthlySpendingAnalysis.monthlyData.map((month, index) => {
            const maxBalance = Math.max(...monthlySpendingAnalysis.monthlyData.map(m => Math.abs(m.balance)));
            const height = maxBalance > 0 ? (Math.abs(month.balance) / maxBalance) * 100 : 0;
            const isPositive = month.balance >= 0;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-2 rounded transition-all duration-500 hover:opacity-80 ${
                    isPositive ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    height: `${Math.max(height, 2)}%`,
                    marginTop: isPositive ? 'auto' : '0'
                  }}
                  title={`${month.month}: ${formatVietnameseCurrency(month.balance)}`}
                ></div>
                <div className="text-xs text-gray-500 mt-1">{month.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      <div className={`text-center text-xs px-3 py-2 rounded-full mt-4 ${
        monthlySpendingAnalysis.currentMonthBalance < 0 ? 'bg-red-100 text-red-700' :
        monthlySpendingAnalysis.spendingRate > 80 ? 'bg-yellow-100 text-yellow-700' :
        monthlySpendingAnalysis.spendingChangePercent < -10 ? 'bg-green-100 text-green-700' :
        'bg-blue-100 text-blue-700'
      }`}>
        {monthlySpendingAnalysis.currentMonthBalance < 0 ? '⚠️ Tháng này chi vượt thu nhập!' :
         monthlySpendingAnalysis.spendingRate > 80 ? '💡 Nên tiết kiệm chi tiêu' :
         monthlySpendingAnalysis.spendingChangePercent < -10 ? '👍 Chi tiêu giảm đáng kể' :
         '📊 Chi tiêu trong tầm kiểm soát'}
      </div>
    </ModernCard>
  );
};

export default MonthlySpendingStats;
