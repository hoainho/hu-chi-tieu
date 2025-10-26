import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  arrayToCsv, 
  downloadCsv, 
  exportData, 
  exportTransactions, 
  exportAssets, 
  exportBudgets,
  TransactionForExport,
  AssetForExport,
  BudgetForExport
} from '../utils/exportUtils';

// Mock the DOM APIs used for file download
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockClick = vi.fn();
const mockRemoveChild = vi.fn();
const mockGetAttribute = vi.fn();
const mockSetAttribute = vi.fn();
const mockUrlCreateObjectURL = vi.fn();
const mockUrlRevokeObjectURL = vi.fn();

// Create a mock anchor element
const mockAnchorElement = {
  getAttribute: mockGetAttribute,
  setAttribute: mockSetAttribute,
  style: { visibility: '' },
  click: mockClick,
};

// Mock document and URL
global.document = {
  createElement: mockCreateElement.mockReturnValue(mockAnchorElement),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
} as any;

global.URL = {
  createObjectURL: mockUrlCreateObjectURL,
  revokeObjectURL: mockUrlRevokeObjectURL,
} as any;

describe('exportUtils', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockUrlCreateObjectURL.mockReturnValue('mock-url');
  });

  describe('arrayToCsv', () => {
    it('converts array of objects to CSV format', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const result = arrayToCsv(data);
      
      expect(result).toBe('"name","age"\n"John","30"\n"Jane","25"');
    });

    it('handles string values with quotes correctly', () => {
      const data = [
        { text: 'He said "Hello"' }
      ];
      const result = arrayToCsv(data);
      
      expect(result).toBe('"text"\n"He said ""Hello"""');
    });

    it('handles null and undefined values', () => {
      const data = [
        { a: null, b: undefined, c: 'value' }
      ];
      const result = arrayToCsv(data);
      
      expect(result).toBe('"a","b","c"\n"""","""","value"');
    });

    it('works without headers when specified', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const result = arrayToCsv(data, { includeHeaders: false });
      
      expect(result).toBe('"John","30"\n"Jane","25"');
    });
  });

  describe('downloadCsv', () => {
    it('creates and downloads a CSV file', () => {
      const data = [
        { name: 'John', age: 30 }
      ];
      
      downloadCsv(data, { filename: 'test.csv' });
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockSetAttribute).toHaveBeenCalledWith('href', 'mock-url');
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'test.csv');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });

  describe('exportData', () => {
    it('exports data as CSV', () => {
      const data = [
        { name: 'John', age: 30 }
      ];
      
      exportData(data, 'csv', { filename: 'test.csv' });
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
    });

    it('exports data as JSON', () => {
      const data = [
        { name: 'John', age: 30 }
      ];
      
      exportData(data, 'json', { filename: 'test.json' });
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
    });

    it('throws error for unsupported format', () => {
      const data = [
        { name: 'John', age: 30 }
      ];
      
      expect(() => exportData(data, 'xml' as any)).toThrow('Unsupported export format: xml');
    });
  });

  describe('exportTransactions', () => {
    it('formats and exports transactions to CSV', () => {
      const transactions: TransactionForExport[] = [
        {
          id: '1',
          description: 'Grocery shopping',
          amount: 100000,
          category: 'Food',
          date: '2023-01-01',
          accountName: 'Checking',
          type: 'expense'
        }
      ];
      
      exportTransactions(transactions, 'transactions.csv');
      
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'transactions.csv');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportAssets', () => {
    it('formats and exports assets to CSV', () => {
      const assets: AssetForExport[] = [
        {
          id: '1',
          name: 'Apple Stock',
          type: 'stock',
          value: 1500000,
          purchaseDate: '2023-01-01',
          currentPrice: 150,
          symbol: 'AAPL'
        }
      ];
      
      exportAssets(assets, 'assets.csv');
      
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'assets.csv');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportBudgets', () => {
    it('formats and exports budgets to CSV', () => {
      const budgets: BudgetForExport[] = [
        {
          id: '1',
          name: 'Food',
          allocated: 2000000,
          spent: 1500000,
          remaining: 500000,
          percentage: 75
        }
      ];
      
      exportBudgets(budgets, 'budgets.csv');
      
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'budgets.csv');
      expect(mockClick).toHaveBeenCalled();
    });
  });
});