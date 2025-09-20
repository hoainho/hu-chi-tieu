
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../types';
import Card from '../ui/Card';

interface ExpensePieChartProps {
  transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D1FF', '#FFD119'];

const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ transactions }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const date = t.date.toDate();
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const expenseByCategory = monthlyTransactions.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <Card className="h-full">
      <h2 className="text-lg font-semibold mb-4">Phân tích chi tiêu tháng này</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          Không có dữ liệu chi tiêu cho tháng này.
        </div>
      )}
    </Card>
  );
};

export default ExpensePieChart;
