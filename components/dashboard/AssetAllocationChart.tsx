
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Asset } from '../../types';
import Card from '../ui/Card';

interface AssetAllocationChartProps {
  assets: Asset[];
}

const COLORS = ['#1E88E5', '#00C49F', '#FFC107', '#D81B60', '#8E24AA', '#039BE5', '#FF8F00'];

const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({ assets }) => {
  const chartData = useMemo(() => {
    const assetsByType = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.value;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(assetsByType).map(([name, value]) => ({ name, value }));
  }, [assets]);

  return (
    <Card className="h-full">
      <h2 className="text-lg font-semibold mb-4">Phân Bổ Tài Sản</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
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
          Không có dữ liệu tài sản để hiển thị.
        </div>
      )}
    </Card>
  );
};

export default AssetAllocationChart;
