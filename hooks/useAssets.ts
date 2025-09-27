/**
 * Custom hook for managing assets data
 * Shared between AssetsPage and ModernDashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store';
import { Asset } from '../types';
import { getAssets } from '../services/firestoreService';
import { calculatePnL } from '../utils/vietnamCurrency';
import toast from 'react-hot-toast';

export const useAssets = () => {
  const { profile } = useAppSelector(state => state.user);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load assets from Firestore
  const refreshAssets = useCallback(async () => {
    if (!profile?.uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userAssets = await getAssets(profile.uid);
      setAssets(userAssets);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Không thể tải danh sách tài sản');
    } finally {
      setLoading(false);
    }
  }, [profile?.uid]);

  // Load assets when component mounts or profile changes
  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  // Filter assets by type
  const getAssetsByType = (type: string) => {
    return assets.filter(asset => asset.type === type);
  };

  // Get investment assets (stocks, crypto, gold)
  const getInvestmentAssets = () => {
    return assets.filter(asset => 
      ['stock', 'crypto', 'gold'].includes(asset.type)
    );
  };

  // Calculate total asset value
  const getTotalAssetValue = () => {
    return assets.reduce((total, asset) => {
      if (asset.type === 'savings' || asset.type === 'real_estate' || asset.type === 'bond' || asset.type === 'other') {
        return total + (asset as any).value;
      } else {
        // For market assets, use quantity * purchasePrice as fallback
        const marketAsset = asset as any;
        return total + (marketAsset.quantity * marketAsset.purchasePrice);
      }
    }, 0);
  };

  // Calculate P&L for investment assets with current prices
  const calculateAssetPnL = (
    asset: Asset, 
    currentPrice: number
  ) => {
    if (!['stock', 'crypto', 'gold'].includes(asset.type)) {
      return null;
    }
    
    const marketAsset = asset as any;
    return calculatePnL(
      marketAsset.quantity,
      marketAsset.purchasePrice,
      currentPrice
    );
  };

  // Get portfolio summary with P&L
  const getPortfolioSummary = (marketPrices: Record<string, number> = {}) => {
    const investmentAssets = getInvestmentAssets();
    let totalCost = 0;
    let totalCurrentValue = 0;
    let totalPnL = 0;
    
    const assetDetails = investmentAssets.map(asset => {
      const marketAsset = asset as any;
      const symbol = marketAsset.symbol;
      const currentPrice = marketPrices[symbol] || marketAsset.purchasePrice; // Fallback to purchase price
      
      const pnlData = calculateAssetPnL(asset, currentPrice);
      if (pnlData) {
        totalCost += pnlData.totalCost;
        totalCurrentValue += pnlData.currentValue;
        totalPnL += pnlData.pnl;
        
        return {
          ...asset,
          currentPrice,
          ...pnlData
        };
      }
      return asset;
    });
    
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    
    return {
      totalCost,
      totalCurrentValue,
      totalPnL,
      totalPnLPercent,
      assetDetails,
      investmentCount: investmentAssets.length
    };
  };

  return {
    assets,
    loading,
    error,
    refreshAssets,
    getAssetsByType,
    getInvestmentAssets,
    getTotalAssetValue,
    calculateAssetPnL,
    getPortfolioSummary
  };
};
