import React, { useMemo } from 'react';
import { useAppSelector } from '../../store';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import ModernCard from '../ui/ModernCard';
import CategorySpendingChart from '../charts/CategorySpendingChart';

// Category colors and icons mapping
const CATEGORY_CONFIG = {
  food: { color: '#EF4444', icon: 'fas fa-utensils', name: 'Ăn uống', tips: ['Nấu ăn tại nhà nhiều hơn', 'Hạn chế đặt đồ ăn online', 'Mua sắm thực phẩm theo kế hoạch'] },
  transport: { color: '#F59E0B', icon: 'fas fa-car', name: 'Di chuyển', tips: ['Sử dụng phương tiện công cộng', 'Đi chung xe với đồng nghiệp', 'Xem xét mua xe máy tiết kiệm nhiên liệu'] },
  shopping: { color: '#8B5CF6', icon: 'fas fa-shopping-bag', name: 'Mua sắm', tips: ['Lập danh sách mua sắm trước', 'So sánh giá trước khi mua', 'Tránh mua sắm khi cảm xúc'] },
  entertainment: { color: '#06B6D4', icon: 'fas fa-gamepad', name: 'Giải trí', tips: ['Tìm hoạt động giải trí miễn phí', 'Chia sẻ chi phí với bạn bè', 'Hạn chế đi xem phim, karaoke'] },
  utilities: { color: '#10B981', icon: 'fas fa-bolt', name: 'Tiện ích', tips: ['Tiết kiệm điện nước', 'Sử dụng thiết bị tiết kiệm năng lượng', 'Theo dõi hóa đơn hàng tháng'] },
  healthcare: { color: '#F472B6', icon: 'fas fa-heartbeat', name: 'Y tế', tips: ['Mua bảo hiểm y tế', 'Khám sức khỏe định kỳ', 'Tìm hiểu về các chương trình khám chữa bệnh'] },
  education: { color: '#6366F1', icon: 'fas fa-graduation-cap', name: 'Giáo dục', tips: ['Tìm khóa học online miễn phí', 'Mượn sách thay vì mua', 'Tham gia nhóm học tập'] },
  other: { color: '#6B7280', icon: 'fas fa-ellipsis-h', name: 'Khác', tips: ['Phân loại chi tiêu rõ ràng hơn', 'Theo dõi chi tiêu nhỏ lẻ', 'Đặt ngân sách cho mục này'] }
};

