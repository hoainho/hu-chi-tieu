import React, { useState } from 'react';
import { useAppSelector } from '../../store';
import { useEffect } from 'react';
import { getIncomes } from '../../services/firestoreService';
import toast from 'react-hot-toast';
import { Asset, AssetType } from '../../types';
import { addAsset, addTransaction } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import marketDataService from '../../services/marketDataService';
import ModernCard from '../ui/ModernCard';
import GlassCard from '../ui/GlassCard';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

interface EnhancedAssetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<Asset>;
}

const EnhancedAssetForm: React.FC = () => {
  const { profile } = useAppSelector(state => state.user);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'savings' as AssetType,
    value: '',
    symbol: '',
    quantity: '',
    purchasePrice: '',
    exchange: '',
    sector: '',
    description: '',
    isShared: false,
    date: new Date().toISOString().split('T')[0],
    incomeSource: '' // New field for income source
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marketPreview, setMarketPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [availableIncomes, setAvailableIncomes] = useState<any[]>([]);

  // Fetch available incomes for investment source selection
  useEffect(() => {
    const fetchIncomes = async () => {
      if (profile?.uid) {
        try {
          const incomes = await getIncomes(profile.uid, profile.coupleId);
          setAvailableIncomes(incomes);
        } catch (error) {
          console.error('Failed to fetch incomes:', error);
        }
      }
    };
    
    fetchIncomes();
  }, [profile?.uid, profile?.coupleId]);

  // Asset type configurations
  const assetTypeConfig = {
    savings: {
      icon: 'fas fa-piggy-bank',
      color: 'from-green-500 to-green-600',
      fields: ['name', 'value', 'description']
    },
    stock: {
      icon: 'fas fa-chart-line',
      color: 'from-blue-500 to-blue-600',
      fields: ['name', 'symbol', 'quantity', 'purchasePrice', 'exchange', 'sector', 'description']
    },
    crypto: {
      icon: 'fab fa-bitcoin',
      color: 'from-orange-500 to-orange-600',
      fields: ['name', 'symbol', 'quantity', 'purchasePrice', 'exchange', 'description']
    },
    gold: {
      icon: 'fas fa-coins',
      color: 'from-yellow-500 to-yellow-600',
      fields: ['name', 'value', 'quantity', 'description']
    },
    real_estate: {
      icon: 'fas fa-home',
      color: 'from-purple-500 to-purple-600',
      fields: ['name', 'value', 'description']
    },
    bond: {
      icon: 'fas fa-certificate',
      color: 'from-indigo-500 to-indigo-600',
      fields: ['name', 'value', 'description']
    },
    other: {
      icon: 'fas fa-box',
      color: 'from-gray-500 to-gray-600',
      fields: ['name', 'value', 'description']
    }
  };

  // Popular symbols for quick selection
  const popularStocks = [
     'HPG', 'ACB'
  ];

  const popularCryptos = [
    'BTC', 'ETH', 'BNB', 'SOL'
  ];

  // Load market preview when symbol changes
  const handleSymbolChange = async (symbol: string) => {
    setFormData(prev => ({ ...prev, symbol }));
    
    if (!symbol || (formData.type !== 'stock' && formData.type !== 'crypto')) return;

    setLoadingPreview(true);
    try {
      const mockAsset: Asset = {
        id: 'preview',
        name: formData.name || symbol,
        type: formData.type,
        value: 0,
        date: Timestamp.now(),
        ownerType: 'private',
        ownerId: profile?.uid || '',
        symbol
      };

      const marketData = await marketDataService.getMarketData([mockAsset]);
      if (marketData.length > 0) {
        setMarketPreview(marketData[0]);
        
        // Auto-fill name if empty
        if (!formData.name) {
          setFormData(prev => ({ ...prev, name: marketData[0].name }));
        }
      }
    } catch (error) {
      console.error('Failed to load market preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const calculateTotalValue = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.purchasePrice) || 0;
    return quantity * price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSubmitting) return;

    // Validation
    if (!formData.name || !formData.type) {
      toast.error('Please fill in all required fields');
      return;
    }

    const config = assetTypeConfig[formData.type];
    const requiredFields = config.fields;

    // Check required fields based on asset type
    if (formData.type === 'stock' || formData.type === 'crypto' || formData.type === 'gold') {
      if (!formData.symbol || !formData.quantity || !formData.purchasePrice) {
        toast.error('Please fill in symbol, quantity, and purchase price for investments');
        return;
      }
      if (!formData.incomeSource) {
        toast.error('Please select an income source for this investment');
        return;
      }
    } else if (!formData.value) {
      toast.error('Please enter the asset value');
      return;
    }

    setIsSubmitting(true);
    try {
      const quantity = parseFloat(formData.quantity) || undefined;
      const purchasePrice = parseFloat(formData.purchasePrice) || undefined;
      const value = formData.type === 'stock' || formData.type === 'crypto' 
        ? calculateTotalValue() 
        : parseFloat(formData.value);

      const asset: Omit<Asset, 'id'> = {
        name: formData.name,
        type: formData.type,
        value,
        date: Timestamp.fromDate(new Date(formData.date)),
        ownerType: formData.isShared && profile.coupleId ? 'shared' : 'private',
        ownerId: profile.uid,
        ...(formData.isShared && profile.coupleId && { coupleId: profile.coupleId }),
        
        // Investment-specific fields
        ...(formData.symbol && { symbol: formData.symbol.toUpperCase() }),
        ...(quantity && { quantity }),
        ...(purchasePrice && { purchasePrice }),
        ...(formData.exchange && { exchange: formData.exchange }),
        ...(formData.sector && { sector: formData.sector }),
        ...(formData.description && { description: formData.description })
      };

      await addAsset(asset);
      
      // Create corresponding transaction for investment assets
      if (['stock', 'crypto', 'gold'].includes(formData.type)) {
        const investmentAmount = Math.abs(value);
        const investmentTransaction = {
          amount: -investmentAmount, // Negative for expense
          originalAmount: investmentAmount,
          originalCurrency: 'VND' as const,
          exchangeRate: 1,
          category: 'investment',
          envelope: 'default', // Default envelope
          accountId: 'default', // Default account
          description: `Đầu tư ${formData.type}: ${formData.name}${formData.symbol ? ` (${formData.symbol})` : ''}${formData.incomeSource ? ` - Từ: ${availableIncomes.find(i => i.id === formData.incomeSource)?.source || 'N/A'}` : ''}`,
          date: Timestamp.fromDate(new Date(formData.date)),
          type: (formData.isShared && profile.coupleId ? 'shared' : 'private') as 'private' | 'shared',
          ownerId: profile.uid,
          ...(formData.isShared && profile.coupleId && { 
            coupleId: profile.coupleId,
            paidBy: profile.uid,
            isShared: true
          })
        };
        
        await addTransaction(investmentTransaction);
      }
      
      toast.success(`${['stock', 'crypto', 'gold'].includes(formData.type) ? 'Investment and transaction' : 'Asset'} added successfully!`);
      
      // Reset form
      setFormData({
        name: '',
        type: 'savings',
        value: '',
        symbol: '',
        quantity: '',
        purchasePrice: '',
        exchange: '',
        sector: '',
        description: '',
        isShared: false,
        date: new Date().toISOString().split('T')[0],
        incomeSource: ''
      });
      setMarketPreview(null);
      
      refreshAssets();
      onSuccess?.();
      
    } catch (error) {
      console.error('Asset creation failed:', error);
      toast.error('Failed to add asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const config = assetTypeConfig[formData.type];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ModernCard gradient glow>
        <div className="flex items-center space-x-4 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center`}>
            <i className={`${config.icon} text-xl text-white`}></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Add New Asset</h2>
            <p className="text-gray-600">Track your investments and assets</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Asset Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(assetTypeConfig).map(([type, typeConfig]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, type: type as AssetType }));
                    setMarketPreview(null);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.type === type
                      ? `border-blue-500 bg-blue-50 shadow-lg`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className={`w-8 h-8 bg-gradient-to-br ${typeConfig.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                    <i className={`${typeConfig.icon} text-sm text-white`}></i>
                  </div>
                  <div className="text-xs font-medium text-gray-700 capitalize">
                    {type.replace('_', ' ')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Basic Information */}
              <GlassCard className="p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Apple Stock, Bitcoin, Emergency Fund"
                      required
                    />
                  </div>

                  {config.fields.includes('symbol') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Symbol * {loadingPreview && <i className="fas fa-spinner fa-spin ml-2"></i>}
                      </label>
                      <div className="space-y-2">
                        <Input
                          type="text"
                          value={formData.symbol}
                          onChange={(e) => handleSymbolChange(e.target.value)}
                          placeholder="e.g., AAPL, BTC"
                          required
                        />
                        
                        {/* Popular symbols */}
                        <div className="flex flex-wrap gap-2">
                          {(formData.type === 'stock' ? popularStocks : popularCryptos).slice(0, 8).map(symbol => (
                            <button
                              key={symbol}
                              type="button"
                              onClick={() => handleSymbolChange(symbol)}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                              {symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {config.fields.includes('value') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Value (VND) *</label>
                      <Input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="0"
                        min="0"
                        step="1000"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Investment Details */}
              {(formData.type === 'stock' || formData.type === 'crypto') && (
                <GlassCard className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-4">Investment Details</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                        <Input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                          placeholder="0"
                          min="0"
                          step="0.00000001"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (VND) *</label>
                        <Input
                          type="number"
                          value={formData.purchasePrice}
                          onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                          placeholder="0"
                          min="0"
                          step="1000"
                          required
                        />
                      </div>
                    </div>

                    {/* Total Value Display */}
                    {formData.quantity && formData.purchasePrice && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-700">
                          Total Investment Value: <span className="font-semibold">
                            {calculateTotalValue().toLocaleString()} VND
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Income Source Selection for Investments */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <i className="fas fa-wallet mr-2 text-green-600"></i>
                        Nguồn chi tiêu (từ thu nhập nào?)
                      </label>
                      <Select
                        value={formData.incomeSource}
                        onChange={(e) => setFormData(prev => ({ ...prev, incomeSource: e.target.value }))}
                        className="w-full"
                      >
                        <option value="">Chọn nguồn thu nhập...</option>
                        {availableIncomes.map(income => (
                          <option key={income.id} value={income.id}>
                            {income.source} - {income.amount.toLocaleString()} VND
                            {income.frequency && ` (${income.frequency})`}
                          </option>
                        ))}
                      </Select>
                      <div className="text-xs text-gray-500 mt-1">
                        Khoản đầu tư sẽ được trừ từ nguồn thu nhập này
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exchange</label>
                      <Input
                        type="text"
                        value={formData.exchange}
                        onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
                        placeholder={formData.type === 'stock' ? 'e.g., NASDAQ, HOSE' : 'e.g., Binance, Coinbase'}
                      />
                    </div>

                    {formData.type === 'stock' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sector</label>
                        <Select
                          value={formData.sector}
                          onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                        >
                          <option value="">Select sector</option>
                          <option value="Technology">Technology</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Financial">Financial</option>
                          <option value="Consumer">Consumer</option>
                          <option value="Energy">Energy</option>
                          <option value="Industrial">Industrial</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Materials">Materials</option>
                          <option value="Telecommunications">Telecommunications</option>
                        </Select>
                      </div>
                    )}
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Market Preview */}
              {marketPreview && (
                <GlassCard className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-4">Market Preview</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Price:</span>
                      <span className="font-semibold">{marketPreview.currentPrice.toLocaleString()} VND</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">24h Change:</span>
                      <span className={`font-semibold ${marketPreview.priceChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {marketPreview.priceChangePercent24h >= 0 ? '+' : ''}{marketPreview.priceChangePercent24h.toFixed(2)}%
                      </span>
                    </div>

                    {marketPreview.marketCap && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Market Cap:</span>
                        <span className="font-semibold">{(marketPreview.marketCap / 1e12).toFixed(2)}T VND</span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      Last updated: {new Date(marketPreview.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Additional Information */}
              <GlassCard className="p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Additional Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add notes about this asset..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Shared Asset Option */}
                  {profile?.partnerId && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.isShared}
                          onChange={(e) => setFormData(prev => ({ ...prev, isShared: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium">Shared asset with partner</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Both you and your partner can view and manage this asset
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Adding Asset...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Add Asset
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </ModernCard>
    </div>
  );
};

export default EnhancedAssetForm;
