import React from 'react';
import { PortfolioSummary } from '../../hooks/useAssetSummary';
import { formatCurrency } from '../../utils/formatters';

interface AssetBreakdownProps {
  portfolioSummary: PortfolioSummary | null;
  loading: boolean;
}

const AssetBreakdown: React.FC<AssetBreakdownProps> = ({ portfolioSummary, loading }) => {
  if (loading || !portfolioSummary) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <i className="fas fa-list mr-2 text-blue-600"></i>
        Chi tiết tài sản theo loại
      </h3>
      
      <div className="space-y-4">
        {Object.entries(portfolioSummary.assetTypeBreakdown).map(([type, data]) => (
          <div key={type} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-gray-800 capitalize">
                  {type === 'savings' && 'Tiết kiệm'} 
                  {type === 'stock' && 'Cổ phiếu'} 
                  {type === 'crypto' && 'Tiền điện tử'} 
                  {type === 'gold' && 'Vàng'} 
                  {type === 'real_estate' && 'Bất động sản'} 
                  {type === 'bond' && 'Trái phiếu'} 
                  {type === 'mutual_fund' && 'Quỹ đầu tư'} 
                  {type === 'other' && 'Khác'}
                </h4>
                <p className="text-sm text-gray-500">
                  {type === 'savings' && 'Tài sản tiết kiệm'} 
                  {type === 'stock' && 'Tài sản cổ phiếu'} 
                  {type === 'crypto' && 'Tài sản tiền điện tử'} 
                  {type === 'gold' && 'Tài sản vàng'} 
                  {type === 'real_estate' && 'Tài sản bất động sản'} 
                  {type === 'bond' && 'Tài sản trái phiếu'} 
                  {type === 'mutual_fund' && 'Tài sản quỹ đầu tư'} 
                  {type === 'other' && 'Tài sản khác'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">{formatCurrency(data.currentValue)}</p>
                <p className="text-sm text-gray-500">Giá trị hiện tại</p>
              </div>
            </div>
            
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="bg-blue-50 p-2 rounded text-center">
                <p className="text-xs text-blue-600">Vốn đầu tư</p>
                <p className="font-medium">{formatCurrency(data.originalValue)}</p>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="text-xs text-green-600">Hiện tại</p>
                <p className="font-medium">{formatCurrency(data.currentValue)}</p>
              </div>
              <div className={`p-2 rounded text-center ${data.gainLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-xs">Lãi/Lỗ</p>
                <p className={`font-medium ${data.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss)} ({data.gainLossPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Tổng vốn đầu tư</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(portfolioSummary.totalOriginalValue)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Giá trị hiện tại</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(portfolioSummary.totalCurrentValue)}</p>
          </div>
          <div className={`p-3 rounded-lg ${portfolioSummary.totalGainLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-sm font-medium">Tổng Lãi/Lỗ</p>
            <p className={`text-lg font-bold ${portfolioSummary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolioSummary.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalGainLoss)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetBreakdown;