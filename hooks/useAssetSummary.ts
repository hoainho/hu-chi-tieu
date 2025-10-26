import { useState, useEffect, useMemo, useCallback } from 'react';
import { Asset, MarketAsset, FixedValueAsset, getAssetValue, isMarketAsset, isFixedValueAsset } from '../types';

interface AssetSummary {
  id: string;
  name: string;
  type: string;
  originalValue: number;  // Cost basis
  currentValue: number;   // Current market value
  gainLoss: number;       // Absolute gain/loss
  gainLossPercent: number; // Percentage gain/loss
  quantity?: number;
  symbol?: string;
  marketPrice?: number;
}

interface PortfolioSummary {
  totalOriginalValue: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  assetBreakdown: AssetSummary[];
  assetTypeBreakdown: {
    [type: string]: {
      originalValue: number;
      currentValue: number;
      gainLoss: number;
      gainLossPercent: number;
    };
  };
}

export const useAssetSummary = (assets: Asset[]) => {
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const calculateSummary = useCallback(() => {
    setLoading(true);

    const assetSummaries: AssetSummary[] = assets.map(asset => {
      let originalValue = 0;
      let currentValue = 0;
      let gainLoss = 0;
      let gainLossPercent = 0;

      if (isFixedValueAsset(asset)) {
        // Fixed value assets have static value
        originalValue = asset.value;
        currentValue = asset.value;
        gainLoss = 0;
        gainLossPercent = 0;
      } else if (isMarketAsset(asset)) {
        // Market assets have cost basis and market value
        originalValue = asset.quantity * asset.purchasePrice;
        currentValue = asset.marketValue || (asset.quantity * (asset.currentPrice || asset.purchasePrice));
        gainLoss = currentValue - originalValue;
        gainLossPercent = originalValue !== 0 ? (gainLoss / originalValue) * 100 : 0;
      }

      return {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        originalValue,
        currentValue,
        gainLoss,
        gainLossPercent,
        quantity: isMarketAsset(asset) ? asset.quantity : undefined,
        symbol: isMarketAsset(asset) ? asset.symbol : undefined,
        marketPrice: isMarketAsset(asset) ? asset.currentPrice : undefined,
      };
    });

    // Calculate total values
    const totalOriginalValue = assetSummaries.reduce((sum, asset) => sum + asset.originalValue, 0);
    const totalCurrentValue = assetSummaries.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalGainLoss = totalCurrentValue - totalOriginalValue;
    const totalGainLossPercent = totalOriginalValue !== 0 ? (totalGainLoss / totalOriginalValue) * 100 : 0;

    // Calculate breakdown by asset type
    const assetTypeBreakdown: PortfolioSummary['assetTypeBreakdown'] = {};
    assets.forEach(asset => {
      const assetSummary = assetSummaries.find(s => s.id === asset.id);
      if (assetSummary) {
        const type = asset.type;
        if (!assetTypeBreakdown[type]) {
          assetTypeBreakdown[type] = {
            originalValue: 0,
            currentValue: 0,
            gainLoss: 0,
            gainLossPercent: 0
          };
        }
        
        assetTypeBreakdown[type].originalValue += assetSummary.originalValue;
        assetTypeBreakdown[type].currentValue += assetSummary.currentValue;
        assetTypeBreakdown[type].gainLoss += assetSummary.gainLoss;
      }
    });

    // Calculate percentage for each type
    Object.keys(assetTypeBreakdown).forEach(type => {
      const typeData = assetTypeBreakdown[type];
      typeData.gainLossPercent = typeData.originalValue !== 0 ? (typeData.gainLoss / typeData.originalValue) * 100 : 0;
    });

    setPortfolioSummary({
      totalOriginalValue,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
      assetBreakdown: assetSummaries,
      assetTypeBreakdown
    });

    setLoading(false);
  }, [assets]);

  useEffect(() => {
    // Calculate summary immediately when assets change
    calculateSummary();

    // Set up interval to recalculate every 15 minutes (900000 ms)
    const interval = setInterval(() => {
      calculateSummary();
    }, 15 * 60 * 1000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, [assets, calculateSummary]);

  return { portfolioSummary, loading };
};