import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAssets } from '../../hooks/useAssets';
import { formatVietnameseCurrency, formatVietnameseNumber } from '../../utils/vietnamCurrency';
import ModernCard from '../ui/ModernCard';

interface PortfolioAllocationProps {
  vietnamStocks: any[];
  cryptoPrices: any[];
  goldPrices: any[];
}

const PortfolioAllocation: React.FC<PortfolioAllocationProps> = ({
  vietnamStocks,
  cryptoPrices,
  goldPrices
}) => {
  const { assets, getInvestmentAssets } = useAssets();

  // Create market prices map
  const marketPrices: Record<string, number> = {};
  
  vietnamStocks.forEach(stock => {
    marketPrices[stock.symbol] = stock.price;
  });
  
  cryptoPrices.forEach(crypto => {
    marketPrices[crypto.symbol] = crypto.price;
  });
  
  if (goldPrices.length > 0) {
    const avgGoldPrice = goldPrices.reduce((sum, gold) => sum + gold.sellPrice, 0) / goldPrices.length;
    marketPrices['GOLD'] = avgGoldPrice;
  }

  // Calculate values by asset type
  const investmentAssets = getInvestmentAssets();
  
  const assetTypeValues = {
    stock: 0,
    crypto: 0,
    gold: 0,
    mutual_fund: 0
  };

  investmentAssets.forEach(asset => {
    const marketAsset = asset as any;
    const symbol = marketAsset.symbol || 'GOLD';
    const currentPrice = marketPrices[symbol] || marketAsset.purchasePrice;
    const currentValue = marketAsset.quantity * currentPrice;
    
    if (asset.type === 'stock') {
      assetTypeValues.stock += currentValue;
    } else if (asset.type === 'crypto') {
      assetTypeValues.crypto += currentValue;
    } else if (asset.type === 'gold') {
      assetTypeValues.gold += currentValue;
    } else if (asset.type === 'mutual_fund') {
      assetTypeValues.mutual_fund += currentValue;
    }
  });

  const totalValue = assetTypeValues.stock + assetTypeValues.crypto + assetTypeValues.gold + (assetTypeValues.mutual_fund || 0);

  // Prepare data for pie chart
  const pieData = [
    {
      name: 'Cổ phiếu',
      value: assetTypeValues.stock,
      percentage: totalValue > 0 ? (assetTypeValues.stock / totalValue) * 100 : 0,
      color: '#3B82F6'
    },
    {
      name: 'Tiền điện tử',
      value: assetTypeValues.crypto,
      percentage: totalValue > 0 ? (assetTypeValues.crypto / totalValue) * 100 : 0,
      color: '#F59E0B'
    },
    {
      name: 'Vàng',
      value: assetTypeValues.gold,
      percentage: totalValue > 0 ? (assetTypeValues.gold / totalValue) * 100 : 0,
      color: '#EAB308'
    },
    {
      name: 'Chứng chỉ quỹ',
      value: assetTypeValues.mutual_fund,
      percentage: totalValue > 0 ? (assetTypeValues.mutual_fund / totalValue) * 100 : 0,
      color: '#14B8A6'
    }
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-blue-600">
            Giá trị: {formatVietnameseCurrency(data.value)}
          </p>
          <p className="text-gray-600">
            Tỷ lệ: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (totalValue === 0) {
    return (
      <ModernCard>
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Phân bổ danh mục</h3>
        <div className="text-center py-12">
          <i className="fas fa-chart-pie text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-500 mb-2">Chưa có tài sản đầu tư</p>
          <p className="text-sm text-gray-400">Thêm cổ phiếu, crypto hoặc vàng để xem phân bổ danh mục</p>
        </div>
      </ModernCard>
    );
  }

  return (
    <ModernCard>
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Phân bổ danh mục</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend and Details */}
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600">Tổng giá trị đầu tư</div>
            <div className="text-2xl font-bold text-gray-800">
              {formatVietnameseCurrency(totalValue)}
            </div>
          </div>

          <div className="space-y-3">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="font-medium text-gray-800">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">
                    {formatVietnameseNumber(item.value)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Asset Count Summary */}
          <div className="border-t pt-4 mt-4">
            <div className="text-sm text-gray-600 mb-2">Tổng quan tài sản</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {investmentAssets.filter(a => a.type === 'stock').length}
                </div>
                <div className="text-gray-500">Cổ phiếu</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">
                  {investmentAssets.filter(a => a.type === 'crypto').length}
                </div>
                <div className="text-gray-500">Crypto</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">
                  {investmentAssets.filter(a => a.type === 'gold').length}
                </div>
                <div className="text-gray-500">Vàng</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernCard>
  );
};

export default PortfolioAllocation;
