import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { PortfolioSummary } from '../hooks/useAssetSummary';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

interface EnhancedDashboardChartsProps {
  portfolioSummary: PortfolioSummary;
  loading: boolean;
}

const EnhancedDashboardCharts: React.FC<EnhancedDashboardChartsProps> = ({ 
  portfolioSummary, 
  loading 
}) => {
  if (loading || !portfolioSummary) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const { allocationData, allocationOptions, performanceData, performanceOptions, growthData, growthOptions } = useMemo(() => {
    // Prepare data for asset allocation pie chart
    const allocationData = {
      labels: Object.keys(portfolioSummary.assetTypeBreakdown),
      datasets: [
        {
          label: 'Asset Allocation',
          data: Object.values(portfolioSummary.assetTypeBreakdown).map(type => type.currentValue),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',    // blue
            'rgba(16, 185, 129, 0.8)',    // green
            'rgba(245, 158, 11, 0.8)',    // amber
            'rgba(239, 68, 68, 0.8)',     // red
            'rgba(139, 92, 246, 0.8)',    // purple
            'rgba(6, 182, 212, 0.8)',     // cyan
            'rgba(132, 204, 22, 0.8)',    // lime
            'rgba(249, 115, 22, 0.8)',    // orange
          ],
          borderWidth: 1,
        },
      ],
    };

    const allocationOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Phân bổ tài sản',
        },
      },
    };

    // Prepare data for performance bar chart
    const performanceData = {
      labels: Object.keys(portfolioSummary.assetTypeBreakdown),
      datasets: [
        {
          label: 'Giá trị gốc',
          data: Object.values(portfolioSummary.assetTypeBreakdown).map(type => type.originalValue),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
        },
        {
          label: 'Giá trị hiện tại',
          data: Object.values(portfolioSummary.assetTypeBreakdown).map(type => type.currentValue),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
        },
        {
          label: 'Lãi/Lỗ',
          data: Object.values(portfolioSummary.assetTypeBreakdown).map(type => type.gainLoss),
          backgroundColor: (context: any) => {
            const value = context.dataset.data[context.dataIndex];
            return value >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
          },
        },
      ],
    };

    const performanceOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Hiệu suất danh mục theo loại tài sản',
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
        },
      },
    };

    // Prepare data for growth trend line chart (simplified mock data)
    // In a real scenario, this would come from historical data
    const timeLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const growthData = {
      labels: timeLabels,
      datasets: [
        {
          label: 'Giá trị danh mục',
          data: Array.from({ length: 12 }, (_, i) => 
            portfolioSummary.totalOriginalValue + 
            (portfolioSummary.totalGainLoss * (i + 1) / 12)
          ),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
        },
        {
          label: 'Mục tiêu',
          data: Array.from({ length: 12 }, (_, i) => 
            portfolioSummary.totalOriginalValue * Math.pow(1.08, i / 12) // 8% annual growth
          ),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderDash: [5, 5],
          tension: 0.4,
        },
      ],
    };

    const growthOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Xu hướng tăng trưởng danh mục',
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    };
    
    return { allocationData, allocationOptions, performanceData, performanceOptions, growthData, growthOptions };
  }, [portfolioSummary]);

  // Create unique keys for each chart to prevent canvas reuse
  const allocationKey = Object.values(portfolioSummary.assetTypeBreakdown).reduce((sum, type) => sum + type.currentValue, 0);
  const performanceKey = Object.values(portfolioSummary.assetTypeBreakdown).reduce((sum, type) => sum + type.originalValue + type.currentValue + type.gainLoss, 0);
  const growthKey = portfolioSummary.totalOriginalValue + portfolioSummary.totalGainLoss;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      {/* Asset Allocation Pie Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Phân bổ tài sản</h3>
        <Pie key={`allocation-${allocationKey}`} data={allocationData} options={allocationOptions} />
      </div>

      {/* Performance by Asset Type Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Hiệu suất theo loại tài sản</h3>
        <Bar key={`performance-${performanceKey}`} data={performanceData} options={performanceOptions} />
      </div>

      {/* Growth Trend Line Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Xu hướng tăng trưởng</h3>
        <Line key={`growth-${growthKey}`} data={growthData} options={growthOptions} />
      </div>
    </div>
  );
};

export default EnhancedDashboardCharts;