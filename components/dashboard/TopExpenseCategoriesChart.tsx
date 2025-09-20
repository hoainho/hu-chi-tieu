
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Transaction } from '../../types';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';

interface TopExpenseCategoriesChartProps {
  transactions: Transaction[];
}

const TopExpenseCategoriesChart: React.FC<TopExpenseCategoriesChartProps> = ({ transactions }) => {
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

    return Object.entries(expenseByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Get top 5
  }, [transactions]);

  return (
    <Card className="h-full">
      <h2 className="text-lg font-semibold mb-4">Top 5 Chi Tiêu Tháng Này</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatCurrency} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
            <Bar dataKey="value" fill="#8884d8">
               <LabelList dataKey="value" position="right" formatter={formatCurrency} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-slate-500">
          Không có dữ liệu chi tiêu cho tháng này.
        </div>
      )}
    </Card>
  );
};

export default TopExpenseCategoriesChart;
