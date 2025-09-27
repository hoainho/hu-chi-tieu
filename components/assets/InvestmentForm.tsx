import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { deductInvestmentFromBalance } from '../../store/slices/availableBalanceSlice';
import toast from 'react-hot-toast';
import { AssetType } from '../../types';
import { addAsset, addTransaction, getIncomes } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import ModernCard from '../ui/ModernCard';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';

interface InvestmentFormProps {
  onSuccess?: () => void;
}

const InvestmentForm: React.FC<InvestmentFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'stock' as AssetType,
    symbol: '',
    quantity: '',
    purchasePrice: '',
    exchange: '',
    description: '',
    isShared: false,
    date: new Date().toISOString().split('T')[0],
    incomeSource: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableIncomes, setAvailableIncomes] = useState<any[]>([]);

  // Fetch available incomes
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

  const calculateTotalValue = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.purchasePrice) || 0;
    return quantity * price;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSubmitting) return;

    // Validation
    if (!formData.name || !formData.symbol || !formData.quantity || !formData.purchasePrice) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (!formData.incomeSource) {
      toast.error('Vui lòng chọn nguồn thu nhập để đầu tư');
      return;
    }

    setIsSubmitting(true);
    try {
      const quantity = parseFloat(formData.quantity);
      const purchasePrice = parseFloat(formData.purchasePrice);
      const totalValue = quantity * purchasePrice;

      // Create asset
      const asset = {
        name: formData.name,
        type: formData.type,
        symbol: formData.symbol.toUpperCase(),
        quantity,
        purchasePrice,
        value: totalValue,
        date: Timestamp.fromDate(new Date(formData.date)),
        ownerType: (formData.isShared && profile.coupleId ? 'shared' : 'private') as 'shared' | 'private',
        ownerId: profile.uid,
        ...(formData.exchange && { exchange: formData.exchange }),
        ...(formData.description && { description: formData.description }),
        ...(formData.isShared && profile.coupleId && { coupleId: profile.coupleId })
      };

      await addAsset(asset);

      // Create corresponding transaction
      const selectedIncome = availableIncomes.find(i => i.id === formData.incomeSource);
      const investmentTransaction = {
        amount: -Math.abs(totalValue), // Negative for expense
        originalAmount: totalValue,
        originalCurrency: 'VND' as const,
        exchangeRate: 1,
        category: 'investment',
        envelope: 'default',
        accountId: 'default',
        description: `Đầu tư ${formData.type}: ${formData.name} (${formData.symbol}) - Từ: ${selectedIncome?.source || 'N/A'}`,
        date: Timestamp.fromDate(new Date(formData.date)),
        type: (formData.isShared && profile.coupleId ? 'shared' : 'private') as 'private' | 'shared',
        ownerId: profile.uid,
        ...(formData.isShared && profile.coupleId && { 
          coupleId: profile.coupleId,
          paidBy: profile.uid,
          isShared: true
        })
      };
      
      const transactionResult = await addTransaction(investmentTransaction);

      // Update available balance
      await dispatch(deductInvestmentFromBalance({
        userId: profile.uid,
        amount: totalValue,
        description: `Đầu tư ${formData.type}: ${formData.name} (${formData.symbol})`,
        sourceId: transactionResult?.id || `investment-${Date.now()}`,
        coupleId: profile.coupleId
      }));

      toast.success('Đầu tư và giao dịch đã được tạo thành công!');
      
      // Reset form
      setFormData({
        name: '',
        type: 'stock',
        symbol: '',
        quantity: '',
        purchasePrice: '',
        exchange: '',
        description: '',
        isShared: false,
        date: new Date().toISOString().split('T')[0],
        incomeSource: ''
      });

      onSuccess?.();
      
    } catch (error) {
      console.error('Investment creation failed:', error);
      toast.error('Tạo đầu tư thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModernCard>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          <i className="fas fa-chart-line text-blue-600 mr-2"></i>
          Thêm khoản đầu tư mới
        </h3>
        <p className="text-gray-600 text-sm">
          Tạo tài sản đầu tư và giao dịch chi tiêu tương ứng từ nguồn thu nhập
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Investment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loại đầu tư *</label>
          <Select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AssetType }))}
            className="w-full"
            required
          >
            <option value="stock">Cổ phiếu</option>
            <option value="crypto">Tiền điện tử</option>
            <option value="gold">Vàng</option>
          </Select>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tên đầu tư *</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="VD: Apple Inc, Bitcoin, Vàng SJC"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mã/Symbol *</label>
            <Input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              placeholder="VD: AAPL, BTC, SJC"
              required
            />
          </div>
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng *</label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="0"
              min="0"
              step="0.001"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giá mua (VND) *</label>
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
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-700">
              <i className="fas fa-calculator mr-2"></i>
              Tổng giá trị đầu tư: <span className="font-bold text-lg">
                {formatVietnameseCurrency(calculateTotalValue())}
              </span>
            </div>
          </div>
        )}

        {/* Income Source Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-wallet mr-2 text-green-600"></i>
            Nguồn chi tiêu (từ thu nhập nào?) *
          </label>
          <Select
            value={formData.incomeSource}
            onChange={(e) => setFormData(prev => ({ ...prev, incomeSource: e.target.value }))}
            className="w-full"
            required
          >
            <option value="">Chọn nguồn thu nhập...</option>
            {availableIncomes.map(income => (
              <option key={income.id} value={income.id}>
                {income.source} - {formatVietnameseCurrency(income.amount)}
                {income.frequency && ` (${income.frequency})`}
              </option>
            ))}
          </Select>
          <div className="text-xs text-gray-500 mt-1">
            <i className="fas fa-info-circle mr-1"></i>
            Khoản đầu tư sẽ được trừ từ nguồn thu nhập này và tạo giao dịch chi tiêu tương ứng
          </div>
        </div>

        {/* Optional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sàn giao dịch</label>
            <Input
              type="text"
              value={formData.exchange}
              onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
              placeholder="VD: NASDAQ, Binance, PNJ"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ngày đầu tư</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ghi chú về khoản đầu tư này..."
          />
        </div>

        {/* Shared Option */}
        {profile?.coupleId && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isShared"
              checked={formData.isShared}
              onChange={(e) => setFormData(prev => ({ ...prev, isShared: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isShared" className="ml-2 block text-sm text-gray-700">
              Đầu tư chung với đối tác
            </label>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !formData.name || !formData.symbol || !formData.quantity || !formData.purchasePrice || !formData.incomeSource}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Đang tạo đầu tư...
            </>
          ) : (
            <>
              <i className="fas fa-plus mr-2"></i>
              Tạo khoản đầu tư
            </>
          )}
        </Button>
      </form>
    </ModernCard>
  );
};

export default InvestmentForm;