const CategorySpendingAnalysis: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);

  const categoryAnalysis = useMemo(() => {
    if (!transactions.length) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get current month spending by category
    const currentMonthTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && 
             txnDate.getMonth() === currentMonth && 
             txnDate.getFullYear() === currentYear &&
             (txn.amount < 0 || 
              (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
    });

    // Group by category
    const categorySpending: Record<string, { amount: number; count: number; transactions: any[] }> = {};
    
    currentMonthTransactions.forEach(txn => {
      const category = txn.category || 'other';
      if (!categorySpending[category]) {
        categorySpending[category] = { amount: 0, count: 0, transactions: [] };
      }
      categorySpending[category].amount += Math.abs(txn.amount);
      categorySpending[category].count += 1;
      categorySpending[category].transactions.push(txn);
    });

    // Convert to array and sort by amount
    const categoryArray = Object.entries(categorySpending)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        transactions: data.transactions,
        percentage: 0, // Will calculate after getting total
        config: CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other,
        change: 0, // Will calculate later
        changePercent: 0 // Will calculate later
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate total and percentages
    const totalSpending = categoryArray.reduce((sum, cat) => sum + cat.amount, 0);
    categoryArray.forEach(cat => {
      cat.percentage = totalSpending > 0 ? (cat.amount / totalSpending) * 100 : 0;
    });
    // Get top 5 categories for chart
    const topCategories = categoryArray.slice(0, 5);
    const othersAmount = categoryArray.slice(5).reduce((sum, cat) => sum + cat.amount, 0);
    
    let chartData = [...topCategories];
    if (othersAmount > 0) {
      chartData.push({
        category: 'others_combined',
        amount: othersAmount,
        count: categoryArray.slice(5).reduce((sum, cat) => sum + cat.count, 0),
        transactions: [],
        percentage: (othersAmount / totalSpending) * 100,
        config: { color: '#9CA3AF', icon: 'fas fa-ellipsis-h', name: 'Khác', tips: [] },
        change: 0,
        changePercent: 0
      });
    }

    // Get last month data for comparison
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const lastMonthTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && 
             txnDate.getMonth() === lastMonth && 
             txnDate.getFullYear() === lastMonthYear &&
             (txn.amount < 0 || 
              (txn.amount > 0 && txn.category !== 'income' && txn.category !== 'transfer'));
    });

    const lastMonthCategorySpending: Record<string, number> = {};
    lastMonthTransactions.forEach(txn => {
      const category = txn.category || 'other';
      lastMonthCategorySpending[category] = (lastMonthCategorySpending[category] || 0) + Math.abs(txn.amount);
    });

    // Add comparison data
    categoryArray.forEach(cat => {
      const lastMonthAmount = lastMonthCategorySpending[cat.category] || 0;
      cat.change = cat.amount - lastMonthAmount;
      cat.changePercent = lastMonthAmount > 0 ? (cat.change / lastMonthAmount) * 100 : 0;
    });

    // Find biggest spender and most frequent category
    const biggestSpender = categoryArray[0];
    const mostFrequent = categoryArray.reduce((max, cat) => cat.count > max.count ? cat : max, categoryArray[0]);

    return {
      categories: categoryArray,
      chartData,
      totalSpending,
      biggestSpender,
      mostFrequent,
      transactionCount: currentMonthTransactions.length
    };
  }, [transactions]);

  console.log("[x]: ", categoryAnalysis);
  

  if (!categoryAnalysis || !categoryAnalysis.biggestSpender || !categoryAnalysis.mostFrequent || categoryAnalysis.transactionCount === 0) {
    return (
      <ModernCard>
        <div className="text-center py-8">
          <i className="fas fa-chart-pie text-gray-400 text-4xl mb-4"></i>
          <p className="text-gray-500">Chưa có dữ liệu chi tiêu trong tháng này</p>
        </div>
      </ModernCard>
    );
  }

  return (
    <ModernCard gradient glow>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <i className="fas fa-chart-pie text-indigo-600 mr-3"></i>
          Phân tích danh mục chi tiêu
        </h3>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <CategorySpendingChart 
            data={categoryAnalysis.chartData.map(item => ({
              name: item.category === "others_combined" ? "Khác" : item.category,
              value: item.amount
            }))}
          />
        </div>

        {/* Category List */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 mb-3">Chi tiết danh mục</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {categoryAnalysis.categories.slice(0, 8).map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.config?.color || '#8884d8' }}
                  ></div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <i className={`${category.config?.icon || 'fas fa-chart-pie'} text-sm text-gray-600`}></i>
                      <span className="font-medium text-sm">{category.category}</span>
                    </div>
                    <div className="text-xs text-gray-500">{category.count} giao dịch</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatVietnameseCurrency(category.amount)}</div>
                  <div className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Biggest Spender */}
        <div className="bg-red-50/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-red-800">Chi tiêu nhiều nhất</h4>
            <i className={`${categoryAnalysis.biggestSpender?.config?.icon || 'fas fa-chart-pie'} text-red-600`}></i>
          </div>
          <div className="space-y-1">
            <div className="font-medium text-red-900">{categoryAnalysis.biggestSpender?.config?.name || categoryAnalysis.biggestSpender?.category || 'N/A'}</div>
            <div className="text-lg font-bold text-red-700">
              {formatVietnameseCurrency(categoryAnalysis.biggestSpender?.amount || 0)}
            </div>
            <div className="text-xs text-red-600">
              {(categoryAnalysis.biggestSpender?.percentage || 0).toFixed(1)}% tổng chi tiêu
            </div>
            {categoryAnalysis.biggestSpender?.change !== undefined && (
              <div className={`text-xs ${
                categoryAnalysis.biggestSpender.change > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {categoryAnalysis.biggestSpender.change > 0 ? '↗️' : '↘️'} 
                {Math.abs(categoryAnalysis.biggestSpender.changePercent || 0).toFixed(1)}% vs tháng trước
              </div>
            )}
          </div>
        </div>

        {/* Most Frequent */}
        <div className="bg-blue-50/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-blue-800">Giao dịch nhiều nhất</h4>
            <i className={`${categoryAnalysis.mostFrequent?.config?.icon || 'fas fa-chart-pie'} text-blue-600`}></i>
          </div>
          <div className="space-y-1">
            <div className="font-medium text-blue-900">{categoryAnalysis.mostFrequent?.config?.name || categoryAnalysis.mostFrequent?.category || 'N/A'}</div>
            <div className="text-lg font-bold text-blue-700">
              {categoryAnalysis.mostFrequent?.count || 0} giao dịch
            </div>
            <div className="text-xs text-blue-600">
              TB: {formatVietnameseCurrency((categoryAnalysis.mostFrequent?.amount || 0) / (categoryAnalysis.mostFrequent?.count || 1))}/GD
            </div>
          </div>
        </div>
      </div>

      {/* Spending Tips */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
          Gợi ý tiết kiệm cho danh mục chi nhiều nhất
        </h4>
        <div className="bg-yellow-50/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <i className={`${categoryAnalysis.biggestSpender?.config?.icon || 'fas fa-chart-pie'} text-yellow-600 mt-1`}></i>
            <div>
              <div className="font-medium text-yellow-900 mb-2">
                {categoryAnalysis.biggestSpender?.config?.name || categoryAnalysis.biggestSpender?.category || 'N/A'} - {formatVietnameseCurrency(categoryAnalysis.biggestSpender?.amount || 0)}
              </div>
              <ul className="space-y-1">
                {(categoryAnalysis.biggestSpender?.config?.tips || []).map((tip, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-gray-50/80 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Tổng danh mục</div>
          <div className="font-semibold text-gray-800 text-sm">
            {categoryAnalysis.categories.length}
          </div>
        </div>
        
        <div className="text-center p-3 bg-indigo-50/80 rounded-lg">
          <div className="text-xs text-indigo-600 mb-1">Tổng giao dịch</div>
          <div className="font-semibold text-indigo-800 text-sm">
            {categoryAnalysis.transactionCount}
          </div>
        </div>

        <div className="text-center p-3 bg-purple-50/80 rounded-lg">
          <div className="text-xs text-purple-600 mb-1">TB/giao dịch</div>
          <div className="font-semibold text-purple-800 text-sm">
            {formatVietnameseCurrency(categoryAnalysis.totalSpending / categoryAnalysis.transactionCount)}
          </div>
        </div>
      </div>
    </ModernCard>
  );
};

export default CategorySpendingAnalysis;
