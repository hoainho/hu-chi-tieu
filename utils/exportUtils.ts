/**
 * Utility functions for data export
 */

// Interface for CSV export options
export interface CsvExportOptions {
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
}

/**
 * Converts an array of objects to CSV format
 * @param data - Array of objects to convert to CSV
 * @param options - CSV export options
 * @returns CSV formatted string
 */
export function arrayToCsv(data: any[], options: CsvExportOptions = {}): string {
  const { delimiter = ',', includeHeaders = true } = options;
  
  if (!data || data.length === 0) {
    return '';
  }

  const headers = includeHeaders 
    ? Object.keys(data[0]).map(header => `"${header}"`).join(delimiter) 
    : '';
  
  const rows = data.map(row => {
    return Object.values(row).map(value => {
      // Handle different value types
      if (value === null || value === undefined) {
        return '""';
      }
      
      // Convert dates to string
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      
      // For strings, escape quotes and wrap in quotes
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      // For everything else, convert to string and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(delimiter);
  });

  const csvContent = includeHeaders 
    ? [headers, ...rows].join('\n') 
    : rows.join('\n');
  
  return csvContent;
}

/**
 * Downloads data as a CSV file
 * @param data - Array of objects to export
 * @param options - CSV export options
 */
export function downloadCsv(data: any[], options: CsvExportOptions = {}): void {
  const { filename = 'export.csv' } = options;
  const csvContent = arrayToCsv(data, options);
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Generic data export function that can handle multiple formats
 * @param data - Data to export
 * @param format - Export format ('csv', 'json', etc.)
 * @param options - Export options specific to format
 */
export function exportData(data: any[], format: 'csv' | 'json', options?: any): void {
  switch (format) {
    case 'csv':
      downloadCsv(data, options);
      break;
    case 'json':
      downloadJson(data, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Downloads data as a JSON file
 * @param data - Array of objects to export
 * @param options - JSON export options (currently filename only)
 */
export function downloadJson(data: any[], options: { filename?: string } = {}): void {
  const { filename = 'export.json' } = options;
  const jsonContent = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Specific export functions for different data types

export interface TransactionForExport {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  accountName?: string;
  type?: string;
}

/**
 * Exports transactions to CSV format
 * @param transactions - Array of transaction objects
 * @param filename - Name of the export file
 */
export function exportTransactions(transactions: TransactionForExport[], filename: string = 'transactions.csv'): void {
  // Format transactions for export
  const formattedTransactions = transactions.map(tx => ({
    ID: tx.id,
    Description: tx.description,
    Amount: tx.amount,
    Category: tx.category,
    Date: tx.date,
    Account: tx.accountName || 'N/A',
    Type: tx.type || 'N/A'
  }));

  downloadCsv(formattedTransactions, { filename });
}

export interface AssetForExport {
  id: string;
  name: string;
  type: string;
  value: number;
  purchaseDate: string;
  currentPrice?: number;
  symbol?: string;
}

/**
 * Exports assets to CSV format
 * @param assets - Array of asset objects
 * @param filename - Name of the export file
 */
export function exportAssets(assets: AssetForExport[], filename: string = 'assets.csv'): void {
  // Format assets for export
  const formattedAssets = assets.map(asset => ({
    ID: asset.id,
    Name: asset.name,
    Type: asset.type,
    Value: asset.value,
    PurchaseDate: asset.purchaseDate,
    CurrentPrice: asset.currentPrice || 'N/A',
    Symbol: asset.symbol || 'N/A'
  }));

  downloadCsv(formattedAssets, { filename });
}

export interface BudgetForExport {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
}

/**
 * Exports budgets/envelopes to CSV format
 * @param budgets - Array of budget objects
 * @param filename - Name of the export file
 */
export function exportBudgets(budgets: BudgetForExport[], filename: string = 'budgets.csv'): void {
  // Format budgets for export
  const formattedBudgets = budgets.map(budget => ({
    ID: budget.id,
    Name: budget.name,
    Allocated: budget.allocated,
    Spent: budget.spent,
    Remaining: budget.remaining,
    PercentageUsed: `${budget.percentage}%`
  }));

  downloadCsv(formattedBudgets, { filename });
}