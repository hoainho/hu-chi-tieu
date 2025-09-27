/**
 * Formats a number into a Vietnamese currency string.
 * Uses suffixes: K (nghìn), Tr (triệu), Tỷ (tỷ).
 * @param value The number to format.
 * @returns A formatted currency string (e.g., "1.5Tr", "250K", "1.2Tỷ").
 */
export const formatCurrency = (value: number): string => {
  if (isNaN(value)) {
    return '---';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}Tỷ`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}Tr`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
  }
  return `${sign}${Math.round(absValue).toLocaleString('vi-VN')}`;
};
