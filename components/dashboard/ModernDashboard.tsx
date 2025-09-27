import React, { useState, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchCurrentBalance } from '../../store/slices/availableBalanceSlice';
import { fetchUserProfile } from '../../store/slices/userSlice';
import { fetchAccounts } from '../../store/slices/accountSlice';
import { fetchTransactions } from '../../store/slices/transactionSlice';
import { fetchIncomes } from '../../store/slices/incomeSlice';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';
import { useAssets } from '../../hooks/useAssets';
import { calculateTotalBudget, getEnvelopeStatus } from '../../services/accountService';
import marketDataService from '../../services/marketDataService';
import { getVietnamStocks } from '../../services/vietnamStockService';
import goldPriceService from '../../services/goldPriceService';
import cryptoPriceService from '../../services/cryptoPriceService';
import { MarketData, PortfolioSummary as PortfolioSummaryType } from '../../types';
import ModernCard from '../ui/ModernCard';
import GlassCard from '../ui/GlassCard';
import AnimatedNumber from '../ui/AnimatedNumber';
import TrendIndicator from '../ui/TrendIndicator';
import SmartSpendingTrends from './SmartSpendingTrends';
import SpendingTrendsSummary from './SpendingTrendsSummary';
import MonthlyIncomeStats from './MonthlyIncomeStats';
import MonthlySpendingStats from './MonthlySpendingStats';
import MonthlyComparison from './MonthlyComparison';
import CategorySpendingAnalysis from './CategorySpendingAnalysis';
import YearEndSummary from './YearEndSummary';
import YearEndDebugger from '../debug/YearEndDebugger';
import PnLDisplay from '../ui/PnLDisplay';
import { formatCurrency } from '../../utils/formatters';
import { formatVietnameseCurrency, formatVietnameseNumber } from '../../utils/vietnamCurrency';
import { toDate } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const ModernDashboard: React.FC = () => {
  // Helper functions for stock and crypto names
  const getStockName = (symbol: string): string => {
    const stockNames: Record<string, string> = {
      'ACB': 'Ngân hàng ACB',
      'HPG': 'Hòa Phát Group',
    };
    return stockNames[symbol] || symbol;
  };

  const getCryptoName = (symbol: string): string => {
    const cryptoNames: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'Binance Coin',
      'SOL': 'Solana',
    };
    return cryptoNames[symbol] || symbol;
  };
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const { profile, loading: userLoading, error: userError } = useAppSelector(state => state.user);
  const { accounts, loading: accountsLoading } = useAppSelector(state => state.account);
  const { transactions, loading: transactionsLoading } = useAppSelector(state => state.transaction);
  const { incomes } = useAppSelector(state => state.income);
  const { currentBalance: availableBalance, loading: balanceLoading } = useAppSelector(state => state.availableBalance);
  const { assets } = useAssets();
  
  // Investment tracking state
  const [vietnamStocks, setVietnamStocks] = useState<any[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<any[]>([]);
  const { assets: assetsWithInvestment, getInvestmentAssets, getPortfolioSummary } = useAssets();
  const [goldPrices, setGoldPrices] = useState<any[]>([]);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  
  // Combined loading state
  const loading = userLoading || accountsLoading || transactionsLoading;
  const error = userError;
  const { rates, loading: ratesLoading, convertFromVND, convertToVND } = useCurrencyRates();
  const [selectedCurrency, setSelectedCurrency] = useState<'VND' | 'USD' | 'EUR' | 'JPY'>('VND');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummaryType | null>(null);
  const [loadingMarketData, setLoadingMarketData] = useState(false);

  // Load data when component mounts
  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchAccounts(profile.uid));
      dispatch(fetchTransactions(profile.uid));
      dispatch(fetchIncomes(profile.uid));
      dispatch(fetchCurrentBalance({ userId: profile.uid, coupleId: profile.coupleId }));
    }
  }, [profile?.uid, profile?.coupleId, dispatch]);

  // Load Vietnam stock prices
  const loadVietnamStocks = async () => {
    try {
      // Get owned stock symbols from assets
      const stockAssets = assets.filter(asset => asset.type === 'stock');
      const ownedStockSymbols = stockAssets
        .map(asset => {
          // Type assertion for market assets
          const marketAsset = asset as any;
          return marketAsset.symbol;
        })
        .filter(Boolean);
      
      // If no stock assets, skip loading
      if (ownedStockSymbols.length === 0) {
        console.log('No stock assets found, skipping stock price loading');
        setVietnamStocks([]);
        return;
      }
      
      // Use the dedicated Vietnam stock service
      const stockData = await getVietnamStocks(ownedStockSymbols);
      setVietnamStocks(stockData);
    } catch (error) {
      console.error('Failed to load Vietnam stocks:', error);
      toast.error('Không thể tải dữ liệu cổ phiếu');
    }
  };

  // Load crypto prices - REAL API ONLY
  const loadCryptoPrices = async () => {
    try {
      // Get owned crypto symbols from assets
      const cryptoAssets = assets.filter(asset => asset.type === 'crypto');
      const ownedCryptoSymbols = cryptoAssets
        .map(asset => {
          // Type assertion for market assets
          const marketAsset = asset as any;
          return marketAsset.symbol;
        })
        .filter(Boolean);
      
      // If no crypto assets, skip loading
      if (ownedCryptoSymbols.length === 0) {
        console.log('No crypto assets found, skipping crypto price loading');
        setCryptoPrices([]);
        return;
      }
      
      // Use the dedicated crypto price service - NO FALLBACK
      const cryptoData = await cryptoPriceService.getCryptoPrices(ownedCryptoSymbols);
      
      if (cryptoData.length === 0) {
        console.warn('No real crypto price data available');
        setCryptoPrices([]);
        return;
      }
      
      setCryptoPrices(cryptoData);
    } catch (error) {
      console.error('Failed to load crypto prices:', error);
      setCryptoPrices([]); // NO FALLBACK
    }
  };

  // Load gold prices - REAL API ONLY
  const loadGoldPrices = async () => {
    try {
      // Check if user has gold assets
      const goldAssets = assets.filter(asset => asset.type === 'gold');
      
      // If no gold assets, skip loading
      if (goldAssets.length === 0) {
        console.log('No gold assets found, skipping gold price loading');
        setGoldPrices([]);
        return;
      }
      
      // Use the dedicated gold price service - NO FALLBACK
      const goldData = await goldPriceService.getAllGoldPrices();
      console.log({goldData});
      
      if (goldData.length === 0) {
        console.warn('No real gold price data available');
        setGoldPrices([]);
        return;
      }
      
      // Convert to dashboard format
      const formattedGoldData = goldData.map(gold => ({
        type: gold.type,
        name: gold.type === 'SJC' ? 'Vàng SJC' : 
              gold.type === 'PNJ' ? 'Vàng PNJ' : gold.type,
        buyPrice: Number(gold.buyPrice.toFixed(2)),
        sellPrice: Number(gold.sellPrice.toFixed(2)),
        change: Number(gold.change.toFixed(2)),
        changePercent: Number(gold.changePercent.toFixed(2)),
        lastUpdated: gold.lastUpdated
      }));

      setGoldPrices(formattedGoldData);
      
    } catch (error) {
      console.error('Failed to load gold prices:', error);
      setGoldPrices([]); // NO FALLBACK
    }
  };

  // Load all investment data
  const loadInvestmentData = async () => {
    setLoadingMarketData(true);
    try {
      await Promise.all([
        loadVietnamStocks(),
        loadCryptoPrices(), 
        loadGoldPrices()
      ]);
      setLastPriceUpdate(new Date());
      toast.success('Đã cập nhật giá thành công!');
    } catch (error) {
      console.error('Failed to load investment data:', error);
      toast.error('Không thể cập nhật giá. Vui lòng thử lại!');
    } finally {
      setLoadingMarketData(false);
    }
  };

  // Load market data for user's assets
  useEffect(() => {
    const loadMarketData = async () => {
      if (!assets.length) return;

      const investmentAssets = getInvestmentAssets();

      if (investmentAssets.length === 0) return;

      setLoadingMarketData(true);
      try {
        const data = await marketDataService.getMarketData(investmentAssets);
        setMarketData(data);
        
        // Calculate portfolio summary
        const summary = marketDataService.calculatePortfolioSummary(assets, data);
        setPortfolioSummary(summary);
      } catch (error) {
        console.error('Failed to load market data:', error);
      } finally {
        setLoadingMarketData(false);
      }
    };

    loadMarketData();
    
    // Refresh market data every 5 minutes
    const interval = setInterval(loadMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [assets]);

  // Load investment data every 30 minutes
  useEffect(() => {
    if (assets.length > 0) {
      loadInvestmentData(); // Load immediately when assets are available
    }
    
    // Refresh every 30 minutes
    const interval = setInterval(() => {
      if (assets.length > 0) {
        loadInvestmentData();
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [assets]);

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    if (!accounts.length) return null;

    // Calculate total income
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    
    // Calculate total spending (negative transactions, EXCLUDING investment transactions)
    const totalSpending = transactions
      .filter(txn => txn.amount < 0 && txn.category !== 'investment')
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    
    // Calculate total investment spending (from investment transactions)
    const totalInvestmentSpending = transactions
      .filter(txn => txn.amount < 0 && txn.category === 'investment')
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
    
    // Calculate current investment value (from assets)
    const totalInvestmentValue = assets.reduce((sum, asset) => {
      if (['crypto', 'stock', 'gold'].includes(asset.type)) {
        return sum + (asset.marketValue || asset.value);
      }
      return sum;
    }, 0);
    
    // Available balance = Income - Regular Spending - Investment Spending
    // This represents "free money" not yet spent or invested
    const availableBalance = totalIncome - totalSpending - totalInvestmentSpending;

    // Account balance (for reference)
    const accountBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Calculate total budget across all accounts
    const allEnvelopes = accounts.reduce((acc, account) => {
      Object.entries(account.envelopes || {}).forEach(([name, envelope]) => {
        const envelopeData = envelope as { allocated: number; spent: number };
        if (!acc[name]) {
          acc[name] = { allocated: 0, spent: 0 };
        }
        acc[name].allocated += envelopeData.allocated;
        acc[name].spent += envelopeData.spent;
      });
      return acc;
    }, {} as Record<string, { allocated: number; spent: number }>);

    const budgetSummary = calculateTotalBudget(allEnvelopes);

    // Recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && txnDate >= thirtyDaysAgo;
    });

    const monthlySpending = recentTransactions.reduce((sum, txn) => sum + txn.amount, 0);

    // Assets breakdown
    const totalAssetValue = assets.reduce((sum, asset) => {
      if (asset.type === 'crypto' || asset.type === 'stock') {
        return sum + (asset.marketValue || asset.value);
      }
      return sum + asset.value;
    }, 0);

    return {
      totalBalance: availableBalance, // Available balance from Redux store (accumulated balance)
      accountBalance, // Actual account balance
      totalIncome,
      totalSpending, // Regular spending only
      totalInvestmentSpending, // Investment spending
      totalInvestmentValue, // Current investment value
      budgetSummary,
      monthlySpending,
      totalAssetValue,
      recentTransactions: recentTransactions.slice(0, 5),
      accountCount: accounts.length,
      assetCount: assets.length
    };
  }, [accounts, transactions, assets, incomes, availableBalance, marketData]);

  // Convert amounts to selected currency
  const convertAmount = (vndAmount: number) => {
    if (selectedCurrency === 'VND') return vndAmount;
    return convertFromVND(vndAmount, selectedCurrency);
  };

  const formatAmount = (vndAmount: number) => {
    const converted = convertAmount(vndAmount);
    return formatCurrency(converted);
  };

  // Format quantity based on asset type
  const formatQuantity = (asset: any) => {
    if (!asset.quantity) return '';
    
    const quantity = asset.quantity;
    
    // Crypto coins - show with symbol
    if (asset.type === 'crypto') {
      return `${quantity.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${asset.symbol}`;
    }
    
    // Stocks - show as CP (cổ phiếu)
    if (asset.type === 'stock') {
      return `${quantity.toLocaleString('vi-VN')} CP`;
    }
    
    // Gold - show as chỉ or cây
    if (asset.type === 'gold' || asset.symbol === 'GOLD' || asset.name?.toLowerCase().includes('vàng')) {
      if (quantity >= 10) {
        const cay = quantity / 10;
        return `${cay.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} cây`;
      } else {
        return `${quantity.toLocaleString('vi-VN')} chỉ`;
      }
    }
    
    // Default
    return `${quantity.toLocaleString('vi-VN')} đơn vị`;
  };

  // Chart data
  const portfolioChartData = useMemo(() => {
    if (!portfolioSummary) return [];
    console.log('[+] portfolioSummary: ', portfolioSummary);
    return Object.entries(portfolioSummary.assetAllocation).map(([type, data]) => {
      const allocationData = data as { value: number; percentage: number };
      return {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: allocationData.value,
        percentage: allocationData.percentage
      };
    });
  }, [portfolioSummary]);

  // Colors for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <ModernCard className="max-w-md text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Connection Error</h3>
          <p className="text-red-600">{error}</p>
        </ModernCard>
      </div>
    );
  }

  // Show loading state while auto-setup is happening
  if (!dashboardMetrics && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <ModernCard className="max-w-lg text-center" padding="lg">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-chart-line text-3xl text-white"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Đang thiết lập Dashboard...</h2>
            <p className="text-gray-500 mb-6">Chúng tôi đang chuẩn bị dữ liệu tài chính cho bạn</p>
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          </div>
        </ModernCard>
      </div>
    );
  }

  // If still no data after loading, show empty state with sample data
  if (!dashboardMetrics) {
    const emptyMetrics = {
      totalBalance: 0,
      budgetSummary: { overallPercentage: 0 },
      monthlySpending: 0,
      totalAssetValue: 0,
      recentTransactions: [],
      accountCount: 0,
      assetCount: 0
    };
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        
        <div className="relative z-10 p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Welcome to Hủ Tài Chính! 🎉
              </h1>
              <p className="text-gray-600 mt-2">Bắt đầu hành trình quản lý tài chính của bạn</p>
            </div>
          </div>

          {/* Empty State Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModernCard gradient glow>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-wallet text-xl text-white"></i>
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">0 VND</div>
                <div className="text-sm text-gray-600">Tổng số dư</div>
                <div className="text-xs text-blue-600 mt-2">Sẽ tự động cập nhật khi có dữ liệu</div>
              </div>
            </ModernCard>

            <ModernCard gradient glow>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-chart-line text-xl text-white"></i>
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">0 VND</div>
                <div className="text-sm text-gray-600">Giá trị danh mục</div>
                <div className="text-xs text-green-600 mt-2">Thêm crypto/stock để theo dõi</div>
              </div>
            </ModernCard>

            <ModernCard gradient glow>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-shopping-cart text-xl text-white"></i>
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">0 VND</div>
                <div className="text-sm text-gray-600">Tháng này</div>
                <div className="text-xs text-red-600 mt-2">Bắt đầu ghi chép chi tiêu</div>
              </div>
            </ModernCard>

            <ModernCard gradient glow>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-envelope text-xl text-white"></i>
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">0%</div>
                <div className="text-sm text-gray-600">Ngân sách đã dùng</div>
                <div className="text-xs text-purple-600 mt-2">Thiết lập ngân sách envelope</div>
              </div>
            </ModernCard>
          </div>

          {/* Quick Actions */}
          <ModernCard>
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Bắt đầu với Hủ Tài Chính</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => window.location.href = '/transactions/new'}
                className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <i className="fas fa-plus-circle text-2xl"></i>
                <span className="font-semibold">Thêm giao dịch</span>
              </button>
              
              <button 
                onClick={() => window.location.href = '/assets/new'}
                className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <i className="fas fa-chart-line text-2xl"></i>
                <span className="font-semibold">Thêm đầu tư</span>
              </button>
              
              <button 
                onClick={() => window.location.href = '/envelopes'}
                className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <i className="fas fa-envelope text-2xl"></i>
                <span className="font-semibold">Quản lý ngân sách</span>
              </button>
              
              <button 
                onClick={() => window.location.hash = '#/couple'}
                className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <i className="fas fa-user-friends text-2xl"></i>
                <span className="font-semibold">Đối tác</span>
              </button>
            </div>
          </ModernCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>
      
      <div className="relative z-10 p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Chào mừng trở lại, {profile?.name}! 👋
            </h1>
            <p className="text-gray-600 mt-2">Đây là tổng quan tài chính của bạn hôm nay</p>
          </div>
          
          {/* Currency Selector */}
          <GlassCard className="p-4">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Xem theo:</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as any)}
                className="bg-transparent border-none text-sm font-semibold text-gray-800 focus:outline-none"
                disabled={ratesLoading}
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
              {ratesLoading && <i className="fas fa-spinner fa-spin text-gray-400"></i>}
            </div>
          </GlassCard>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Balance */}
          <ModernCard gradient glow>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-wallet text-xl text-white"></i>
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedNumber 
                  value={convertAmount(dashboardMetrics.totalBalance)}
                  formatter={(val) => formatCurrency(val)}
                />
              </div>
              <div className="text-sm text-gray-600">Số dư khả dụng</div>
            </div>
          </ModernCard>

          {/* Spending Trends Summary */}
          <SpendingTrendsSummary />

          {/* Investment Value - ONLY OWNED ASSETS */}
          <ModernCard gradient glow>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-chart-pie text-xl text-white"></i>
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedNumber 
                  value={convertAmount(
                    // Calculate total investment value from OWNED assets only
                    assets.reduce((total, asset) => {
                      if (asset.type === 'stock') {
                        const stockPrice = vietnamStocks.find(s => s.symbol === asset.symbol)?.price;
                        return total + (stockPrice ? stockPrice * (asset.quantity || 0) : 0);
                      }
                      if (asset.type === 'crypto') {
                        const cryptoPrice = cryptoPrices.find(c => c.symbol === asset.symbol)?.price;
                        const vndPrice = cryptoPrice ? convertToVND(cryptoPrice, 'USD') : 0;
                        return total + (vndPrice * (asset.quantity || 0));
                      }
                      if (asset.type === 'gold') {
                        const goldPrice = goldPrices.find(g => g.type === 'PNJ')?.buyPrice || 0;
                        return total + (goldPrice * (asset.quantity || 0) / 10);
                      }
                      return total;
                    }, 0)
                  )}
                  formatter={(val) => formatCurrency(val)}
                />
              </div>
              <div className="text-sm text-gray-600">Tổng đầu tư</div>
              <div className="text-xs text-indigo-600 mt-2">
                {assets.filter(a => ['stock', 'crypto', 'gold'].includes(a.type)).length} tài sản sở hữu
              </div>
            </div>
          </ModernCard>

          {/* Budget Usage */}
          <ModernCard gradient glow>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-envelope text-xl text-white"></i>
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                <AnimatedNumber 
                  value={dashboardMetrics.budgetSummary.overallPercentage}
                  formatter={(val) => val.toFixed(1)}
                  suffix="%"
                />
              </div>
              <div className="text-sm text-gray-600">Ngân sách đã dùng</div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    dashboardMetrics.budgetSummary.overallPercentage >= 90 ? 'bg-red-500' :
                    dashboardMetrics.budgetSummary.overallPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(dashboardMetrics.budgetSummary.overallPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </ModernCard>
        </div>

        {/* Year-End Summary (shows ONLY on Jan 1st) */}
        <YearEndSummary />

        {/* Monthly Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <MonthlyIncomeStats />
          <MonthlySpendingStats />
        </div>

        {/* Monthly Comparison */}
        <div className="mb-8">
          <MonthlyComparison />
        </div>

        {/* Category Analysis & Smart Spending */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <CategorySpendingAnalysis />
          <div>
            <SmartSpendingTrends />
          </div>
        </div>

        {/* Investment Markets Overview - ONLY OWNED ASSETS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vietnam Stocks - Only show owned stocks */}
          <ModernCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <i className="fas fa-chart-line text-blue-600 mr-2"></i>
                Cổ phiếu sở hữu
              </h3>
              {loadingMarketData && (
                <div className="flex items-center text-sm text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang cập nhật...
                </div>
              )}
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {assets.filter(asset => asset.type === 'stock').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-chart-line text-4xl mb-4 opacity-50"></i>
                  <p>Chưa có cổ phiếu nào</p>
                  <p className="text-sm">Thêm cổ phiếu để theo dõi</p>
                </div>
              ) : (
                assets.filter(asset => asset.type === 'stock').map(asset => {
                  const stockPrice = vietnamStocks.find(s => s.symbol === asset.symbol);
                  const totalValue = stockPrice ? stockPrice.price * asset.quantity : 0;
                  return (
                    <div key={asset.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-800">{asset.symbol}</div>
                          <div className="text-sm text-gray-600">{asset.name}</div>
                          <div className="text-xs text-gray-500">{asset.quantity} cổ phiếu</div>
                        </div>
                        <div className="text-right">
                          {stockPrice ? (
                            <>
                              <div className="font-semibold text-gray-800">
                                {formatCurrency(stockPrice.price)}/CP
                              </div>
                              <div className="text-sm font-semibold text-blue-600">
                                Tổng: {formatCurrency(totalValue)}
                              </div>
                              <div className={`text-xs flex items-center justify-end ${
                                stockPrice.change >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                <i className={`fas ${stockPrice.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                                {stockPrice.changePercent.toFixed(2)}%
                              </div>
                            </>
                          ) : (
                            <div className="text-center">
                              <div className="text-sm text-orange-600 font-semibold">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Chưa có giá
                              </div>
                              <div className="text-xs text-gray-500">
                                Cập nhật sau 30p
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ModernCard>

          {/* Cryptocurrency */}
          <ModernCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <i className="fab fa-bitcoin text-orange-500 mr-2"></i>
                Tiền điện tử
              </h3>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cryptoPrices.slice(0, 8).map(crypto => (
                <div key={crypto.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-semibold text-gray-800">{crypto.symbol}</div>
                    <div className="text-sm text-gray-600">{crypto.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">
                      ${crypto.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatVietnameseCurrency(convertToVND(crypto.price, 'USD'))}
                    </div>
                    <div className={`text-sm flex items-center ${
                      crypto.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <i className={`fas ${crypto.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                      {crypto.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>

          {/* Gold Prices */}
          <ModernCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <i className="fas fa-coins text-yellow-500 mr-2"></i>
                Giá vàng
              </h3>
            </div>
            
            <div className="space-y-3">
              {goldPrices.map(gold => (
                <div key={gold.type} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800">{gold.name}</div>
                    <div className={`text-sm flex items-center ${
                      gold.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <i className={`fas ${gold.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                      {gold.changePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Mua: </span>
                      <span className="font-semibold text-green-600">
                        {(gold.buyPrice / 1000000).toFixed(2)}M
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bán: </span>
                      <span className="font-semibold text-red-600">
                        {(gold.sellPrice / 1000000).toFixed(2)}M
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>
        </div>

        {/* Last Update Info */}
        {lastPriceUpdate && (
          <GlassCard className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center">
                <i className="fas fa-clock mr-2"></i>
                Cập nhật lần cuối: {lastPriceUpdate.toLocaleTimeString('vi-VN')}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <i className="fas fa-sync-alt mr-2"></i>
                  Tự động cập nhật mỗi 30 phút
                </div>
                <button
                  onClick={loadInvestmentData}
                  disabled={loadingMarketData}
                  className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <i className={`fas ${loadingMarketData ? 'fa-spinner fa-spin' : 'fa-sync-alt'} mr-2`}></i>
                  {loadingMarketData ? 'Đang cập nhật...' : 'Làm mới giá'}
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Investment Assets */}
        {assets.filter(asset => asset.type === 'crypto' || asset.type === 'stock').length > 0 && (
          <ModernCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Danh mục đầu tư</h3>
              {loadingMarketData && (
                <div className="flex items-center text-sm text-gray-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang cập nhật giá...
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets
                .filter(asset => asset.type === 'crypto' || asset.type === 'stock')
                .map(asset => {
                  const market = marketData.find(m => m.symbol === asset.symbol);
                  const updatedAsset = market ? marketDataService.updateAssetWithMarketData(asset, market) : asset;
                  
                  let totalValue = 0;
                  if(asset.type === 'stock') {
                    const stockPrice = vietnamStocks.find(s => s.symbol === asset.symbol);
                    totalValue = stockPrice ? stockPrice.price * asset.quantity : 0;
                  } else {
                    totalValue = updatedAsset.marketValue || updatedAsset.value;
                  }
                  return (
                    <GlassCard key={asset.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {market?.logoUrl && (
                            <img 
                              src={market.logoUrl} 
                              alt={asset.symbol}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div className="font-semibold text-gray-800">{asset.symbol}</div>
                            <div className="text-sm text-gray-600">{asset.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">
                            {formatAmount(totalValue)}
                          </div>
                          {updatedAsset.quantity && (
                            <div className="text-sm text-gray-600">
                              {formatQuantity(updatedAsset)}
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
            </div>
          </ModernCard>
        )}

        {/* Quick Actions */}
        <ModernCard>
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => window.location.hash = '#/management'}
              className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <i className="fas fa-plus-circle text-2xl"></i>
              <span className="font-semibold">Thêm giao dịch</span>
            </button>
            
            <button 
              onClick={() => window.location.hash = '#/assets'}
              className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <i className="fas fa-chart-line text-2xl"></i>
              <span className="font-semibold">Thêm đầu tư</span>
            </button>
            
            <button 
              onClick={() => window.location.hash = '#/envelopes'}
              className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <i className="fas fa-envelope text-2xl"></i>
              <span className="font-semibold">Quản lý ngân sách</span>
            </button>
            
            <button 
              onClick={() => window.location.hash = '#/dashboard'}
              className="flex flex-col items-center space-y-3 p-6 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <i className="fas fa-chart-bar text-2xl"></i>
              <span className="font-semibold">Xem báo cáo</span>
            </button>
          </div>
        </ModernCard>

        {/* Exchange Rate Info */}
        {selectedCurrency !== 'VND' && rates[selectedCurrency] && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Tỷ giá hối đoái</h3>
                <p className="text-gray-600">
                  1 {selectedCurrency} = {formatCurrency(rates[selectedCurrency].rate)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  Updated: {new Date(rates[selectedCurrency].lastUpdated).toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-500">
                  Source: {rates[selectedCurrency].source}
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default ModernDashboard;
