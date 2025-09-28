import { AssetType } from '../types';

export interface AssetTypeConfig {
  icon: string;
  name: string;
  color: string;
  description: string;
}

export const ASSET_TYPE_CONFIG: Record<AssetType, AssetTypeConfig> = {
  savings: {
    icon: 'fas fa-piggy-bank',
    name: 'Tiền tiết kiệm',
    color: '#10B981',
    description: 'Tiền gửi ngân hàng, tiết kiệm'
  },
  stock: {
    icon: 'fas fa-chart-line',
    name: 'Chứng khoán',
    color: '#3B82F6',
    description: 'Cổ phiếu, chứng quyền'
  },
  crypto: {
    icon: 'fab fa-bitcoin',
    name: 'Tiền điện tử',
    color: '#F59E0B',
    description: 'Bitcoin, Ethereum, altcoins'
  },
  gold: {
    icon: 'fas fa-coins',
    name: 'Vàng',
    color: '#EAB308',
    description: 'Vàng miếng, vàng trang sức'
  },
  mutual_fund: {
    icon: 'fas fa-chart-pie',
    name: 'Chứng chỉ quỹ',
    color: '#14B8A6',
    description: 'Quỹ đầu tư, quỹ mở, quỹ ETF'
  },
  real_estate: {
    icon: 'fas fa-home',
    name: 'Bất động sản',
    color: '#8B5CF6',
    description: 'Nhà đất, căn hộ, đất nền'
  },
  bond: {
    icon: 'fas fa-certificate',
    name: 'Trái phiếu',
    color: '#6366F1',
    description: 'Trái phiếu chính phủ, doanh nghiệp'
  },
  other: {
    icon: 'fas fa-box',
    name: 'Khác',
    color: '#6B7280',
    description: 'Tài sản khác'
  }
};

export const getAssetTypeConfig = (type: AssetType): AssetTypeConfig => {
  return ASSET_TYPE_CONFIG[type] || ASSET_TYPE_CONFIG.other;
};

export const getAssetIcon = (type: AssetType): string => {
  return getAssetTypeConfig(type).icon;
};

export const getAssetTypeName = (type: AssetType): string => {
  return getAssetTypeConfig(type).name;
};

export const getAssetTypeColor = (type: AssetType): string => {
  return getAssetTypeConfig(type).color;
};

export const getAssetTypeDescription = (type: AssetType): string => {
  return getAssetTypeConfig(type).description;
};

// Helper to get all asset types for dropdowns
export const getAllAssetTypes = (): Array<{ value: AssetType; label: string; icon: string; description: string }> => {
  return Object.entries(ASSET_TYPE_CONFIG).map(([type, config]) => ({
    value: type as AssetType,
    label: config.name,
    icon: config.icon,
    description: config.description
  }));
};

// Helper to check if asset type is market-based
export const isMarketBasedAssetType = (type: AssetType): boolean => {
  return ['stock', 'crypto', 'gold', 'mutual_fund'].includes(type);
};

// Helper to check if asset type is fixed value
export const isFixedValueAssetType = (type: AssetType): boolean => {
  return ['savings', 'real_estate', 'bond', 'other'].includes(type);
};
