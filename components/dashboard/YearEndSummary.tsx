import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import ModernCard from '../ui/ModernCard';
import AnimatedNumber from '../ui/AnimatedNumber';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';

const YearEndSummary: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);
  const { incomes } = useAppSelector(state => state.income);

  const yearlyAnalysis = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    // Helper function to get year data
    const getYearData = (year: number) => {
      // Get year spending
      const yearSpending = transactions
        .filter(txn => {
          const txnDate = toDate(txn.date);
          return txnDate && 
                 txnDate.getFullYear() === year &&
                 (txn.amount < 0 || 
                  (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
        })
        .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

      // Get year income
      const yearIncome = incomes
        .filter(income => {
          const incomeDate = typeof income.date === 'string' 
            ? new Date(income.date)
            : toDate(income.date);
          return incomeDate && incomeDate.getFullYear() === year;
        })
        .reduce((sum, income) => sum + income.amount, 0);

      // Monthly breakdown
      const monthlyData = [];
      for (let month = 0; month < 12; month++) {
        const monthSpending = transactions
          .filter(txn => {
            const txnDate = toDate(txn.date);
            return txnDate && 
                   txnDate.getFullYear() === year &&
                   txnDate.getMonth() === month &&
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
                   incomeDate.getFullYear() === year &&
                   incomeDate.getMonth() === month;
          })
          .reduce((sum, income) => sum + income.amount, 0);

        monthlyData.push({
          month: new Date(year, month).toLocaleDateString('vi-VN', { month: 'short' }),
          spending: monthSpending,
          income: monthIncome,
          balance: monthIncome - monthSpending
        });
      }

      // Category breakdown
      const categorySpending: Record<string, number> = {};
      transactions
        .filter(txn => {
          const txnDate = toDate(txn.date);
          return txnDate && 
                 txnDate.getFullYear() === year &&
                 (txn.amount < 0 || 
                  (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
        })
        .forEach(txn => {
          const category = txn.category || 'other';
          categorySpending[category] = (categorySpending[category] || 0) + Math.abs(txn.amount);
        });

      const topCategories = Object.entries(categorySpending)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        year,
        totalSpending: yearSpending,
        totalIncome: yearIncome,
        balance: yearIncome - yearSpending,
        monthlyData,
        topCategories,
        avgMonthlySpending: yearSpending / 12,
        avgMonthlyIncome: yearIncome / 12,
        transactionCount: transactions.filter(txn => {
          const txnDate = toDate(txn.date);
          return txnDate && txnDate.getFullYear() === year;
        }).length
      };
    };

    const currentYearData = getYearData(currentYear);
    const lastYearData = getYearData(lastYear);

    // Calculate year-over-year changes
    const spendingChange = currentYearData.totalSpending - lastYearData.totalSpending;
    const spendingChangePercent = lastYearData.totalSpending > 0 ? 
      (spendingChange / lastYearData.totalSpending) * 100 : 0;

    const incomeChange = currentYearData.totalIncome - lastYearData.totalIncome;
    const incomeChangePercent = lastYearData.totalIncome > 0 ? 
      (incomeChange / lastYearData.totalIncome) * 100 : 0;

    // Find spending patterns
    const highestSpendingMonth = currentYearData.monthlyData.reduce((max, month) => 
      month.spending > max.spending ? month : max, currentYearData.monthlyData[0]);

    const lowestSpendingMonth = currentYearData.monthlyData.reduce((min, month) => 
      month.spending < min.spending ? month : min, currentYearData.monthlyData[0]);

    // Spending trend analysis
    const firstHalf = currentYearData.monthlyData.slice(0, 6).reduce((sum, m) => sum + m.spending, 0);
    const secondHalf = currentYearData.monthlyData.slice(6, 12).reduce((sum, m) => sum + m.spending, 0);
    const trendDirection = secondHalf > firstHalf ? 'tăng' : 'giảm';

    return {
      currentYear: currentYearData,
      lastYear: lastYearData,
      changes: {
        spending: { amount: spendingChange, percent: spendingChangePercent },
        income: { amount: incomeChange, percent: incomeChangePercent }
      },
      insights: {
        highestSpendingMonth,
        lowestSpendingMonth,
        trendDirection,
        savingsRate: currentYearData.totalIncome > 0 ? 
          ((currentYearData.totalIncome - currentYearData.totalSpending) / currentYearData.totalIncome) * 100 : 0
      }
    };
  }, [transactions, incomes]);

  // Check if it's January 1st - ONLY show on New Year's Day
  const currentDate = new Date();
  const isNewYear = currentDate.getMonth() === 0 && currentDate.getDate() === 1;

  if (!isNewYear) {
    return null; // Only show on January 1st
  }

  return (
    <ModernCard gradient glow className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center">
          <i className="fas fa-calendar-alt text-yellow-600 mr-3"></i>
          🎉 Tổng kết năm {yearlyAnalysis.currentYear.year - 1}
        </h3>
        <div className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
          Chúc mừng năm mới! 🎊
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Income */}
        <div className="text-center p-6 bg-green-50/80 rounded-xl">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-arrow-up text-2xl text-white"></i>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">
            <AnimatedNumber 
              value={yearlyAnalysis.currentYear.totalIncome}
              formatter={(val) => formatVietnameseCurrency(val)}
            />
          </div>
          <div className="text-sm text-green-700 mb-2">Tổng thu nhập năm {yearlyAnalysis.currentYear.year}</div>
          <div className="text-xs text-green-600">
            TB: {formatVietnameseCurrency(yearlyAnalysis.currentYear.avgMonthlyIncome)}/tháng
          </div>
        </div>

        {/* Total Spending */}
        <div className="text-center p-6 bg-red-50/80 rounded-xl">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-arrow-down text-2xl text-white"></i>
          </div>
          <div className="text-3xl font-bold text-red-600 mb-2">
            <AnimatedNumber 
              value={yearlyAnalysis.currentYear.totalSpending}
              formatter={(val) => formatVietnameseCurrency(val)}
            />
          </div>
          <div className="text-sm text-red-700 mb-2">Tổng chi tiêu năm {yearlyAnalysis.currentYear.year}</div>
          <div className="text-xs text-red-600">
            TB: {formatVietnameseCurrency(yearlyAnalysis.currentYear.avgMonthlySpending)}/tháng
          </div>
        </div>

        {/* Net Balance */}
        <div className="text-center p-6 bg-blue-50/80 rounded-xl">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            yearlyAnalysis.currentYear.balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'
          }`}>
            <i className={`fas ${yearlyAnalysis.currentYear.balance >= 0 ? 'fa-piggy-bank' : 'fa-exclamation-triangle'} text-2xl text-white`}></i>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            yearlyAnalysis.currentYear.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
          }`}>
            <AnimatedNumber 
              value={yearlyAnalysis.currentYear.balance}
              formatter={(val) => formatVietnameseCurrency(val)}
            />
          </div>
          <div className={`text-sm mb-2 ${
            yearlyAnalysis.currentYear.balance >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            {yearlyAnalysis.currentYear.balance >= 0 ? 'Tiết kiệm được' : 'Thâm hụt'}
          </div>
          <div className={`text-xs ${
            yearlyAnalysis.currentYear.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
          }`}>
            Tỷ lệ tiết kiệm: {yearlyAnalysis.insights.savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Xu hướng chi tiêu theo tháng</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={yearlyAnalysis.currentYear.monthlyData}>
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatVietnameseCurrency(value), 
                name === 'spending' ? 'Chi tiêu' : name === 'income' ? 'Thu nhập' : 'Số dư'
              ]}
            />
            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} name="income" />
            <Line type="monotone" dataKey="spending" stroke="#EF4444" strokeWidth={3} name="spending" />
            <Line type="monotone" dataKey="balance" stroke="#6366F1" strokeWidth={2} strokeDasharray="5 5" name="balance" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Categories */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Top 5 danh mục chi tiêu</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={yearlyAnalysis.currentYear.topCategories} layout="horizontal">
            <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
            <YAxis dataKey="category" type="category" width={80} />
            <Tooltip formatter={(value: number) => [formatVietnameseCurrency(value), 'Chi tiêu']} />
            <Bar dataKey="amount" fill="#8884d8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Spending Patterns */}
        <div className="bg-purple-50/50 rounded-lg p-4">
          <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
            <i className="fas fa-chart-line text-purple-600 mr-2"></i>
            Mô tả chi tiêu năm {yearlyAnalysis.currentYear.year}
          </h4>
          <div className="space-y-2 text-sm text-purple-700">
            <div>• Chi tiêu cao nhất: <strong>{yearlyAnalysis.insights.highestSpendingMonth.month}</strong> 
              ({formatVietnameseCurrency(yearlyAnalysis.insights.highestSpendingMonth.spending)})</div>
            <div>• Chi tiêu thấp nhất: <strong>{yearlyAnalysis.insights.lowestSpendingMonth.month}</strong> 
              ({formatVietnameseCurrency(yearlyAnalysis.insights.lowestSpendingMonth.spending)})</div>
            <div>• Xu hướng: Chi tiêu <strong>{yearlyAnalysis.insights.trendDirection}</strong> trong nửa cuối năm</div>
            <div>• Tổng giao dịch: <strong>{yearlyAnalysis.currentYear.transactionCount}</strong> giao dịch</div>
          </div>
        </div>

        {/* Year-over-Year Comparison */}
        <div className="bg-indigo-50/50 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
            <i className="fas fa-exchange-alt text-indigo-600 mr-2"></i>
            So sánh với năm {yearlyAnalysis.lastYear.year}
          </h4>
          <div className="space-y-2 text-sm text-indigo-700">
            <div className="flex justify-between">
              <span>Thu nhập:</span>
              <span className={yearlyAnalysis.changes.income.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                {yearlyAnalysis.changes.income.amount >= 0 ? '+' : ''}{yearlyAnalysis.changes.income.percent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Chi tiêu:</span>
              <span className={yearlyAnalysis.changes.spending.amount <= 0 ? 'text-green-600' : 'text-red-600'}>
                {yearlyAnalysis.changes.spending.amount >= 0 ? '+' : ''}{yearlyAnalysis.changes.spending.percent.toFixed(1)}%
              </span>
            </div>
            <div className="pt-2 border-t border-indigo-200">
              <div className="font-medium">
                {yearlyAnalysis.changes.spending.amount < 0 ? '👍 Chi tiêu giảm so với năm trước' :
                 yearlyAnalysis.changes.spending.amount > 0 ? '⚠️ Chi tiêu tăng so với năm trước' :
                 '📊 Chi tiêu ổn định'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Message */}
      <div className={`text-center p-4 rounded-lg ${
        yearlyAnalysis.insights.savingsRate > 20 ? 'bg-green-100 text-green-800' :
        yearlyAnalysis.insights.savingsRate > 0 ? 'bg-blue-100 text-blue-800' :
        'bg-red-100 text-red-800'
      }`}>
        <div className="font-semibold mb-2">
          {yearlyAnalysis.insights.savingsRate > 20 ? '🎉 Xuất sắc! Bạn đã tiết kiệm được hơn 20% thu nhập!' :
           yearlyAnalysis.insights.savingsRate > 0 ? '👍 Tốt! Bạn đã có thể tiết kiệm được một phần thu nhập.' :
           '⚠️ Cần cải thiện! Chi tiêu đã vượt quá thu nhập trong năm này.'}
        </div>
        <div className="text-sm">
          Chúc bạn một năm mới tài chính thịnh vượng!
        </div>
      </div>
    </ModernCard>
  );
};

export default YearEndSummary;
