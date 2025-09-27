/**
 * Vietnam Currency Formatter
 * Format numbers with Vietnamese suffixes: K (Ngàn), Tr (Triệu), Tỷ
 */

export const formatVietnameseCurrency = (amount: number): string => {
  if (amount === 0) return '0 VNĐ';
  
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (absAmount >= 1_000_000_000) {
    // Tỷ (Billion)
    const billions = absAmount / 1_000_000_000;
    return `${sign}${billions.toFixed(billions >= 10 ? 1 : 2)} Tỷ`;
  } else if (absAmount >= 1_000_000) {
    // Triệu (Million)
    const millions = absAmount / 1_000_000;
    return `${sign}${millions.toFixed(millions >= 10 ? 1 : 2)} Tr`;
  } else if (absAmount >= 1_000) {
    // Ngàn (Thousand)
    const thousands = absAmount / 1_000;
    return `${sign}${thousands.toFixed(thousands >= 10 ? 1 : 2)} K`;
  } else {
    // Less than 1000
    return `${sign}${absAmount.toLocaleString('vi-VN')} VNĐ`;
  }
};

export const formatVietnameseNumber = (amount: number): string => {
  if (amount === 0) return '0';
  
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (absAmount >= 1_000_000_000) {
    // Tỷ (Billion)
    const billions = absAmount / 1_000_000_000;
    return `${sign}${billions.toFixed(billions >= 10 ? 1 : 2)} Tỷ`;
  } else if (absAmount >= 1_000_000) {
    // Triệu (Million)
    const millions = absAmount / 1_000_000;
    return `${sign}${millions.toFixed(millions >= 10 ? 1 : 2)} Tr`;
  } else if (absAmount >= 1_000) {
    // Ngàn (Thousand)
    const thousands = absAmount / 1_000;
    return `${sign}${thousands.toFixed(thousands >= 10 ? 1 : 2)} K`;
  } else {
    // Less than 1000
    return `${sign}${absAmount.toLocaleString('vi-VN')}`;
  }
};

// P&L Calculator for investments
export const calculatePnL = (
  quantity: number,
  purchasePrice: number,
  currentPrice: number
): {
  totalCost: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  pnlFormatted: string;
  pnlPercentFormatted: string;
} => {
  const totalCost = quantity * purchasePrice;
  const currentValue = quantity * currentPrice;
  const pnl = currentValue - totalCost;
  const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  
  const pnlSign = pnl >= 0 ? '+' : '';
  const pnlPercentSign = pnlPercent >= 0 ? '+' : '';
  
  return {
    totalCost,
    currentValue,
    pnl,
    pnlPercent,
    pnlFormatted: `${pnlSign}${formatVietnameseCurrency(pnl)}`,
    pnlPercentFormatted: `${pnlPercentSign}${pnlPercent.toFixed(2)}%`
  };
};

// Examples:
// formatVietnameseCurrency(1500) => "1.5 K"
// formatVietnameseCurrency(2500000) => "2.5 Tr" 
// formatVietnameseCurrency(1200000000) => "1.2 Tỷ"
// formatVietnameseCurrency(-500000) => "-500 K"
