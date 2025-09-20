
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../types';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';

interface ExpenseTrendChartProps {
  transactions: Transaction[];
}

const ExpenseTrendChart: React.FC<ExpenseTrendChartProps> = ({ transactions }) => {
  const chartData = useMemo(() => {
    const dataByDay: { [key: string]: number } = {};
    const today = new Date();
    
    // Initialize data for the last 30 days with 0 expenses
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      dataByDay[dateKey] = 0;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const relevantTransactions = transactions.filter(t => t.date.toDate() >= thirtyDaysAgo);

    relevantTransactions.forEach(t => {
      const date = t.date.toDate();
      const dateKey = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (dataByDay.hasOwnProperty(dateKey)) {
        dataByDay[dateKey] += t.amount;
      }
    });

    return Object.entries(dataByDay).map(([date, total]) => ({ date, total }));
  }, [transactions]);
  
  const hasData = useMemo(() => chartData.some(d => d.total > 0), [chartData]);

  return (
    <Card className="h-full">
      <h2 className="text-lg font-semibold mb-4">Xu hướng chi tiêu (30 ngày qua)</h2>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#ef4444" name="Tổng chi tiêu" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
         <div className="flex items-center justify-center h-full text-slate-500" style={{ height: '300px' }}>
            Không có dữ liệu chi tiêu trong 30 ngày qua.
        </div>
      )}
    </Card>
  );
};

export default ExpenseTrendChart;
