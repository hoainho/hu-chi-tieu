/**
 * Formats a number into a Vietnamese currency string.
 * Uses suffixes for millions (Triệu) and billions (Tỷ).
 * Formats numbers below a million with standard comma separators.
 * @param value The number to format.
 * @returns A formatted currency string (e.g., "1.5 Triệu", "250.000", "1.2 Tỷ").
 */
export const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Tỷ`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Triệu`;
  }
  return `${sign}${value.toLocaleString('vi-VN')}`;
};
