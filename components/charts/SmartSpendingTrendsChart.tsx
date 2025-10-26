import React, { memo, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ChartData, ChartOptions } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type ChartType = 'line' | 'bar' | 'mixed';

interface SmartSpendingTrendsChartProps {
  data: Array<{ date: string; value: number; trend?: number }>;
  chartType?: ChartType;
  title?: string;
}

const SmartSpendingTrendsChart: React.FC<SmartSpendingTrendsChartProps> = ({ 
  data, 
  chartType = 'line',
  title = 'Phân tích chi tiêu thông minh'
}) => {
  // Memoized computation of chart data and options to prevent unnecessary re-renders
  const { chartData, options, ChartComponent, chartKey } = useMemo(() => {
    let datasets;
    
    if (chartType === 'mixed') {
      // Mixed chart with both line and bar
      datasets = [
        {
          type: 'bar' as const,
          label: 'Chi tiêu thực tế',
          data: data.map(item => item.value),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        ...(data.some(item => item.trend !== undefined) ? [{
          type: 'line' as const,
          label: 'Xu hướng',
          data: data.map(item => item.trend || 0),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
        }] : []),
      ];
    } else if (chartType === 'bar') {
      // Bar chart only
      datasets = [
        {
          type: 'bar' as const,
          label: 'Chi tiêu thực tế',
          data: data.map(item => item.value),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ];
    } else {
      // Default to line chart
      datasets = [
        {
          type: 'line' as const,
          label: 'Chi tiêu thực tế',
          data: data.map(item => item.value),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        },
        ...(data.some(item => item.trend !== undefined) ? [{
          type: 'line' as const,
          label: 'Xu hướng',
          data: data.map(item => item.trend || 0),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          borderDash: [5, 5],
          fill: false,
        }] : []),
      ];
    }

    const chartData: ChartData<'line' | 'bar'> = {
      labels: data.map(item => item.date),
      datasets,
    };

    const scales: any = {
      y: {
        beginAtZero: false,
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
      }
    };

    // Add secondary y-axis if we have mixed chart
    if (chartType === 'mixed') {
      scales.y1 = {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
      };
    }

    const options: ChartOptions<'line' | 'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: title,
        },
      },
      scales,
      // Prevent infinite re-renders on responsive changes
      responsiveAnimationDuration: 0,
      // Animation settings to reduce re-render triggers
      animation: {
        duration: 200, // Reduced animation duration instead of 0 to maintain some UX
      },
      // Interactions settings to reduce re-rendering
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
    };
    
    // Determine which chart component to use
    const ChartComponent = chartType === 'bar' ? Bar : Line;
    
    // Generate a stable key based on data length and first/last items
    // This avoids expensive checksum calculation on every render
    const chartKey = `${chartType}-${data.length}-${data.length > 0 ? data[0].date + data[0].value : 'empty'}-${data.length > 0 ? data[data.length - 1].date + data[data.length - 1].value : 'empty'}`;
    
    return { chartData, options, ChartComponent, chartKey };
  }, [data, chartType, title]);

  return <ChartComponent key={chartKey} data={chartData} options={options} />;
};

export default memo(SmartSpendingTrendsChart);