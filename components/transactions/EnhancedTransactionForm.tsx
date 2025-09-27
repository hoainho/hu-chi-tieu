import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchAccounts } from '../../store/slices/accountSlice';
import toast from 'react-hot-toast';
import { Transaction, SupportedCurrency, Account } from '../../types';
import { addTransaction } from '../../services/firestoreService';
import { getAccountsByUser } from '../../services/accountService';
import { Timestamp } from 'firebase/firestore';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

interface EnhancedTransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<Transaction>;
}

const EnhancedTransactionForm: React.FC<EnhancedTransactionFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const { accounts: contextAccounts } = useAppSelector(state => state.account);
  const { rates, loading: ratesLoading, error: ratesError, convertToVND } = useCurrencyRates();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [formData, setFormData] = useState({
    amount: initialData?.originalAmount?.toString() || '',
    currency: initialData?.originalCurrency || 'VND' as SupportedCurrency,
    description: initialData?.description || '',
    category: initialData?.category || '',
    envelope: initialData?.envelope || '',
    accountId: initialData?.accountId || '',
    splitType: (initialData?.isShared ? 'shared' : 'personal') as 'personal' | 'shared',
    paidBy: initialData?.paidBy || profile?.uid || '',
    date: initialData?.date ? 
      new Date(initialData.date.toMillis()).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrencyOverride, setShowCurrencyOverride] = useState(false);

  // Load user accounts
  useEffect(() => {
    const loadAccounts = async () => {
      if (!profile?.uid) return;
      
      try {
        const userAccounts = await getAccountsByUser(profile.uid);
        setAccounts(userAccounts);
        
        // Auto-select first account if none selected
        if (!formData.accountId && userAccounts.length > 0) {
          setFormData(prev => ({ ...prev, accountId: userAccounts[0].id }));
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
        toast.error('Failed to load accounts');
      } finally {
        setLoadingAccounts(false);
      }
    };
    
    loadAccounts();
  }, [profile?.uid]);

  const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
  const availableEnvelopes = selectedAccount?.envelopes || {};
  const vndAmount = convertToVND(parseFloat(formData.amount) || 0, formData.currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSubmitting) return;

    // Validation
    if (!formData.amount || !formData.description || !formData.category || !formData.envelope || !formData.accountId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Check envelope budget
    const selectedEnvelope = availableEnvelopes[formData.envelope];
    if (selectedEnvelope) {
      const remaining = selectedEnvelope.allocated - selectedEnvelope.spent;
      if (vndAmount > remaining) {
        const proceed = window.confirm(
          `This transaction (${vndAmount.toLocaleString()} VND) exceeds the remaining budget for ${formData.envelope} (${remaining.toLocaleString()} VND). Do you want to proceed?`
        );
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);
    try {
      const exchangeRate = formData.currency === 'VND' ? 1 : rates[formData.currency]?.rate || 1;
      
      const transaction: Omit<Transaction, 'id'> = {
        description: formData.description,
        amount: vndAmount,
        originalAmount: amount,
        originalCurrency: formData.currency,
        exchangeRate,
        category: formData.category,
        envelope: formData.envelope,
        date: Timestamp.fromDate(new Date(formData.date)),
        accountId: formData.accountId,
        type: formData.splitType === 'shared' ? 'shared' : 'private',
        ownerId: profile.uid,
        ...(formData.splitType === 'shared' && {
          isShared: true,
          paidBy: formData.paidBy,
          ...(profile.coupleId && { coupleId: profile.coupleId })
        })
      };

      await addTransaction(transaction);
      toast.success('Transaction added successfully!');
      
      // Reset form
      setFormData({
        amount: '',
        currency: 'VND',
        description: '',
        category: categories.length > 0 ? categories[0].name : '',
        envelope: '',
        accountId: formData.accountId, // Keep selected account
        splitType: 'personal',
        paidBy: profile.uid,
        date: new Date().toISOString().split('T')[0]
      });
      
      refreshTransactions();
      onSuccess?.();
      
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyChange = (newCurrency: SupportedCurrency) => {
    setFormData(prev => ({ ...prev, currency: newCurrency }));
  };

  if (loadingAccounts) {
    return (
      <Card>
        <div className="flex justify-center items-center p-8">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
        </div>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <div className="text-center p-8">
          <i className="fas fa-wallet text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy tài khoản</h3>
          <p className="text-gray-500 mb-4">Bạn cần tạo tài khoản trước khi thêm giao dịch.</p>
          <Button onClick={() => window.location.href = '/accounts'}>
            Tạo tài khoản
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-6">Thêm giao dịch mới</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tài khoản</label>
          <Select
            value={formData.accountId}
            onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
            required
          >
            <option value="">Chọn tài khoản</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.type === 'shared' ? 'Chia sẻ' : 'Cá nhân'})
              </option>
            ))}
          </Select>
        </div>

        {/* Amount and Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền</label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị tiền tệ</label>
            <Select
              value={formData.currency}
              onChange={(e) => handleCurrencyChange(e.target.value as SupportedCurrency)}
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
            </Select>
          </div>
        </div>

        {/* Currency Conversion Display */}
        {formData.currency !== 'VND' && !ratesLoading && formData.amount && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {formData.amount} {formData.currency} ≈ {vndAmount.toLocaleString()} VND
              </span>
              {rates[formData.currency]?.isManualOverride && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Tỷ giá thủ công
                </span>
              )}
            </div>
            {rates[formData.currency] && (
              <div className="text-xs text-blue-600 mt-1">
                Rate: 1 {formData.currency} = {rates[formData.currency].rate.toLocaleString()} VND
                <span className="ml-2">
                  ({new Date(rates[formData.currency].lastUpdated).toLocaleTimeString()})
                </span>
              </div>
            )}
          </div>
        )}

        {ratesError && formData.currency !== 'VND' && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
              <span className="text-sm text-yellow-700">
                Không có tỷ giá tiền tệ. Sử dụng tỷ giá dự phòng.
              </span>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="VD: Ăn trưa tại nhà hàng"
            required
          />
        </div>

        {/* Category and Envelope */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
            <Select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Envelope</label>
            <Select
              value={formData.envelope}
              onChange={(e) => setFormData(prev => ({ ...prev, envelope: e.target.value }))}
              required
            >
              <option value="">Chọn envelope</option>
              {Object.entries(availableEnvelopes).map(([key, envelope]) => {
                const envelopeData = envelope as { allocated: number; spent: number };
                const remaining = envelopeData.allocated - envelopeData.spent;
                const status = remaining < 0 ? '⚠️' : remaining < envelopeData.allocated * 0.1 ? '⚡' : '✅';
                return (
                  <option key={key} value={key}>
                    {status} {key} ({remaining.toLocaleString()} VND left)
                  </option>
                );
              })}
            </Select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>

        {/* Shared Transaction Options */}
        {profile?.partnerId && selectedAccount?.type === 'shared' && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                checked={formData.splitType === 'shared'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  splitType: e.target.checked ? 'shared' : 'personal'
                }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Shared expense with partner</span>
            </label>
            
            {formData.splitType === 'shared' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paid by</label>
                <Select
                  value={formData.paidBy}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidBy: e.target.value }))}
                >
                  <option value={profile.uid}>Me ({profile.name})</option>
                  <option value={profile.partnerId}>{profile.partnerName}</option>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={isSubmitting || ratesLoading}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Adding...
              </>
            ) : (
              'Add Transaction'
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
    </Card>
  );
};

export default EnhancedTransactionForm;
