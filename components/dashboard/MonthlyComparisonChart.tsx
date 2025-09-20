
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, IncomeSource } from '../../types';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';

// FIX: Added missing props interface definition.
interface MonthlyComparisonChartProps {
  transactions: Transaction[];
  incomes: IncomeSource[];
}

const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({ transactions, incomes }) => {
  const chartData = useMemo(() => {
    const dataByMonth: { [key: string]: { name: string; income: number; expenses: number } } = {};
    const monthNames = ["Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6", "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12"];

    const processItems = <T extends { date: { toDate: () => Date }; amount: number }>(
      items: T[], 
      type: 'income' | 'expenses'
    ) => {
      items.forEach(item => {
        const date = item.date.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
        if (!dataByMonth[monthKey]) {
          dataByMonth[monthKey] = { name: monthName, income: 0, expenses: 0 };
        }
        dataByMonth[monthKey][type] += item.amount;
      });
    };

    processItems(incomes, 'income');
    processItems(transactions, 'expenses');
    
    return Object.values(dataByMonth).sort((a, b) => {
        const [aMonth, aYear] = a.name.split(' ');
        const [bMonth, bYear] = b.name.split(' ');
        return new Date(parseInt(aYear), monthNames.indexOf(aMonth)).getTime() - new Date(parseInt(bYear), monthNames.indexOf(bMonth)).getTime();
    }).slice(-6); // show last 6 months

  }, [transactions, incomes]);

  return (
    <Card className="h-full">
      <h2 className="text-lg font-semibold mb-4">So sánh Thu nhập - Chi tiêu hàng tháng</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
            <Legend />
            <Bar dataKey="income" fill="#22c55e" name="Thu nhập" />
            <Bar dataKey="expenses" fill="#ef4444" name="Chi tiêu" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
         <div className="flex items-center justify-center h-[300px] text-slate-500">
            Không đủ dữ liệu để hiển thị so sánh.
        </div>
      )}
    </Card>
  );
};

export default MonthlyComparisonChart;