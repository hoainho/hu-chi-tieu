import React from 'react';
import { Asset, isMarketAsset, isFixedValueAsset } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AssetDetailCardProps {
  asset: Asset;
}

const AssetDetailCard: React.FC<AssetDetailCardProps> = ({ asset }) => {
  // Calculate cost basis and gain/loss for market assets
  let costBasis = 0;
  let currentValue = 0;
  let gainLoss = 0;
  let gainLossPercent = 0;

  if (isMarketAsset(asset)) {
    costBasis = asset.quantity * asset.purchasePrice;
    currentValue = asset.marketValue || (asset.quantity * (asset.currentPrice || asset.purchasePrice));
    gainLoss = currentValue - costBasis;
    gainLossPercent = costBasis !== 0 ? (gainLoss / costBasis) * 100 : 0;
  } else if (isFixedValueAsset(asset)) {
    costBasis = asset.value;
    currentValue = asset.value;
    gainLoss = 0; // Fixed value assets don't have gain/loss
    gainLossPercent = 0;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{asset.name}</h3>
          <p className="text-gray-500 text-sm capitalize">{asset.type}</p>
        </div>
        <div className="flex items-center">
          {asset.ownerType === 'shared' && (
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2">
              Chia sẻ
            </span>
          )}
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {asset.type}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {isMarketAsset(asset) && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Số lượng</p>
                <p className="font-semibold">
                  {asset.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} 
                  {asset.type === 'stock' ? ' CP' : 
                   asset.type === 'crypto' ? (asset.symbol || '') : 
                   asset.type === 'gold' ? (asset.quantity >= 10 ? ' cây' : ' chỉ') : 
                   ''}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Giá mua TB</p>
                <p className="font-semibold">{formatCurrency(asset.purchasePrice)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Giá trị vốn</p>
                <p className="font-semibold">{formatCurrency(costBasis)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Giá hiện tại</p>
                <p className="font-semibold">{formatCurrency(asset.currentPrice || asset.purchasePrice)}</p>
              </div>
            </div>
          </>
        )}

        <div className="pt-2 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Tổng vốn</p>
              <p className="font-semibold">{formatCurrency(costBasis)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Hiện tại</p>
              <p className="font-semibold">{formatCurrency(currentValue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lãi/Lỗ</p>
              <p className={`font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPercent.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
        <span className="text-xs text-gray-500">
          {asset.date.toDate().toLocaleDateString('vi-VN')}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${gainLoss >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {gainLoss >= 0 ? 'Tăng trưởng' : 'Giảm giá'}
        </span>
      </div>
    </div>
  );
};

export default AssetDetailCard;