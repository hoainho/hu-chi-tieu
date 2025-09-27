import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import { AreaChart, BarChart } from '../charts/ReusableCharts';
import ModernCard from '../ui/ModernCard';

const EnhancedSpendingTrends: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);

  // Analyze spending data
  const spendingAnalysis = useMemo(() => {
    if (!transactions.length) return null;

    // Filter expense transactions from last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const expenseTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && 
             txnDate >= twelveMonthsAgo && 
             txn.amount < 0; // Expense transactions have negative amounts
    });

    if (expenseTransactions.length === 0) return null;

    // Group by month
    const monthlySpending: Record<string, number> = {};
    const categorySpending: Record<string, number> = {};
    const dailySpending: Record<string, number> = {};

    expenseTransactions.forEach(txn => {
      const txnDate = toDate(txn.date);
      if (!txnDate) return;

      const amount = Math.abs(txn.amount);
      
      // Monthly grouping
      const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + amount;
      
      // Category grouping
      const category = txn.envelope || 'Khác';
      categorySpending[category] = (categorySpending[category] || 0) + amount;
      
      // Daily grouping (last 30 days for daily trend)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (txnDate >= thirtyDaysAgo) {
        const dayKey = txnDate.toISOString().split('T')[0];
        dailySpending[dayKey] = (dailySpending[dayKey] || 0) + amount;
      }
    });

    // Prepare monthly chart data
    const monthlyChartData = Object.entries(monthlySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('vi-VN', { 
          month: 'short', 
          year: 'numeric' 
        }),
        amount,
        formattedAmount: formatVietnameseCurrency(amount)
      }));

    // Prepare category chart data
    const categoryChartData = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10 categories
      .map(([category, amount]) => ({
        category: category.length > 15 ? category.substring(0, 15) + '...' : category,
        amount,
        percentage: (amount / Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0)) * 100
      }));

    // Prepare daily trend data (last 30 days)
    const dailyChartData = Object.entries(dailySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString('vi-VN', { 
          day: '2-digit',
          month: '2-digit'
        }),
        amount
      }));

    // Calculate insights
    const amounts = monthlyChartData.map(d => d.amount);
    const avgSpending = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const lastMonth = amounts[amounts.length - 1] || 0;
    const previousMonth = amounts[amounts.length - 2] || 0;
    const monthlyChange = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
    
    const totalSpending = Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0);
    const topCategory = categoryChartData[0];

    // AI-powered insights
    const insights = [];

    // Trend analysis
    if (monthlyChange > 15) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        title: 'Chi tiêu tăng đáng kể',
        message: `Chi tiêu tháng này tăng ${monthlyChange.toFixed(1)}% so với tháng trước. Hãy xem xét điều chỉnh ngân sách.`,
        action: 'Xem chi tiết ngân sách'
      });
    } else if (monthlyChange < -15) {
      insights.push({
        type: 'success',
        icon: 'fas fa-check-circle',
        title: 'Tiết kiệm xuất sắc',
        message: `Chi tiêu giảm ${Math.abs(monthlyChange).toFixed(1)}% so với tháng trước. Bạn đang quản lý tài chính rất tốt!`,
        action: 'Tiếp tục duy trì'
      });
    }

    // Category concentration
    if (topCategory && topCategory.percentage > 50) {
      insights.push({
        type: 'info',
        icon: 'fas fa-chart-pie',
        title: 'Tập trung chi tiêu cao',
        message: `${topCategory.percentage.toFixed(1)}% chi tiêu tập trung vào "${topCategory.category}". Cân nhắc đa dạng hóa.`,
        action: 'Phân tích chi tiết'
      });
    }

    // Spending pattern analysis
    const recentTrend = amounts.slice(-3);
    const isIncreasing = recentTrend.every((amt, i) => i === 0 || amt >= recentTrend[i - 1]);
    const isDecreasing = recentTrend.every((amt, i) => i === 0 || amt <= recentTrend[i - 1]);

    if (isIncreasing && recentTrend.length >= 3) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-trending-up',
        title: 'Xu hướng tăng liên tục',
        message: 'Chi tiêu tăng trong 3 tháng gần đây. Cần kiểm soát ngân sách.',
        action: 'Tạo kế hoạch tiết kiệm'
      });
    } else if (isDecreasing && recentTrend.length >= 3) {
      insights.push({
        type: 'success',
        icon: 'fas fa-trending-down',
        title: 'Xu hướng tiết kiệm tốt',
        message: 'Chi tiêu giảm dần trong 3 tháng gần đây. Excellent!',
        action: 'Duy trì thói quen tốt'
      });
    }

    // Budget comparison (if available)
    const avgDailySpending = totalSpending / expenseTransactions.length;
    if (avgDailySpending > 500000) { // 500k VND per day
      insights.push({
        type: 'info',
        icon: 'fas fa-calculator',
        title: 'Chi tiêu hàng ngày cao',
        message: `Chi tiêu trung bình ${formatVietnameseCurrency(avgDailySpending)}/ngày. Cân nhắc thiết lập ngân sách hàng ngày.`,
        action: 'Thiết lập ngân sách'
      });
    }

    return {
      monthlyChartData,
      categoryChartData,
      dailyChartData,
      avgSpending,
      monthlyChange,
      totalSpending,
      insights,
      totalTransactions: expenseTransactions.length
    };
  }, [transactions]);

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
    <div className="space-y-6">
      {/* Main Trends Card */}
      <ModernCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Xu hướng chi tiêu</h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">Tổng chi tiêu (12 tháng)</div>
            <div className="text-lg font-bold text-red-600">
              {formatVietnameseCurrency(spendingAnalysis.totalSpending)}
            </div>
          </div>
        </div>
        
        {/* Monthly Trend Chart */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Xu hướng theo tháng</h4>
          <AreaChart
            data={spendingAnalysis.monthlyChartData}
            xKey="month"
            yKey="amount"
            height={250}
            color="#EF4444"
          />
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
      </ModernCard>

      {/* Category Analysis */}
      <ModernCard>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Phân tích theo danh mục</h4>
        <BarChart
          data={spendingAnalysis.categoryChartData}
          xKey="category"
          yKey="amount"
          height={250}
          color="#F59E0B"
        />
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {spendingAnalysis.categoryChartData.slice(0, 6).map((category, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-800">{category.category}</span>
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
      </ModernCard>

      {/* AI Insights */}
      <ModernCard>
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <i className="fas fa-brain text-purple-500 mr-2"></i>
          Phân tích AI & Khuyến nghị
        </h4>
        
        <div className="space-y-3">
          {spendingAnalysis.insights.map((insight, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
              insight.type === 'success' ? 'bg-green-50 border-green-400' :
              'bg-blue-50 border-blue-400'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <i className={`${insight.icon} ${
                    insight.type === 'warning' ? 'text-yellow-600' :
                    insight.type === 'success' ? 'text-green-600' :
                    'text-blue-600'
                  } mr-3 mt-1`}></i>
                  <div>
                    <div className="font-medium text-gray-800">{insight.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{insight.message}</div>
                  </div>
                </div>
                <button className={`text-xs px-3 py-1 rounded-full ${
                  insight.type === 'warning' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                  insight.type === 'success' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                  'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } transition-colors`}>
                  {insight.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </ModernCard>
    </div>
  );
};

export default EnhancedSpendingTrends;
