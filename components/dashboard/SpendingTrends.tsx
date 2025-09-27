import React, { useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import ModernCard from '../ui/ModernCard';

const SpendingTrends: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);

  // Analyze spending trends
  const spendingAnalysis = useMemo(() => {
    if (!transactions.length) return null;

    // Filter expense transactions from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenseTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && 
             txnDate >= sixMonthsAgo && 
             txn.amount < 0; // Expense transactions have negative amounts
    });

    if (expenseTransactions.length === 0) return null;

    // Group by month
    const monthlySpending: Record<string, number> = {};
    const categorySpending: Record<string, number> = {};

    expenseTransactions.forEach(txn => {
      const txnDate = toDate(txn.date);
      if (!txnDate) return;

      const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + Math.abs(txn.amount); // Use absolute value for expenses
      
      const category = txn.envelope || 'Khác';
      categorySpending[category] = (categorySpending[category] || 0) + Math.abs(txn.amount);
    });

    // Prepare chart data
    const chartData = Object.entries(monthlySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
        amount,
        formattedAmount: formatVietnameseCurrency(amount)
      }));

    // Calculate trends
    const amounts = chartData.map(d => d.amount);
    const avgSpending = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const lastMonth = amounts[amounts.length - 1] || 0;
    const previousMonth = amounts[amounts.length - 2] || 0;
    const monthlyChange = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;

    // Top spending categories
    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0)) * 100
      }));

    // AI-powered insights
    const insights = generateSpendingInsights(chartData, topCategories, monthlyChange, avgSpending);

    return {
      chartData,
      avgSpending,
      monthlyChange,
      topCategories,
      insights,
      totalTransactions: expenseTransactions.length
    };
  }, [transactions]);

  // AI-powered spending insights
  const generateSpendingInsights = (
    chartData: any[],
    topCategories: any[],
    monthlyChange: number,
    avgSpending: number
  ) => {
    const insights = [];

    // Trend analysis
    if (monthlyChange > 10) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        title: 'Chi tiêu tăng cao',
        message: `Chi tiêu tháng này tăng ${monthlyChange.toFixed(1)}% so với tháng trước. Hãy xem xét điều chỉnh ngân sách.`
      });
    } else if (monthlyChange < -10) {
      insights.push({
        type: 'success',
        icon: 'fas fa-check-circle',
        title: 'Tiết kiệm tốt',
        message: `Chi tiêu giảm ${Math.abs(monthlyChange).toFixed(1)}% so với tháng trước. Bạn đang tiết kiệm rất tốt!`
      });
    }

    // Category analysis
    if (topCategories.length > 0) {
      const topCategory = topCategories[0];
      if (topCategory.percentage > 40) {
        insights.push({
          type: 'info',
          icon: 'fas fa-chart-pie',
          title: 'Tập trung chi tiêu',
          message: `${topCategory.percentage.toFixed(1)}% chi tiêu tập trung vào "${topCategory.category}". Cân nhắc đa dạng hóa chi tiêu.`
        });
      }
    }

    // Spending pattern
    const recentTrend = chartData.slice(-3).map(d => d.amount);
    const isIncreasing = recentTrend.every((amt, i) => i === 0 || amt >= recentTrend[i - 1]);
    const isDecreasing = recentTrend.every((amt, i) => i === 0 || amt <= recentTrend[i - 1]);

    if (isIncreasing && recentTrend.length >= 3) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-trending-up',
        title: 'Xu hướng tăng',
        message: 'Chi tiêu có xu hướng tăng liên tục trong 3 tháng gần đây. Hãy kiểm soát ngân sách.'
      });
    } else if (isDecreasing && recentTrend.length >= 3) {
      insights.push({
        type: 'success',
        icon: 'fas fa-trending-down',
        title: 'Xu hướng giảm',
        message: 'Chi tiêu có xu hướng giảm trong 3 tháng gần đây. Bạn đang quản lý tài chính rất tốt!'
      });
    }

    return insights;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-red-600">
            Chi tiêu: {formatVietnameseCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!spendingAnalysis) {
    return (
      <ModernCard>
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Xu hướng chi tiêu</h3>
        <div className="text-center py-12">
          <i className="fas fa-chart-line text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-500 mb-2">Chưa có dữ liệu chi tiêu</p>
          <p className="text-sm text-gray-400">Thêm giao dịch chi tiêu để xem xu hướng</p>
        </div>
      </ModernCard>
    );
  }

  return (
    <ModernCard>
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Xu hướng chi tiêu</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingAnalysis.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatVietnameseCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#EF4444" 
                  fill="#FEE2E2" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">Chi tiêu TB/tháng</div>
              <div className="font-semibold text-blue-800">
                {formatVietnameseCurrency(spendingAnalysis.avgSpending)}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${
              spendingAnalysis.monthlyChange >= 0 ? 'bg-red-50' : 'bg-green-50'
            }`}>
              <div className={`text-sm ${
                spendingAnalysis.monthlyChange >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                Thay đổi tháng này
              </div>
              <div className={`font-semibold ${
                spendingAnalysis.monthlyChange >= 0 ? 'text-red-800' : 'text-green-800'
              }`}>
                {spendingAnalysis.monthlyChange >= 0 ? '+' : ''}{spendingAnalysis.monthlyChange.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Tổng giao dịch</div>
              <div className="font-semibold text-gray-800">
                {spendingAnalysis.totalTransactions}
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights & Top Categories */}
        <div className="space-y-6">
          {/* AI Insights */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <i className="fas fa-brain text-purple-500 mr-2"></i>
              Phân tích AI
            </h4>
            <div className="space-y-3">
              {spendingAnalysis.insights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                  insight.type === 'success' ? 'bg-green-50 border-green-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-start">
                    <i className={`${insight.icon} ${
                      insight.type === 'warning' ? 'text-yellow-600' :
                      insight.type === 'success' ? 'text-green-600' :
                      'text-blue-600'
                    } mr-2 mt-1`}></i>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{insight.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{insight.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Categories */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Danh mục chi tiêu hàng đầu</h4>
            <div className="space-y-2">
              {spendingAnalysis.topCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-800">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-800">
                      {formatVietnameseCurrency(category.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModernCard>
  );
};

export default SpendingTrends;
