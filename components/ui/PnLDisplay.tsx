import React from 'react';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';

interface PnLDisplayProps {
  pnl: number;
  pnlPercent: number;
  className?: string;
  showIcon?: boolean;
}

const PnLDisplay: React.FC<PnLDisplayProps> = ({ 
  pnl, 
  pnlPercent, 
  className = '', 
  showIcon = true 
}) => {
  const isPositive = pnl >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColorClass = isPositive ? 'bg-green-50' : 'bg-red-50';
  const icon = isPositive ? '↗' : '↘';
  const sign = isPositive ? '+' : '';
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${bgColorClass} ${className}`}>
      {showIcon && (
        <span className={`text-sm ${colorClass}`}>
          {icon}
        </span>
      )}
      <span className={`font-medium ${colorClass}`}>
        {sign}{formatVietnameseCurrency(pnl)}
      </span>
      <span className={`text-sm ${colorClass}`}>
        ({sign}{pnlPercent.toFixed(2)}%)
      </span>
    </div>
  );
};

export default PnLDisplay;
