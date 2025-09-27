import { useState, useEffect, useCallback } from 'react';
import { useAssets } from './useAssets';
import { getVietnamStocks } from '../services/vietnamStockService';
import cryptoPriceService from '../services/cryptoPriceService';
import goldPriceService from '../services/goldPriceService';
import toast from 'react-hot-toast';

export interface MarketDataState {
  stocks: any[];
  crypto: any[];
  gold: any[];
  lastUpdate: Date | null;
  loading: boolean;
  error: string | null;
}

export const useMarketData = () => {
  const { assets, getInvestmentAssets } = useAssets();
  const [marketData, setMarketData] = useState<MarketDataState>({
    stocks: [],
    crypto: [],
    gold: [],
    lastUpdate: null,
    loading: false,
    error: null
  });

  // Load stock prices
  const loadStockPrices = useCallback(async () => {
    const stockAssets = assets.filter(asset => asset.type === 'stock');
    if (stockAssets.length === 0) return [];

    const symbols = stockAssets
      .map(asset => (asset as any).symbol)
      .filter(Boolean);

    if (symbols.length === 0) return [];

    try {
      const data = await getVietnamStocks(symbols);
      console.log(`✅ Loaded ${data.length} stock prices`);
      return data;
    } catch (error) {
      console.error('Failed to load stock prices:', error);
      throw error;
    }
  }, [assets]);

  // Load crypto prices
  const loadCryptoPrices = useCallback(async () => {
    const cryptoAssets = assets.filter(asset => asset.type === 'crypto');
    if (cryptoAssets.length === 0) return [];

    const symbols = cryptoAssets
      .map(asset => (asset as any).symbol)
      .filter(Boolean);

    if (symbols.length === 0) return [];

    try {
      const data = await cryptoPriceService.getCryptoPrices(symbols);
      console.log(`✅ Loaded ${data.length} crypto prices`);
      return data;
    } catch (error) {
      console.error('Failed to load crypto prices:', error);
      throw error;
    }
  }, [assets]);

  // Load gold prices
  const loadGoldPrices = useCallback(async () => {
    const goldAssets = assets.filter(asset => asset.type === 'gold');
    if (goldAssets.length === 0) return [];

    try {
      const data = await goldPriceService.getAllGoldPrices();
      console.log(`✅ Loaded ${data.length} gold prices`);
      return data;
    } catch (error) {
      console.error('Failed to load gold prices:', error);
      throw error;
    }
  }, [assets]);

  // Load all market data
  const loadMarketData = useCallback(async (showToast = true) => {
    if (assets.length === 0) return;

    setMarketData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [stocks, crypto, gold] = await Promise.all([
        loadStockPrices(),
        loadCryptoPrices(),
        loadGoldPrices()
      ]);

      setMarketData({
        stocks,
        crypto,
        gold,
        lastUpdate: new Date(),
        loading: false,
        error: null
      });

      if (showToast) {
        toast.success('Cập nhật giá thành công!');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Không thể cập nhật giá';
      setMarketData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (showToast) {
        toast.error(errorMessage);
      }
    }
  }, [assets, loadStockPrices, loadCryptoPrices, loadGoldPrices]);

  // Auto refresh every 30 minutes
  useEffect(() => {
    if (assets.length > 0) {
      loadMarketData(false); // Initial load without toast
    }

    const interval = setInterval(() => {
      if (assets.length > 0) {
        loadMarketData(false); // Auto refresh without toast
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [assets, loadMarketData]);

  // Calculate portfolio value with current prices
  const calculatePortfolioValue = useCallback(() => {
    const investmentAssets = getInvestmentAssets();
    let totalCost = 0;
    let totalCurrentValue = 0;

    investmentAssets.forEach(asset => {
      const marketAsset = asset as any;
      const cost = marketAsset.quantity * marketAsset.purchasePrice;
      totalCost += cost;

      let currentPrice = marketAsset.purchasePrice; // Fallback

      // Find current price from market data
      if (asset.type === 'stock') {
        const stockPrice = marketData.stocks.find(s => s.symbol === marketAsset.symbol);
        if (stockPrice) currentPrice = stockPrice.price;
      } else if (asset.type === 'crypto') {
        const cryptoPrice = marketData.crypto.find(c => c.symbol === marketAsset.symbol);
        if (cryptoPrice) currentPrice = cryptoPrice.price;
      } else if (asset.type === 'gold' && marketData.gold.length > 0) {
        const avgGoldPrice = marketData.gold.reduce((sum, gold) => sum + gold.sellPrice, 0) / marketData.gold.length;
        currentPrice = avgGoldPrice;
      }

      totalCurrentValue += marketAsset.quantity * currentPrice;
    });

    const totalPnL = totalCurrentValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    return {
      totalCost,
      totalCurrentValue,
      totalPnL,
      totalPnLPercent,
      assetCount: investmentAssets.length
    };
  }, [getInvestmentAssets, marketData]);

  return {
    marketData,
    loadMarketData,
    calculatePortfolioValue,
    refreshData: () => loadMarketData(true)
  };
};
