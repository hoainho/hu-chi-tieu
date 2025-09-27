import { formatVietnameseCurrency } from '@/utils/vietnamCurrency';
import React from 'react';

interface TrendIndicatorProps {
  value: number;
  percentage?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  percentage,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const colorClasses = isNeutral
    ? 'text-gray-500'
    : isPositive
    ? 'text-green-600'
    : 'text-red-600';

  const bgClasses = isNeutral
    ? 'bg-gray-100'
    : isPositive
    ? 'bg-green-50'
    : 'bg-red-50';

  const formatValue = (val: number) => {
    return Math.abs(val).toLocaleString();
  };

  const formatPercentage = (val: number) => {
    return `${Math.abs(val).toFixed(2)}%`;
  };

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full ${bgClasses} ${className}`}>
      {showIcon && (
        <i className={`
          ${iconSizes[size]} ${colorClasses}
          ${isNeutral ? 'fas fa-minus' : isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down'}
        `} />
      )}
      
      <span className={`font-medium ${sizeClasses[size]} ${colorClasses}`}>
        {isPositive ? '+' : isNeutral ? '' : '-'}{formatVietnameseCurrency(value)}
      </span>
      
      {percentage !== undefined && (
        <span className={`${sizeClasses[size]} ${colorClasses} opacity-75`}>
          ({isPositive ? '+' : isNeutral ? '' : '-'}{formatPercentage(percentage)})
        </span>
      )}
    </div>
  );
};

export default TrendIndicator;
