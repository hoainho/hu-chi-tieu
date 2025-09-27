import React, { useState } from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import { useAssets } from '../../hooks/useAssets';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { calculatePnL } from '../../utils/vietnamCurrency';
import PnLDisplay from '../ui/PnLDisplay';
import ModernCard from '../ui/ModernCard';
import Button from '../ui/Button';

const StockHoldings: React.FC = () => {
  const { marketData, refreshData } = useMarketData();
  const { assets } = useAssets();
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'symbol'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and calculate stock data
  const stockData = React.useMemo(() => {
    const stockAssets = assets.filter(asset => asset.type === 'stock');
    
    return stockAssets.map(asset => {
      const marketAsset = asset as any;
      const stockPrice = marketData.stocks.find(s => s.symbol === marketAsset.symbol);
      const currentPrice = stockPrice?.price || marketAsset.purchasePrice;
      
      const pnlData = calculatePnL(
        marketAsset.quantity,
        marketAsset.purchasePrice,
        currentPrice
      );

      return {
        ...asset,
        symbol: marketAsset.symbol,
        quantity: marketAsset.quantity,
        purchasePrice: marketAsset.purchasePrice,
        currentPrice,
        ...pnlData,
        priceChange: stockPrice?.change || 0,
        priceChangePercent: stockPrice?.changePercent || 0,
        hasRealTimeData: !!stockPrice
      };
    }).sort((a, b) => {
      const aValue = sortBy === 'value' ? a.currentValue : 
                    sortBy === 'pnl' ? a.pnl : 
                    a.symbol;
      const bValue = sortBy === 'value' ? b.currentValue : 
                    sortBy === 'pnl' ? b.pnl : 
                    b.symbol;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? 
        (aValue as number) - (bValue as number) : 
        (bValue as number) - (aValue as number);
    });
  }, [assets, marketData.stocks, sortBy, sortOrder]);

  const totalValue = stockData.reduce((sum, stock) => sum + stock.currentValue, 0);
  const totalCost = stockData.reduce((sum, stock) => sum + stock.totalCost, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <ModernCard>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <i className="fas fa-chart-line text-blue-500 mr-2"></i>
            Cổ phiếu sở hữu
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {stockData.length} mã cổ phiếu • {formatVietnameseCurrency(totalValue)}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refreshData()}
            disabled={marketData.loading}
          >
            <i className={`fas fa-sync-alt mr-1 ${marketData.loading ? 'fa-spin' : ''}`}></i>
            Cập nhật
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600">Tổng giá trị</div>
          <div className="font-semibold text-blue-800">
            {formatVietnameseCurrency(totalValue)}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Vốn gốc</div>
          <div className="font-semibold text-gray-800">
            {formatVietnameseCurrency(totalCost)}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Lời/Lỗ tổng</div>
          <PnLDisplay pnl={totalPnL} pnlPercent={totalPnLPercent} className="justify-center" />
        </div>
      </div>

      {stockData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-chart-line text-4xl mb-4 opacity-50"></i>
          <p>Chưa có cổ phiếu nào</p>
          <p className="text-sm">Thêm cổ phiếu để theo dõi</p>
        </div>
      ) : (
        <>
          {/* Sort Controls */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm text-gray-600">Sắp xếp theo:</span>
            <button
              onClick={() => handleSort('value')}
              className={`text-xs px-2 py-1 rounded ${
                sortBy === 'value' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Giá trị {sortBy === 'value' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('pnl')}
              className={`text-xs px-2 py-1 rounded ${
                sortBy === 'pnl' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              P&L {sortBy === 'pnl' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('symbol')}
              className={`text-xs px-2 py-1 rounded ${
                sortBy === 'symbol' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Mã CP {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          {/* Stock List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stockData.map((stock, index) => (
              <div key={stock.id} className={`p-4 rounded-lg border ${
                stock.hasRealTimeData ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="mr-3">
                      <div className="font-semibold text-gray-800 flex items-center">
                        {stock.symbol}
                        {stock.hasRealTimeData ? (
                          <i className="fas fa-circle text-green-500 text-xs ml-2" title="Dữ liệu thời gian thực"></i>
                        ) : (
                          <i className="fas fa-circle text-gray-400 text-xs ml-2" title="Dữ liệu offline"></i>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{stock.name || stock.symbol}</div>
                      <div className="text-xs text-gray-500">
                        {stock.quantity} cổ phiếu × {formatVietnameseCurrency(stock.currentPrice)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-800 mb-1">
                      {formatVietnameseCurrency(stock.currentValue)}
                    </div>
                    
                    <PnLDisplay 
                      pnl={stock.pnl} 
                      pnlPercent={stock.pnlPercent} 
                      showIcon={false} 
                      className="text-xs mb-1" 
                    />
                    
                    {stock.hasRealTimeData && (
                      <div className={`text-xs flex items-center justify-end ${
                        stock.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <i className={`fas ${stock.priceChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                        {stock.priceChangePercent.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress bar for P&L */}
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full ${stock.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ 
                      width: `${Math.min(Math.abs(stock.pnlPercent), 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Last Update */}
      {marketData.lastUpdate && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Cập nhật lần cuối: {marketData.lastUpdate.toLocaleTimeString('vi-VN')}
        </div>
      )}
    </ModernCard>
  );
};

export default StockHoldings;
