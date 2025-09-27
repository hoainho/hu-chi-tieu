import React, { useMemo } from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import { useAssets } from '../../hooks/useAssets';
import { formatVietnameseCurrency, formatVietnameseNumber } from '../../utils/vietnamCurrency';
import { PieChart } from '../charts/ReusableCharts';
import ModernCard from '../ui/ModernCard';

const EnhancedPortfolioAllocation: React.FC = () => {
  const { marketData } = useMarketData();
  const { assets, getInvestmentAssets } = useAssets();

  // Calculate allocation data
  const allocationData = useMemo(() => {
    const investmentAssets = getInvestmentAssets();
    
    if (investmentAssets.length === 0) {
      return {
        chartData: [],
        totalValue: 0,
        breakdown: []
      };
    }

    // Group assets by type and calculate values
    const assetGroups = {
      stock: { assets: [], value: 0, color: '#3B82F6' },
      crypto: { assets: [], value: 0, color: '#F59E0B' },
      gold: { assets: [], value: 0, color: '#EAB308' },
      other: { assets: [], value: 0, color: '#6B7280' }
    };

    investmentAssets.forEach(asset => {
      const marketAsset = asset as any;
      let currentPrice = marketAsset.purchasePrice; // Fallback

      // Get current price from market data
      if (asset.type === 'stock') {
        const stockPrice = marketData.stocks.find(s => s.symbol === marketAsset.symbol);
        if (stockPrice) currentPrice = stockPrice.price;
      } else if (asset.type === 'crypto') {
        const cryptoPrice = marketData.crypto.find(c => c.symbol === marketAsset.symbol);
        if (cryptoPrice) currentPrice = cryptoPrice.price;
      } else if (asset.type === 'gold' && marketData.gold.length > 0) {
        const avgGoldPrice = marketData.gold.reduce((sum, gold) => sum + gold.sellPrice, 0) / marketData.gold.length;
        currentPrice = avgGoldPrice;
      }

      const currentValue = marketAsset.quantity * currentPrice;
      const assetType = asset.type as keyof typeof assetGroups;
      
      if (assetGroups[assetType]) {
        assetGroups[assetType].assets.push({
          ...asset,
          currentPrice,
          currentValue,
          pnl: currentValue - (marketAsset.quantity * marketAsset.purchasePrice)
        });
        assetGroups[assetType].value += currentValue;
      }
    });

    const totalValue = Object.values(assetGroups).reduce((sum, group) => sum + group.value, 0);

    // Prepare chart data
    const chartData = Object.entries(assetGroups)
      .filter(([, group]) => group.value > 0)
      .map(([type, group]) => ({
        name: type === 'stock' ? 'Cổ phiếu' :
              type === 'crypto' ? 'Tiền điện tử' :
              type === 'gold' ? 'Vàng' : 'Khác',
        value: group.value,
        percentage: totalValue > 0 ? (group.value / totalValue) * 100 : 0,
        color: group.color,
        count: group.assets.length
      }));

    // Detailed breakdown
    const breakdown = Object.entries(assetGroups)
      .filter(([, group]) => group.value > 0)
      .map(([type, group]) => ({
        type,
        name: type === 'stock' ? 'Cổ phiếu' :
              type === 'crypto' ? 'Tiền điện tử' :
              type === 'gold' ? 'Vàng' : 'Khác',
        value: group.value,
        percentage: totalValue > 0 ? (group.value / totalValue) * 100 : 0,
        color: group.color,
        assets: group.assets,
        count: group.assets.length
      }));

    return { chartData, totalValue, breakdown };
  }, [getInvestmentAssets, marketData]);

  if (allocationData.totalValue === 0) {
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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Phân bổ danh mục</h3>
        <div className="text-right">
          <div className="text-sm text-gray-600">Tổng giá trị</div>
          <div className="text-lg font-bold text-gray-800">
            {formatVietnameseCurrency(allocationData.totalValue)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <PieChart
            data={allocationData.chartData}
            height={250}
            showLegend={false}
          />
        </div>

        {/* Breakdown Details */}
        <div className="space-y-4">
          {allocationData.breakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div>
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <div className="text-xs text-gray-500">
                    {item.count} tài sản
                  </div>
                </div>
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
      </div>

      {/* Asset Details */}
      <div className="mt-6 space-y-4">
        <h4 className="font-semibold text-gray-800">Chi tiết tài sản</h4>
        {allocationData.breakdown.map((group, groupIndex) => (
          <div key={groupIndex} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: group.color }}
              ></div>
              <h5 className="font-medium text-gray-800">{group.name}</h5>
              <span className="ml-auto text-sm text-gray-600">
                {formatVietnameseNumber(group.value)} ({group.percentage.toFixed(1)}%)
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.assets.slice(0, 6).map((asset: any, assetIndex: number) => (
                <div key={assetIndex} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{asset.symbol || asset.name}</span>
                    <div className="text-xs text-gray-500">
                      {asset.quantity} × {formatVietnameseCurrency(asset.currentPrice)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatVietnameseCurrency(asset.currentValue)}
                    </div>
                    <div className={`text-xs ${asset.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {asset.pnl >= 0 ? '+' : ''}{formatVietnameseCurrency(asset.pnl)}
                    </div>
                  </div>
                </div>
              ))}
              {group.assets.length > 6 && (
                <div className="text-sm text-gray-500 text-center col-span-2">
                  +{group.assets.length - 6} tài sản khác
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {assets.filter(a => a.type === 'stock').length}
          </div>
          <div className="text-sm text-gray-600">Cổ phiếu</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {assets.filter(a => a.type === 'crypto').length}
          </div>
          <div className="text-sm text-gray-600">Crypto</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {assets.filter(a => a.type === 'gold').length}
          </div>
          <div className="text-sm text-gray-600">Vàng</div>
        </div>
      </div>
    </ModernCard>
  );
};

export default EnhancedPortfolioAllocation;
