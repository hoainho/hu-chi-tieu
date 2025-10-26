import React, { memo, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyComparisonChartProps {
  currentMonthData: any[];
  lastMonthData: any[];
  currentMonthName?: string;
  lastMonthName?: string;
}

const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({ 
  currentMonthData, 
  lastMonthData, 
  currentMonthName = 'Tháng này',
  lastMonthName = 'Tháng trước' 
}) => {
  const { data, options } = useMemo(() => {
    const data = {
      labels: currentMonthData.map((_, index) => `Tuần ${index + 1}`),
      datasets: [
        {
          label: lastMonthName,
          data: lastMonthData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)', // blue
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: currentMonthName,
          data: currentMonthData,
          backgroundColor: 'rgba(16, 185, 129, 0.6)', // green
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `So sánh ${lastMonthName} vs ${currentMonthName}`,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value;
            }
          }
        },
      },
    };
    
    return { data, options };
  }, [currentMonthData, lastMonthData, currentMonthName, lastMonthName]);

  // Add a unique key to force remount when data changes significantly
  const chartKey = currentMonthData.length + 
    currentMonthData.reduce((sum, val) => sum + (val || 0), 0) + 
    lastMonthData.reduce((sum, val) => sum + (val || 0), 0);

  return <Bar key={chartKey} data={data} options={options} />;
};

export default memo(MonthlyComparisonChart);