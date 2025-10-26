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

interface MonthlyComparisonBarChartProps {
  data: Array<{
    name: string;
    "Thu nhập": number;
    "Chi tiêu": number;
    "Số dư": number;
  }>;
}

const MonthlyComparisonBarChart: React.FC<MonthlyComparisonBarChartProps> = ({ data }) => {
  const { chartData, options } = useMemo(() => {
    const chartData = {
      labels: data.map(item => item.name),
      datasets: [
        {
          label: 'Thu nhập',
          data: data.map(item => item["Thu nhập"]),
          backgroundColor: 'rgba(16, 185, 129, 0.6)', // green
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
        {
          label: 'Chi tiêu',
          data: data.map(item => item["Chi tiêu"]),
          backgroundColor: 'rgba(239, 68, 68, 0.6)', // red
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        },
        {
          label: 'Số dư',
          data: data.map(item => item["Số dư"]),
          backgroundColor: 'rgba(99, 102, 241, 0.6)', // indigo
          borderColor: 'rgba(99, 102, 241, 1)',
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
          text: 'So sánh thu nhập - chi tiêu - số dư',
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
    
    return { chartData, options };
  }, [data]);

  // Add a unique key to force remount when data changes significantly
  const chartKey = data.length + 
    data.reduce((sum, item) => sum + item["Thu nhập"] + item["Chi tiêu"] + item["Số dư"], 0);

  return <Bar key={chartKey} data={chartData} options={options} />;
};

export default memo(MonthlyComparisonBarChart);