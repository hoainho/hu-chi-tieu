
import React from 'react';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: string;
  color: 'green' | 'red' | 'blue';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon, color }) => {
  const colorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(amount)}</p>
        </div>
        <div className={`text-3xl ${colorClasses[color]}`}>
          <i className={`fas ${icon}`}></i>
        </div>
      </div>
    </Card>
  );
};

export default SummaryCard;
