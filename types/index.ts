import { Timestamp } from "firebase/firestore";

// Currency types
export type SupportedCurrency = 'VND' | 'USD' | 'EUR' | 'JPY';

export interface CurrencyRate {
  rate: number;
  lastUpdated: number;
  source: string;
  isManualOverride?: boolean;
}

export interface CurrencyRates {
  [currency: string]: CurrencyRate;
}

// Envelope budgeting
export interface Envelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  icon: string;
  accountId: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'personal' | 'shared';
  ownerIds: string[];
  currency: SupportedCurrency;
  balance: number;
  envelopes: Record<string, { allocated: number; spent: number }>;
  createdAt: Timestamp;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // Always in VND (base currency)
  originalAmount: number; // Original amount in original currency
  originalCurrency: SupportedCurrency;
  exchangeRate: number;
  category: string;
  envelope: string; // Envelope ID
  date: Timestamp;
  accountId: string;
  // Couple's Finance fields
  type: 'private' | 'shared';
  ownerId: string; // The user who created the transaction
  coupleId?: string;
  paidBy?: string; // The user who paid for the shared transaction
  isShared?: boolean;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  date: Timestamp;
  // Couple's Finance fields
  type: 'private' | 'shared';
  ownerId: string;
  coupleId?: string;
  spendingSourceId?: string; // Link to spending source where money goes
}

export interface SpendingSource {
  id: string;
  name: string;
  description?: string;
  balance: number; // Current balance in this source
  type: 'bank_account' | 'cash' | 'e_wallet' | 'credit_card' | 'other';
  accountNumber?: string; // For bank accounts
  // Couple's Finance fields
  ownerType: 'private' | 'shared';
  ownerId: string;
  coupleId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  ownerId: string; // User ID or Couple ID
}

export type AssetType = 'savings' | 'stock' | 'crypto' | 'gold' | 'real_estate' | 'bond' | 'other';

// Base Asset interface
export interface BaseAsset {
  id: string;
  name: string;
  type: AssetType;
  date: Timestamp;
  // Couple's Finance fields
  ownerType: 'private' | 'shared';
  ownerId: string;
  coupleId?: string;
  description?: string;
}

// Asset with fixed value (savings, real_estate, bond, other)
export interface FixedValueAsset extends BaseAsset {
  type: 'savings' | 'real_estate' | 'bond' | 'other';
  value: number; // Fixed value in VND
}

// Asset with quantity and market price (stock, crypto, gold)
export interface MarketAsset extends BaseAsset {
  type: 'stock' | 'crypto' | 'gold';
  quantity: number;          // REQUIRED: Number of shares/coins/ounces
  purchasePrice: number;     // REQUIRED: Original purchase price per unit (in VND)
  
  // Market data (updated automatically)
  currentPrice?: number;     // Current market price per unit (in VND)
  marketValue?: number;      // Current total market value (quantity * currentPrice)
  gainLoss?: number;         // Profit/Loss amount (marketValue - totalCost)
  gainLossPercent?: number;  // Profit/Loss percentage
  lastUpdated?: Timestamp;   // Last price update
  
  // Metadata
  symbol?: string;           // Stock/Crypto symbol (e.g., 'AAPL', 'BTC', 'GOLD')
  exchange?: string;         // Stock exchange or crypto exchange
  sector?: string;          // For stocks (Technology, Healthcare, etc.)
  logoUrl?: string;         // Company/Crypto logo
}

// Union type for all assets
export type Asset = FixedValueAsset | MarketAsset;

// Type guards
export const isMarketAsset = (asset: Asset): asset is MarketAsset => {
  return ['stock', 'crypto', 'gold'].includes(asset.type);
};

export const isFixedValueAsset = (asset: Asset): asset is FixedValueAsset => {
  return ['savings', 'real_estate', 'bond', 'other'].includes(asset.type);
};

// Helper functions for Asset operations
export const getAssetValue = (asset: Asset): number => {
  if (isFixedValueAsset(asset)) {
    return asset.value;
  } else {
    // For market assets, return marketValue if available, otherwise calculate from quantity * purchasePrice
    return asset.marketValue || (asset.quantity * asset.purchasePrice);
  }
};

export const getAssetQuantity = (asset: Asset): number | undefined => {
  if (isMarketAsset(asset)) {
    return asset.quantity;
  }
  return undefined;
};

export const getAssetSymbol = (asset: Asset): string | undefined => {
  if (isMarketAsset(asset)) {
    return asset.symbol;
  }
  return undefined;
};

export const createFixedValueAsset = (data: Omit<FixedValueAsset, 'id'>): Omit<FixedValueAsset, 'id'> => {
  return data;
};

export const createMarketAsset = (data: Omit<MarketAsset, 'id'>): Omit<MarketAsset, 'id'> => {
  return data;
};

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  coupleId?: string;
  partnerId?: string;
  partnerName?: string;
  accountIds: string[];
  preferences: {
    baseCurrency: SupportedCurrency;
    theme: 'light' | 'dark';
    notifications: boolean;
    language: 'vi' | 'en';
  };
  createdAt: Timestamp;
}

// Market data interfaces
export interface MarketData {
  symbol: string;
  name: string;
  currentPrice: number;      // Current price in VND
  priceChange24h: number;    // 24h price change in VND
  priceChangePercent24h: number; // 24h price change percentage
  marketCap?: number;        // Market cap in VND
  volume24h?: number;        // 24h trading volume
  high24h?: number;          // 24h high
  low24h?: number;           // 24h low
  lastUpdated: number;       // Timestamp
  logoUrl?: string;
  type: 'stock' | 'crypto';
}

export interface PortfolioSummary {
  totalValue: number;        // Total portfolio value in VND
  totalGainLoss: number;     // Total profit/loss in VND
  totalGainLossPercent: number; // Total profit/loss percentage
  dayChange: number;         // Today's change in VND
  dayChangePercent: number;  // Today's change percentage
  assetAllocation: {
    [assetType: string]: {
      value: number;
    percentage: number;
    };
  };
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Audit and security
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}

