import React from 'react';

interface PriceUnavailableNoticeProps {
  assetType: 'stock' | 'crypto' | 'gold';
  symbol?: string;
  className?: string;
}

const PriceUnavailableNotice: React.FC<PriceUnavailableNoticeProps> = ({
  assetType,
  symbol,
  className = ''
}) => {
  const getAssetTypeText = () => {
    switch (assetType) {
      case 'stock': return 'cổ phiếu';
      case 'crypto': return 'tiền điện tử';
      case 'gold': return 'vàng';
      default: return 'tài sản';
    }
  };

  return (
    <div className={`text-center py-4 px-3 bg-orange-50 border border-orange-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-center mb-2">
        <i className="fas fa-exclamation-triangle text-orange-500 text-xl mr-2"></i>
        <span className="text-orange-700 font-semibold">Chưa có giá</span>
      </div>
      
      <div className="text-sm text-orange-600 mb-2">
        {symbol ? (
          <>Không thể lấy giá {getAssetTypeText()} <strong>{symbol}</strong></>
        ) : (
          <>Không thể lấy giá {getAssetTypeText()}</>
        )}
      </div>
      
      <div className="text-xs text-orange-500 flex items-center justify-center">
        <i className="fas fa-clock mr-1"></i>
        Sẽ thử cập nhật sau 30 phút
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        API có thể tạm thời không khả dụng
      </div>
    </div>
  );
};

export default PriceUnavailableNotice;
