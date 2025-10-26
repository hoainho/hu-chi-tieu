import React, { useMemo } from 'react';
import { useConsumptionTrend } from '../../hooks/useConsumptionTrend';
import AdvancedConsumptionTrendChart from '../charts/AdvancedConsumptionTrendChart';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';

const ConsumptionTrendDashboard: React.FC = () => {
  const { trendData, loading, error, refresh } = useConsumptionTrend();

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!trendData.length) return null;

    const totalSpending = trendData.reduce((sum, month) => sum + month.spending, 0);
    const totalIncome = trendData.reduce((sum, month) => sum + month.income, 0);
    const avgMonthlySpending = totalSpending / trendData.length;
    const avgMonthlyIncome = totalIncome / trendData.length;
    
    // Find highest spending month
    const highestSpendingMonth = [...trendData].sort((a, b) => b.spending - a.spending)[0];
    
    // Find highest income month
    const highestIncomeMonth = [...trendData].sort((a, b) => b.income - a.income)[0];
    
    // Calculate trend (compare first 6 months vs last 6 months)
    const firstHalfSpending = trendData.slice(0, 6).reduce((sum, month) => sum + month.spending, 0) / 6;
    const secondHalfSpending = trendData.slice(6).reduce((sum, month) => sum + month.spending, 0) / 6;
    const spendingTrend = firstHalfSpending > 0 ? ((secondHalfSpending - firstHalfSpending) / firstHalfSpending) * 100 : 0;

    return {
      totalSpending,
      totalIncome,
      avgMonthlySpending,
      avgMonthlyIncome,
      highestSpendingMonth,
      highestIncomeMonth,
      spendingTrend
    };
  }, [trendData]);

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-red-700 mb-2">Lỗi tải dữ liệu</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <i className="fas fa-chart-line text-blue-500 mr-3"></i>
            Xu Hướng Tiêu Dùng Trong 12 Tháng
          </h2>
          <p className="text-gray-600 mt-1">Phân tích chi tiết về thu chi và xu hướng tài chính</p>
        </div>
        
        <button 
          onClick={refresh}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt mr-2 ${loading ? 'animate-spin' : ''}`}></i>
          Làm mới
        </button>
      </div>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Tổng chi tiêu</p>
                <p className="text-2xl font-bold mt-1">{formatVietnameseCurrency(summaryStats.totalSpending)}</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 p-3 rounded-lg">
                <i className="fas fa-money-bill-wave text-xl"></i>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Tổng thu nhập</p>
                <p className="text-2xl font-bold mt-1">{formatVietnameseCurrency(summaryStats.totalIncome)}</p>
              </div>
              <div className="bg-green-400 bg-opacity-30 p-3 rounded-lg">
                <i className="fas fa-arrow-down text-xl"></i>
              </div>
            </div>
          </div>
          
          <div className={`bg-gradient-to-br ${summaryStats.spendingTrend >= 0 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600'} rounded-xl p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Xu hướng chi tiêu</p>
                <p className="text-2xl font-bold mt-1">
                  {summaryStats.spendingTrend >= 0 ? '+' : ''}{summaryStats.spendingTrend.toFixed(1)}%
                </p>
              </div>
              <div className={`bg-opacity-30 p-3 rounded-lg ${summaryStats.spendingTrend >= 0 ? 'bg-red-400' : 'bg-emerald-400'}`}>
                <i className={`fas ${summaryStats.spendingTrend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-xl`}></i>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">TB/tháng</p>
                <p className="text-2xl font-bold mt-1">{formatVietnameseCurrency(summaryStats.avgMonthlySpending)}</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 p-3 rounded-lg">
                <i className="fas fa-calculator text-xl"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Chart */}
      <div className="h-96">
        <AdvancedConsumptionTrendChart 
          data={trendData} 
          isLoading={loading} 
        />
      </div>

      {/* Insights Section */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-fire text-red-500 mr-2"></i>
              Tháng chi tiêu cao nhất
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{summaryStats.highestSpendingMonth.month}</p>
                <p className="text-gray-600 mt-1">Chi tiêu</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">
                  {formatVietnameseCurrency(summaryStats.highestSpendingMonth.spending)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {((summaryStats.highestSpendingMonth.spending / summaryStats.avgMonthlySpending - 1) * 100).toFixed(1)}% 
                  {summaryStats.highestSpendingMonth.spending > summaryStats.avgMonthlySpending ? ' cao hơn' : ' thấp hơn'} TB
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-trophy text-yellow-500 mr-2"></i>
              Tháng thu nhập cao nhất
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{summaryStats.highestIncomeMonth.month}</p>
                <p className="text-gray-600 mt-1">Thu nhập</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {formatVietnameseCurrency(summaryStats.highestIncomeMonth.income)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {((summaryStats.highestIncomeMonth.income / summaryStats.avgMonthlyIncome - 1) * 100).toFixed(1)}% 
                  {summaryStats.highestIncomeMonth.income > summaryStats.avgMonthlyIncome ? ' cao hơn' : ' thấp hơn'} TB
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
          Gợi ý & Khuyến nghị
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-medium text-blue-800 mb-2">Quản lý chi tiêu</h4>
            <p className="text-sm text-blue-600">
              Theo dõi các tháng có chi tiêu cao để điều chỉnh ngân sách hợp lý.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
            <h4 className="font-medium text-green-800 mb-2">Tăng thu nhập</h4>
            <p className="text-sm text-green-600">
              Học hỏi từ các tháng có thu nhập cao để áp dụng chiến lược tăng thu nhập hiệu quả.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
            <h4 className="font-medium text-purple-800 mb-2">Cân bằng tài chính</h4>
            <p className="text-sm text-purple-600">
              Cố gắng duy trì tỷ lệ tiết kiệm tối thiểu 20% thu nhập hàng tháng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsumptionTrendDashboard;