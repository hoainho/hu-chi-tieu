import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface SpendingInsight {
  type: 'warning' | 'success' | 'info' | 'danger';
  icon: string;
  title: string;
  message: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
}

const SmartSpendingTrends: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);

  // Phân tích dữ liệu chi tiêu thông minh
  const spendingAnalysis = useMemo(() => {
    if (!transactions.length) return null;

    // Lọc giao dịch chi tiêu (số âm) trong 12 tháng gần đây
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const expenseTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && 
             txnDate >= twelveMonthsAgo && 
             (txn.amount < 0 || // Traditional negative amounts
              (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer')); // Or positive amounts that are not income/transfer
    });

    if (expenseTransactions.length === 0) return null;

    // 1. Phân tích theo tháng (12 tháng gần đây)
    const monthlyData: Record<string, { month: string; spending: number; transactions: number }> = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
        spending: 0,
        transactions: 0
      };
    }

    // 2. Phân tích theo danh mục (envelope)
    const categorySpending: Record<string, number> = {};
    
    // 3. Phân tích theo ngày trong tuần
    const weekdaySpending = [0, 0, 0, 0, 0, 0, 0]; // CN, T2, T3, T4, T5, T6, T7
    
    // 4. Phân tích theo giờ trong ngày
    const hourlySpending = Array(24).fill(0);

    expenseTransactions.forEach(txn => {
      const txnDate = toDate(txn.date);
      if (!txnDate) return;

      const amount = Math.abs(txn.amount);
      
      // Tháng
      const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].spending += amount;
        monthlyData[monthKey].transactions++;
      }
      
      // Danh mục
      const category = txn.envelope || txn.description || 'Khác';
      categorySpending[category] = (categorySpending[category] || 0) + amount;
      
      // Ngày trong tuần
      weekdaySpending[txnDate.getDay()] += amount;
      
      // Giờ trong ngày
      hourlySpending[txnDate.getHours()] += amount;
    });

    // Chuẩn bị dữ liệu biểu đồ
    const monthlyChartData = Object.values(monthlyData);
    
    const categoryChartData = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8) // Top 8 categories
      .map(([category, amount]) => ({
        category: category.length > 15 ? category.substring(0, 15) + '...' : category,
        amount,
        percentage: (amount / Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0)) * 100
      }));

    const weekdayChartData = [
      'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
    ].map((day, index) => ({
      day,
      amount: weekdaySpending[index]
    }));

    // Tính toán insights AI
    const totalSpending = Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0);
    const avgMonthlySpending = monthlyChartData.reduce((sum, data) => sum + data.spending, 0) / monthlyChartData.length;
    
    // So sánh 3 tháng gần đây vs 3 tháng trước đó
    const recent3Months = monthlyChartData.slice(-3).reduce((sum, data) => sum + data.spending, 0) / 3;
    const previous3Months = monthlyChartData.slice(-6, -3).reduce((sum, data) => sum + data.spending, 0) / 3;
    const trendChange = previous3Months > 0 ? ((recent3Months - previous3Months) / previous3Months) * 100 : 0;

    // Phân tích thói quen chi tiêu
    const topCategory = categoryChartData[0];
    const weekendSpending = weekdaySpending[0] + weekdaySpending[6]; // CN + T7
    const weekdayTotalSpending = weekdaySpending.slice(1, 6).reduce((sum, amt) => sum + amt, 0); // T2-T6
    const weekendRatio = totalSpending > 0 ? (weekendSpending / totalSpending) * 100 : 0;

    // Tìm giờ chi tiêu nhiều nhất
    const peakHour = hourlySpending.indexOf(Math.max(...hourlySpending));
    const peakHourSpending = hourlySpending[peakHour];

    // Tạo insights thông minh
    const insights: SpendingInsight[] = [];

    // 1. Xu hướng tổng thể
    if (trendChange > 15) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-exclamation-triangle',
        title: 'Chi tiêu tăng đáng kể',
        message: `Chi tiêu 3 tháng gần đây tăng ${trendChange.toFixed(1)}% so với 3 tháng trước. Cần kiểm soát ngân sách.`,
        value: trendChange,
        trend: 'up'
      });
    } else if (trendChange < -15) {
      insights.push({
        type: 'success',
        icon: 'fas fa-check-circle',
        title: 'Tiết kiệm xuất sắc',
        message: `Chi tiêu giảm ${Math.abs(trendChange).toFixed(1)}% so với trước. Bạn đang quản lý tài chính rất tốt!`,
        value: Math.abs(trendChange),
        trend: 'down'
      });
    }

    // 2. Phân tích danh mục
    if (topCategory && topCategory.percentage > 40) {
      insights.push({
        type: 'info',
        icon: 'fas fa-chart-pie',
        title: 'Tập trung chi tiêu cao',
        message: `${topCategory.percentage.toFixed(1)}% chi tiêu tập trung vào "${topCategory.category}". Cân nhắc đa dạng hóa.`,
        value: topCategory.percentage
      });
    }

    // 3. Phân tích thói quen cuối tuần
    if (weekendRatio > 35) {
      insights.push({
        type: 'warning',
        icon: 'fas fa-calendar-weekend',
        title: 'Chi tiêu cuối tuần cao',
        message: `${weekendRatio.toFixed(1)}% chi tiêu vào cuối tuần. Hãy lập kế hoạch chi tiêu hợp lý hơn.`,
        value: weekendRatio
      });
    }

    // 4. Phân tích giờ vàng chi tiêu
    if (peakHourSpending > avgMonthlySpending * 0.1) {
      const timeRange = peakHour < 12 ? 'sáng' : peakHour < 18 ? 'chiều' : 'tối';
      insights.push({
        type: 'info',
        icon: 'fas fa-clock',
        title: `Giờ vàng chi tiêu: ${peakHour}h`,
        message: `Bạn thường chi tiêu nhiều nhất vào ${peakHour}h (${timeRange}). Hãy chuẩn bị ngân sách cho khung giờ này.`,
        value: peakHour
      });
    }

    // 5. Cảnh báo chi tiêu bất thường
    const lastMonthSpending = monthlyChartData[monthlyChartData.length - 1]?.spending || 0;
    if (lastMonthSpending > avgMonthlySpending * 1.5) {
      insights.push({
        type: 'danger',
        icon: 'fas fa-fire',
        title: 'Chi tiêu bất thường',
        message: `Tháng này chi tiêu ${formatVietnameseCurrency(lastMonthSpending)}, cao hơn 50% so với mức trung bình.`,
        value: lastMonthSpending
      });
    }

    return {
      monthlyChartData,
      categoryChartData,
      weekdayChartData,
      totalSpending,
      avgMonthlySpending,
      trendChange,
      insights,
      totalTransactions: expenseTransactions.length,
      peakHour,
      weekendRatio
    };
  }, [transactions]);

  if (!spendingAnalysis) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <i className="fas fa-chart-line text-blue-500 mr-2"></i>
          Xu hướng chi tiêu thông minh
        </h3>
        <div className="text-center py-12">
          <i className="fas fa-chart-line text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-500 mb-2">Chưa có dữ liệu chi tiêu</p>
          <p className="text-sm text-gray-400">Thêm giao dịch chi tiêu để xem phân tích AI</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  return (
    <div className="space-y-6" data-spending-trends>
      {/* Header với tổng quan */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <i className="fas fa-brain text-purple-500 mr-2"></i>
            Phân tích chi tiêu thông minh
          </h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">Tổng chi tiêu (12 tháng)</div>
            <div className="text-lg font-bold text-red-600">
              {formatVietnameseCurrency(spendingAnalysis.totalSpending)}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600">TB/tháng</div>
            <div className="font-semibold text-blue-800">
              {formatVietnameseCurrency(spendingAnalysis.avgMonthlySpending)}
            </div>
          </div>
          
          <div className={`text-center p-3 rounded-lg ${
            spendingAnalysis.trendChange >= 0 ? 'bg-red-50' : 'bg-green-50'
          }`}>
            <div className={`text-sm ${
              spendingAnalysis.trendChange >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              Xu hướng 3 tháng
            </div>
            <div className={`font-semibold flex items-center justify-center ${
              spendingAnalysis.trendChange >= 0 ? 'text-red-800' : 'text-green-800'
            }`}>
              <i className={`fas ${spendingAnalysis.trendChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
              {Math.abs(spendingAnalysis.trendChange).toFixed(1)}%
            </div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600">Giao dịch</div>
            <div className="font-semibold text-purple-800">
              {spendingAnalysis.totalTransactions}
            </div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600">Giờ vàng</div>
            <div className="font-semibold text-orange-800">
              {spendingAnalysis.peakHour}:00
            </div>
          </div>
        </div>

        {/* Xu hướng theo tháng */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Xu hướng 12 tháng</h4>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={spendingAnalysis.monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" tickFormatter={(value) => formatVietnameseCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => [formatVietnameseCurrency(value), 'Chi tiêu']}
                labelFormatter={(label) => `Tháng: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="spending" 
                stroke="#EF4444" 
                fill="url(#colorSpending)" 
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phân tích theo danh mục và thói quen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top danh mục chi tiêu */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Top danh mục chi tiêu</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={spendingAnalysis.categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" stroke="#666" />
              <YAxis stroke="#666" tickFormatter={(value) => formatVietnameseCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => [formatVietnameseCurrency(value), 'Chi tiêu']}
              />
              <Bar dataKey="amount" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 space-y-2">
            {spendingAnalysis.categoryChartData.slice(0, 3).map((category, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{category.category}</span>
                <div className="text-right">
                  <span className="font-semibold">{formatVietnameseCurrency(category.amount)}</span>
                  <span className="text-gray-500 ml-2">({category.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thói quen chi tiêu theo ngày */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Thói quen theo ngày trong tuần</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={spendingAnalysis.weekdayChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" tickFormatter={(value) => formatVietnameseCurrency(value)} />
              <Tooltip 
                formatter={(value: number) => [formatVietnameseCurrency(value), 'Chi tiêu']}
              />
              <Bar dataKey="amount" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              Chi tiêu cuối tuần: <span className="font-semibold text-purple-600">
                {spendingAnalysis.weekendRatio.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
          <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
          Insights & Khuyến nghị AI
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spendingAnalysis.insights.map((insight, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
              insight.type === 'success' ? 'bg-green-50 border-green-400' :
              insight.type === 'danger' ? 'bg-red-50 border-red-400' :
              'bg-blue-50 border-blue-400'
            }`}>
              <div className="flex items-start">
                <i className={`${insight.icon} ${
                  insight.type === 'warning' ? 'text-yellow-600' :
                  insight.type === 'success' ? 'text-green-600' :
                  insight.type === 'danger' ? 'text-red-600' :
                  'text-blue-600'
                } mr-3 mt-1`}></i>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 mb-1">{insight.title}</div>
                  <div className="text-sm text-gray-600">{insight.message}</div>
                  {insight.trend && (
                    <div className="mt-2">
                      <i className={`fas ${
                        insight.trend === 'up' ? 'fa-trending-up text-red-500' :
                        insight.trend === 'down' ? 'fa-trending-down text-green-500' :
                        'fa-minus text-gray-500'
                      } mr-1`}></i>
                      <span className="text-xs text-gray-500">
                        {insight.trend === 'up' ? 'Tăng' : insight.trend === 'down' ? 'Giảm' : 'Ổn định'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartSpendingTrends;
