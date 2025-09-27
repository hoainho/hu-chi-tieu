import React from 'react';
import { useAssets } from '../../hooks/useAssets';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import PnLDisplay from '../ui/PnLDisplay';
import ModernCard from '../ui/ModernCard';

interface PortfolioSummaryProps {
  vietnamStocks: any[];
  cryptoPrices: any[];
  goldPrices: any[];
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  vietnamStocks,
  cryptoPrices,
  goldPrices
}) => {
  const { assets, getInvestmentAssets } = useAssets();

  // Create market prices map
  const marketPrices: Record<string, number> = {};
  
  // Add stock prices
  vietnamStocks.forEach(stock => {
    marketPrices[stock.symbol] = stock.price;
  });
  
  // Add crypto prices
  cryptoPrices.forEach(crypto => {
    marketPrices[crypto.symbol] = crypto.price;
  });
  
  // Add gold prices (use average of SJC/PNJ)
  if (goldPrices.length > 0) {
    const avgGoldPrice = goldPrices.reduce((sum, gold) => sum + gold.sellPrice, 0) / goldPrices.length;
    marketPrices['GOLD'] = avgGoldPrice;
  }

  // Calculate portfolio summary
  const investmentAssets = getInvestmentAssets();
  let totalCost = 0;
  let totalCurrentValue = 0;
  let totalPnL = 0;

  const assetDetails = investmentAssets.map(asset => {
    const marketAsset = asset as any;
    const symbol = marketAsset.symbol || 'GOLD'; // Default to GOLD for gold assets
    const currentPrice = marketPrices[symbol] || marketAsset.purchasePrice;
    
    const cost = marketAsset.quantity * marketAsset.purchasePrice;
    const currentValue = marketAsset.quantity * currentPrice;
    const pnl = currentValue - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
    
    totalCost += cost;
    totalCurrentValue += currentValue;
    totalPnL += pnl;
    
    return {
      ...asset,
      currentPrice,
      cost,
      currentValue,
      pnl,
      pnlPercent
    };
  });

  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Group by asset type
  const stockAssets = assetDetails.filter(asset => asset.type === 'stock');
  const cryptoAssets = assetDetails.filter(asset => asset.type === 'crypto');
  const goldAssets = assetDetails.filter(asset => asset.type === 'gold');

  const stockValue = stockAssets.reduce((sum, asset) => sum + (asset as any).currentValue, 0);
  const cryptoValue = cryptoAssets.reduce((sum, asset) => sum + (asset as any).currentValue, 0);
  const goldValue = goldAssets.reduce((sum, asset) => sum + (asset as any).currentValue, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Portfolio Overview */}
      <ModernCard>
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">Tổng danh mục đầu tư</div>
          <div className="text-2xl font-bold text-gray-800 mb-2">
            {formatVietnameseCurrency(totalCurrentValue)}
          </div>
          <PnLDisplay pnl={totalPnL} pnlPercent={totalPnLPercent} className="justify-center" />
          <div className="text-xs text-gray-500 mt-2">
            Vốn gốc: {formatVietnameseCurrency(totalCost)}
          </div>
        </div>
      </ModernCard>

      {/* Stocks */}
      <ModernCard>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <i className="fas fa-chart-line text-blue-500 mr-2"></i>
            <span className="text-sm text-gray-600">Cổ phiếu</span>
          </div>
          <div className="text-xl font-bold text-gray-800 mb-2">
            {formatVietnameseCurrency(stockValue)}
          </div>
          <div className="text-xs text-gray-500">
            {stockAssets.length} mã cổ phiếu
          </div>
        </div>
      </ModernCard>

      {/* Crypto */}
      <ModernCard>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <i className="fab fa-bitcoin text-orange-500 mr-2"></i>
            <span className="text-sm text-gray-600">Tiền điện tử</span>
          </div>
          <div className="text-xl font-bold text-gray-800 mb-2">
            {formatVietnameseCurrency(cryptoValue)}
          </div>
          <div className="text-xs text-gray-500">
            {cryptoAssets.length} loại coin
          </div>
        </div>
      </ModernCard>

      {/* Gold */}
      <ModernCard>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <i className="fas fa-coins text-yellow-500 mr-2"></i>
            <span className="text-sm text-gray-600">Vàng</span>
          </div>
          <div className="text-xl font-bold text-gray-800 mb-2">
            {formatVietnameseCurrency(goldValue)}
          </div>
          <div className="text-xs text-gray-500">
            {goldAssets.length} loại vàng
          </div>
        </div>
      </ModernCard>
    </div>
  );
};

export default PortfolioSummary;
