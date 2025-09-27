import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, TrendingUp, Target, Bell, X, Settings } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { EXPENSE_CATEGORIES } from '../../constants/categories';

interface BudgetAlert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  category: string;
  categoryName: string;
  message: string;
  currentSpent: number;
  budgetLimit: number;
  percentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
}

interface BudgetData {
  [category: string]: {
    allocated: number;
    spent: number;
    remaining: number;
  };
}

interface BudgetAlertSystemProps {
  budgetData: BudgetData;
  transactions: Array<{
    id: string;
    amount: number;
    category: string;
    date: Date;
    description: string;
  }>;
  onAdjustBudget?: (category: string, newAmount: number) => void;
  onViewDetails?: (category: string) => void;
  className?: string;
}

const BudgetAlertSystem: React.FC<BudgetAlertSystemProps> = ({
  budgetData,
  transactions,
  onAdjustBudget,
  onViewDetails,
  className = ''
}) => {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({
    warning: 75, // 75%
    danger: 90,  // 90%
    critical: 100 // 100%
  });
  const [enabledAlerts, setEnabledAlerts] = useState({
    budgetExceeded: true,
    approachingLimit: true,
    unusualSpending: true,
    monthlyTrend: true
  });

  // Tính toán alerts dựa trên budget data
  const calculateAlerts = useMemo(() => {
    const newAlerts: BudgetAlert[] = [];
    const now = new Date();

    Object.entries(budgetData).forEach(([category, data]) => {
      const percentage = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0;
      const categoryInfo = EXPENSE_CATEGORIES.find(cat => cat.id === category);
      const categoryName = categoryInfo?.name || category;

      // Alert khi vượt ngân sách (100%+)
      if (percentage >= 100 && enabledAlerts.budgetExceeded) {
        newAlerts.push({
          id: `exceeded_${category}_${Date.now()}`,
          type: 'danger',
          category,
          categoryName,
          message: `Đã vượt ngân sách ${categoryName} ${(percentage - 100).toFixed(1)}%`,
          currentSpent: data.spent,
          budgetLimit: data.allocated,
          percentage,
          severity: 'critical',
          timestamp: now,
          isRead: false,
          actionRequired: true
        });
      }
      // Alert khi gần vượt ngân sách (90%+)
      else if (percentage >= alertThresholds.danger && enabledAlerts.approachingLimit) {
        newAlerts.push({
          id: `approaching_${category}_${Date.now()}`,
          type: 'warning',
          category,
          categoryName,
          message: `Sắp vượt ngân sách ${categoryName} (${percentage.toFixed(1)}%)`,
          currentSpent: data.spent,
          budgetLimit: data.allocated,
          percentage,
          severity: 'high',
          timestamp: now,
          isRead: false,
          actionRequired: true
        });
      }
      // Alert cảnh báo sớm (75%+)
      else if (percentage >= alertThresholds.warning && enabledAlerts.approachingLimit) {
        newAlerts.push({
          id: `warning_${category}_${Date.now()}`,
          type: 'warning',
          category,
          categoryName,
          message: `Đã chi ${percentage.toFixed(1)}% ngân sách ${categoryName}`,
          currentSpent: data.spent,
          budgetLimit: data.allocated,
          percentage,
          severity: 'medium',
          timestamp: now,
          isRead: false,
          actionRequired: false
        });
      }
    });

    // Phát hiện chi tiêu bất thường
    if (enabledAlerts.unusualSpending) {
      const unusualAlerts = detectUnusualSpending();
      newAlerts.push(...unusualAlerts);
    }

    // Trend analysis
    if (enabledAlerts.monthlyTrend) {
      const trendAlerts = analyzeMonthlyTrend();
      newAlerts.push(...trendAlerts);
    }

    return newAlerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [budgetData, transactions, alertThresholds, enabledAlerts]);

  // Phát hiện chi tiêu bất thường
  const detectUnusualSpending = (): BudgetAlert[] => {
    const alerts: BudgetAlert[] = [];
    const now = new Date();
    const today = now.toDateString();
    
    // Nhóm giao dịch theo ngày
    const dailySpending = transactions.reduce((acc, txn) => {
      const date = txn.date.toDateString();
      if (!acc[date]) acc[date] = 0;
      acc[date] += Math.abs(txn.amount);
      return acc;
    }, {} as Record<string, number>);

    // Tính chi tiêu trung bình 7 ngày qua
    const last7Days = Object.entries(dailySpending)
      .slice(-7)
      .map(([_, amount]) => amount);
    
    const avgDaily = last7Days.reduce((sum, amount) => sum + amount, 0) / last7Days.length;
    const todaySpending = dailySpending[today] || 0;

    // Alert nếu chi tiêu hôm nay cao hơn 150% so với trung bình
    if (todaySpending > avgDaily * 1.5 && avgDaily > 0) {
      alerts.push({
        id: `unusual_${Date.now()}`,
        type: 'info',
        category: 'general',
        categoryName: 'Tổng chi tiêu',
        message: `Chi tiêu hôm nay cao hơn ${((todaySpending / avgDaily - 1) * 100).toFixed(0)}% so với trung bình`,
        currentSpent: todaySpending,
        budgetLimit: avgDaily,
        percentage: (todaySpending / avgDaily) * 100,
        severity: 'medium',
        timestamp: now,
        isRead: false,
        actionRequired: false
      });
    }

    return alerts;
  };

  // Phân tích xu hướng tháng
  const analyzeMonthlyTrend = (): BudgetAlert[] => {
    const alerts: BudgetAlert[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Tính tổng chi tiêu tháng này
    const currentMonthSpending = transactions
      .filter(txn => {
        const txnDate = txn.date;
        return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

    // Tính tổng ngân sách tháng
    const totalBudget = Object.values(budgetData)
      .reduce((sum, data) => sum + data.allocated, 0);

    // Dự báo chi tiêu cuối tháng
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const projectedSpending = (currentMonthSpending / dayOfMonth) * daysInMonth;

    if (projectedSpending > totalBudget * 1.1) {
      alerts.push({
        id: `trend_${Date.now()}`,
        type: 'warning',
        category: 'general',
        categoryName: 'Dự báo tháng',
        message: `Dự kiến vượt ngân sách tháng ${((projectedSpending / totalBudget - 1) * 100).toFixed(0)}%`,
        currentSpent: currentMonthSpending,
        budgetLimit: totalBudget,
        percentage: (projectedSpending / totalBudget) * 100,
        severity: 'high',
        timestamp: now,
        isRead: false,
        actionRequired: true
      });
    }

    return alerts;
  };

  // Cập nhật alerts khi dữ liệu thay đổi
  useEffect(() => {
    setAlerts(calculateAlerts);
  }, [calculateAlerts]);

  // Đánh dấu alert đã đọc
  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  // Xóa alert
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Lấy icon cho alert type
  const getAlertIcon = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'danger': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'success': return <Target className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Lấy màu cho alert
  const getAlertColor = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'danger': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  // Lấy màu text cho alert
  const getAlertTextColor = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'danger': return 'text-red-800';
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      case 'success': return 'text-green-800';
      default: return 'text-gray-800';
    }
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const highAlerts = alerts.filter(alert => alert.severity === 'high');
  const otherAlerts = alerts.filter(alert => !['critical', 'high'].includes(alert.severity));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header với settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Cảnh báo ngân sách
          </h3>
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {alerts.filter(a => !a.isRead).length}
            </span>
          )}
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-gray-800">Cài đặt cảnh báo</h4>
          
          {/* Thresholds */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Cảnh báo (%)</label>
              <input
                type="number"
                value={alertThresholds.warning}
                onChange={(e) => setAlertThresholds(prev => ({
                  ...prev,
                  warning: parseInt(e.target.value)
                }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nguy hiểm (%)</label>
              <input
                type="number"
                value={alertThresholds.danger}
                onChange={(e) => setAlertThresholds(prev => ({
                  ...prev,
                  danger: parseInt(e.target.value)
                }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tới hạn (%)</label>
              <input
                type="number"
                value={alertThresholds.critical}
                onChange={(e) => setAlertThresholds(prev => ({
                  ...prev,
                  critical: parseInt(e.target.value)
                }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                min="0"
                max="200"
              />
            </div>
          </div>

          {/* Enable/Disable Alerts */}
          <div className="space-y-2">
            {Object.entries(enabledAlerts).map(([key, enabled]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabledAlerts(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  {key === 'budgetExceeded' && 'Vượt ngân sách'}
                  {key === 'approachingLimit' && 'Gần vượt ngân sách'}
                  {key === 'unusualSpending' && 'Chi tiêu bất thường'}
                  {key === 'monthlyTrend' && 'Xu hướng tháng'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600 flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Khẩn cấp</span>
          </h4>
          {criticalAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkAsRead={markAsRead}
              onDismiss={dismissAlert}
              onAdjustBudget={onAdjustBudget}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}

      {/* High Priority Alerts */}
      {highAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-yellow-600 flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Ưu tiên cao</span>
          </h4>
          {highAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkAsRead={markAsRead}
              onDismiss={dismissAlert}
              onAdjustBudget={onAdjustBudget}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}

      {/* Other Alerts */}
      {otherAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Thông tin khác</h4>
          {otherAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkAsRead={markAsRead}
              onDismiss={dismissAlert}
              onAdjustBudget={onAdjustBudget}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}

      {/* No Alerts */}
      {alerts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p className="font-medium text-green-600">Tất cả ngân sách đều ổn định!</p>
          <p className="text-sm">Không có cảnh báo nào cần chú ý.</p>
        </div>
      )}
    </div>
  );
};

// Component Alert Card
interface AlertCardProps {
  alert: BudgetAlert;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAdjustBudget?: (category: string, newAmount: number) => void;
  onViewDetails?: (category: string) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onMarkAsRead,
  onDismiss,
  onAdjustBudget,
  onViewDetails
}) => {
  const [showActions, setShowActions] = useState(false);

  const getAlertIcon = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'danger': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'success': return <Target className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'danger': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getAlertTextColor = (type: BudgetAlert['type']) => {
    switch (type) {
      case 'danger': return 'text-red-800';
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      case 'success': return 'text-green-800';
      default: return 'text-gray-800';
    }
  };

  return (
    <div className={`border rounded-xl p-4 ${getAlertColor(alert.type)} ${!alert.isRead ? 'ring-2 ring-blue-200' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getAlertIcon(alert.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`font-medium ${getAlertTextColor(alert.type)}`}>
              {alert.message}
            </p>
            <button
              onClick={() => onDismiss(alert.id)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Đã chi: {formatCurrency(alert.currentSpent)}</span>
              <span>Ngân sách: {formatCurrency(alert.budgetLimit)}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  alert.percentage >= 100 ? 'bg-red-500' :
                  alert.percentage >= 90 ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(alert.percentage, 100)}%` }}
              />
            </div>
            
            <div className="text-xs text-gray-500">
              {alert.percentage.toFixed(1)}% • {alert.timestamp.toLocaleTimeString('vi-VN')}
            </div>
          </div>

          {/* Action Buttons */}
          {alert.actionRequired && (
            <div className="mt-3 flex space-x-2">
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(alert.category)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Xem chi tiết
                </button>
              )}
              {onAdjustBudget && (
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Điều chỉnh
                </button>
              )}
              {!alert.isRead && (
                <button
                  onClick={() => onMarkAsRead(alert.id)}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  Đã hiểu
                </button>
              )}
            </div>
          )}

          {/* Quick Adjust */}
          {showActions && onAdjustBudget && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Điều chỉnh ngân sách {alert.categoryName}:</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => onAdjustBudget(alert.category, alert.budgetLimit * 1.2)}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  +20%
                </button>
                <button
                  onClick={() => onAdjustBudget(alert.category, alert.currentSpent * 1.1)}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Theo chi tiêu
                </button>
                <button
                  onClick={() => setShowActions(false)}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetAlertSystem;
