import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import ModernCard from '../ui/ModernCard';
import TrendIndicator from '../ui/TrendIndicator';
import AnimatedNumber from '../ui/AnimatedNumber';

const MonthlyIncomeStats: React.FC = () => {
  const { incomes } = useAppSelector(state => state.income);

  const monthlyIncomeAnalysis = useMemo(() => {
    if (!incomes.length) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
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

    // Get last month income
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
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

    // Calculate change
    const change = currentMonthIncome - lastMonthIncome;
    const changePercent = lastMonthIncome > 0 ? (change / lastMonthIncome) * 100 : 0;

    // Get last 6 months data for trend
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.getMonth();
      const yearKey = date.getFullYear();
      
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
        income: monthIncome,
        fullDate: new Date(yearKey, monthKey)
      });
    }

    // Calculate average income
    const avgIncome = monthlyData.reduce((sum, month) => sum + month.income, 0) / monthlyData.length;

    // Find highest income month
    const highestIncomeMonth = monthlyData.reduce((max, month) => 
      month.income > max.income ? month : max, monthlyData[0]);

    return {
      currentMonthIncome,
      lastMonthIncome,
      change,
      changePercent,
      monthlyData,
      avgIncome,
      highestIncomeMonth,
      incomeCount: incomes.filter(income => {
        const incomeDate = typeof income.date === 'string' 
          ? new Date(income.date)
          : toDate(income.date);
        return incomeDate && 
               incomeDate.getMonth() === currentMonth && 
               incomeDate.getFullYear() === currentYear;
      }).length
    };
  }, [incomes]);

  if (!monthlyIncomeAnalysis) {
    return (
      <ModernCard>
        <div className="text-center py-8">
          <i className="fas fa-dollar-sign text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Chưa có dữ liệu thu nhập</h3>
          <p className="text-gray-500">Thêm thu nhập để xem thống kê</p>
        </div>
      </ModernCard>
    );
  }

  return (
    <ModernCard gradient glow>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <i className="fas fa-chart-line text-green-600 mr-3"></i>
          Thu nhập tháng này
        </h3>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Current Month Income */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-green-600 mb-2">
          <AnimatedNumber 
            value={monthlyIncomeAnalysis.currentMonthIncome}
            formatter={(val) => formatVietnameseCurrency(val)}
          />
        </div>
        <div className="text-sm text-gray-600 mb-3">
          {monthlyIncomeAnalysis.incomeCount} nguồn thu nhập
        </div>
        
        {/* Trend vs Last Month */}
        <TrendIndicator 
          value={monthlyIncomeAnalysis.change}
          percentage={monthlyIncomeAnalysis.changePercent}
          size="sm"
          label="so với tháng trước"
        />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50/80 rounded-lg">
          <div className="text-xs text-green-600 mb-1">TB 6 tháng</div>
          <div className="font-semibold text-green-800 text-sm">
            {formatVietnameseCurrency(monthlyIncomeAnalysis.avgIncome)}
          </div>
        </div>
        
        <div className="text-center p-3 bg-blue-50/80 rounded-lg">
          <div className="text-xs text-blue-600 mb-1">Cao nhất</div>
          <div className="font-semibold text-blue-800 text-sm">
            {monthlyIncomeAnalysis.highestIncomeMonth.month}
          </div>
        </div>
      </div>

      {/* Mini Trend Chart */}
      <div className="mt-4">
        <div className="text-xs text-gray-500 mb-2">Xu hướng 6 tháng gần đây</div>
        <div className="flex items-end justify-between h-12 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-2">
          {monthlyIncomeAnalysis.monthlyData.map((month, index) => {
            const maxIncome = Math.max(...monthlyIncomeAnalysis.monthlyData.map(m => m.income));
            const height = maxIncome > 0 ? (month.income / maxIncome) * 100 : 0;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-2 bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${month.month}: ${formatVietnameseCurrency(month.income)}`}
                ></div>
                <div className="text-xs text-gray-500 mt-1">{month.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      <div className={`text-center text-xs px-3 py-2 rounded-full mt-4 ${
        monthlyIncomeAnalysis.changePercent > 10 ? 'bg-green-100 text-green-700' :
        monthlyIncomeAnalysis.changePercent < -10 ? 'bg-red-100 text-red-700' :
        'bg-blue-100 text-blue-700'
      }`}>
        {monthlyIncomeAnalysis.changePercent > 10 ? '📈 Thu nhập tăng mạnh tháng này!' :
         monthlyIncomeAnalysis.changePercent < -10 ? '📉 Thu nhập giảm đáng kể' :
         '📊 Thu nhập ổn định'}
      </div>
    </ModernCard>
  );
};

export default MonthlyIncomeStats;
