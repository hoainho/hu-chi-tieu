import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ConsumptionTrendData {
  month: string;        // e.g., "Tháng 1/2024"
  spending: number;     // Total spending for the month
  income: number;       // Total income for the month
  balance: number;      // Net balance (income - spending)
  transactions: number; // Number of transactions
}

interface AdvancedConsumptionTrendChartProps {
  data: ConsumptionTrendData[];
  isLoading?: boolean;
}

const AdvancedConsumptionTrendChart: React.FC<AdvancedConsumptionTrendChartProps> = ({ 
  data, 
  isLoading = false 
}) => {
  const chartRef = useRef<any>(null);

  // Chart configuration with advanced animations
  const chartData: ChartData<'line'> = {
    labels: data.map(item => item.month),
    datasets: [
      {
        label: 'Chi tiêu',
        data: data.map(item => item.spending),
        borderColor: 'rgb(239, 68, 68)', // Red for spending
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Thu nhập',
        data: data.map(item => item.income),
        borderColor: 'rgb(16, 185, 129)', // Green for income
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Số dư',
        data: data.map(item => item.balance),
        borderColor: 'rgb(59, 130, 246)', // Blue for balance
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        borderDash: [5, 5], // Dashed line for balance
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: true,
        yAxisID: 'y1', // Secondary axis
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'Xu Hướng Tiêu Dùng Trong 12 Tháng',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              // Format as Vietnamese currency
              label += new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(context.parsed.y);
            }
            return label;
          },
          title: function(tooltipItems) {
            if (tooltipItems.length > 0) {
              return `Tháng ${tooltipItems[0].label}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          callback: function(value) {
            // Format large numbers
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + ' triệu';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + ' nghìn';
            }
            return value;
          },
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        ticks: {
          callback: function(value) {
            // Format large numbers
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + ' triệu';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + ' nghìn';
            }
            return value;
          },
          font: {
            size: 11,
          },
        },
        grid: {
          drawOnChartArea: false, // Only want the grid lines for one axis to be drawn
        },
      },
    },
    animations: {
      // Advanced animations configuration
      tension: {
        duration: 1000,
        easing: 'easeInOutCubic',
      },
      colors: {
        type: 'color',
        duration: 1000,
        from: 'transparent',
      },
      numbers: {
        type: 'number',
        duration: 1000,
        easing: 'easeInOutCubic',
      },
      x: {
        duration: 1000,
        easing: 'easeInOutCubic',
      },
      y: {
        duration: 1000,
        easing: 'easeInOutCubic',
      },
    },
    // Hover animations
    hover: {
      mode: 'index',
      intersect: false,
      animationDuration: 400,
    },
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu xu hướng...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <i className="fas fa-chart-line text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có dữ liệu</h3>
          <p className="text-gray-500">Hãy thêm giao dịch để xem xu hướng tiêu dùng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
      <Line 
        ref={chartRef}
        data={chartData} 
        options={options} 
      />
      
      {/* Custom legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <div className="flex items-center">
          <div className="w-4 h-1 bg-red-500 rounded mr-2"></div>
          <span className="text-sm text-gray-700">Chi tiêu</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-1 bg-green-500 rounded mr-2"></div>
          <span className="text-sm text-gray-700">Thu nhập</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-1 bg-blue-500 rounded mr-2 border-dashed border-t-2 border-blue-500"></div>
          <span className="text-sm text-gray-700">Số dư</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedConsumptionTrendChart;