import React, { memo, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title
);

interface CategorySpendingChartProps {
  data: Array<{ name: string; value: number }>;
}

const CategorySpendingChart: React.FC<CategorySpendingChartProps> = ({ data }) => {
  const { chartData, options } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    const chartData = {
      labels: data.map(item => {
        const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : 0;
        return `${item.name} (${percentage}%)`;
      }),
      datasets: [
        {
          label: 'Tỷ lệ chi tiêu',
          data: data.map(item => item.value),
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

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        title: {
          display: true,
          text: 'Phân tích danh mục chi tiêu',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
              return `${label}: ${value.toLocaleString('vi-VN')} (${percentage}%)`;
            }
          }
        }
      },
    };
    
    return { chartData, options };
  }, [data]);

  // Add a unique key to force remount when data changes significantly
  const chartKey = data.length + data.reduce((sum, item) => sum + item.value, 0);

  return <Pie key={chartKey} data={chartData} options={options} />;
};

export default memo(CategorySpendingChart);