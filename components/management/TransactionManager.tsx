import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Transaction, Category, Account } from '../../types';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchAccounts } from '../../store/slices/accountSlice';
import { createTransaction, updateTransactionData, removeTransaction } from '../../store/slices/transactionSlice';
import { fetchSpendingSources, updateBalance } from '../../store/slices/spendingSourceSlice';
import { deductSpendingFromBalance } from '../../store/slices/availableBalanceSlice';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import ConfirmModal from '../ui/ConfirmModal';
import NotificationModal from '../ui/NotificationModal';
import { formatCurrency } from '../../utils/formatters';
import { formatDate } from '../../utils/dateHelpers';

interface TransactionManagerProps {
  transactions: Transaction[];
  categories: Category[];
  onDataChange: () => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ transactions, categories, onDataChange }) => {
  // Redux selectors
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const { accounts, loading: accountsLoading } = useAppSelector(state => state.account);
  const { spendingSources, loading: spendingSourcesLoading, error: spendingSourcesError } = useAppSelector(state => state.spendingSource);
  
  // Debug logging
  console.log('TransactionManager - spendingSources:', spendingSources);
  console.log('TransactionManager - spendingSourcesLoading:', spendingSourcesLoading);
  console.log('TransactionManager - spendingSourcesError:', spendingSourcesError);
  
  // Local state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories.length > 0 ? categories[0].name : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [paidBy, setPaidBy] = useState(profile?.uid || '');
  const [selectedEnvelope, setSelectedEnvelope] = useState('');
  const [selectedSpendingSource, setSelectedSpendingSource] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, transactionId: string, transactionName: string}>({isOpen: false, transactionId: '', transactionName: ''});
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationModal, setNotificationModal] = useState<{isOpen: boolean, type: 'success' | 'error', title: string, message: string}>({isOpen: false, type: 'success', title: '', message: ''});
  
  // Edit states
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Get default account (first account)
  const defaultAccount = accounts.length > 0 ? accounts[0] : null;

  React.useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.name === category)) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  React.useEffect(() => {
      if(profile?.uid) {
          setPaidBy(profile.uid);
      }
  }, [profile]);

  // Load accounts and spending sources using Redux
  useEffect(() => {
    if (profile?.uid && accounts.length === 0 && !accountsLoading) {
      dispatch(fetchAccounts(profile.uid));
    }
    if (profile?.uid) {
      console.log('Loading spending sources for user:', profile.uid);
      console.log('Current spending sources:', spendingSources);
      dispatch(fetchSpendingSources(profile.uid));
    }
  }, [profile?.uid, accounts.length, accountsLoading, dispatch]);

  // Set first envelope when account is loaded
  useEffect(() => {
    if (defaultAccount && !selectedEnvelope) {
      const envelopeNames = Object.keys(defaultAccount.envelopes || {});
      if (envelopeNames.length > 0) {
        setSelectedEnvelope(envelopeNames[0]);
      }
    }
  }, [defaultAccount, selectedEnvelope]);

  // Filter transactions by selected month
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
      const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      return transactionMonth === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // Calculate total spending for selected month
  const monthlyTotal = React.useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  // Get available months from transactions
  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    // Add current month even if no transactions
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    
    transactions.forEach(t => {
      const transactionDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
      const month = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);
  
  // Calculate category breakdown for selected month
  const categoryBreakdown = React.useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 categories
  }, [filteredTransactions]);

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !description || !amount || !date || !category) {
        toast.error('Vui lòng điền đầy đủ thông tin và chọn một danh mục.');
        return;
    }
    
    if (!selectedSpendingSource) {
        toast.error('Vui lòng chọn nguồn tiền để trừ chi tiêu.');
        return;
    }
    
    if (!defaultAccount) {
        toast.error('Không tìm thấy tài khoản. Vui lòng tạo tài khoản trước.');
        return;
    }
    
    if (!selectedEnvelope) {
        toast.error('Vui lòng chọn ngân sách.');
        return;
    }
    
    setIsSubmitting(true);
    
    const amountValue = parseFloat(amount);
    
    const selectedSource = spendingSources.find(source => source.id === selectedSpendingSource);
    
    const newTransaction: Omit<Transaction, 'id'> = {
      description: `${description}${selectedSource ? ` - Nguồn: ${selectedSource.name}` : ''}`,
      amount: amountValue,
      originalAmount: amountValue,
      originalCurrency: 'VND',
      exchangeRate: 1,
      category,
      envelope: selectedEnvelope || '',
      accountId: defaultAccount.id,
      spendingSourceId: selectedSpendingSource, // Save spending source ID for refund on delete
      date: Timestamp.fromDate(new Date(date)),
      type: isShared && profile.coupleId ? 'shared' : 'private',
      ownerId: profile.uid,
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
      ...(isShared && profile.coupleId && { paidBy }),
    };

    try {
      const transactionResult = await dispatch(createTransaction(newTransaction)).unwrap();
      
      // Update spending source balance (subtract money)
      await dispatch(updateBalance({
        spendingSourceId: selectedSpendingSource,
        amount: amountValue,
        operation: 'subtract',
        description: `Chi tiêu: ${description}`
      }));
      
      // Update available balance
      await dispatch(deductSpendingFromBalance({
        userId: profile.uid,
        amount: amountValue,
        description: `Chi tiêu: ${description}${selectedSource ? ` - Nguồn: ${selectedSource.name}` : ''}`,
        sourceId: transactionResult?.id || `spending-${Date.now()}`,
        coupleId: profile.coupleId
      }));
      
      // Show success notification
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công!',
        message: `Đã thêm chi tiêu "${description}" với số tiền ${formatCurrency(amountValue)} từ ${selectedSource?.name || 'nguồn đã chọn'}.`
      });
      
      setDescription('');
      setAmount('');
      if (categories.length > 0) setCategory(categories[0].name);
      setDate(new Date().toISOString().split('T')[0]);
      setIsShared(false);
      setSelectedSpendingSource('');
      onDataChange();
    } catch (error: any) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi thêm chi tiêu!',
        message: error || 'Không thể thêm chi tiêu. Vui lòng kiểm tra lại thông tin.'
      });
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, description: string) => {
    setDeleteModal({
      isOpen: true,
      transactionId: id,
      transactionName: description
    });
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditing(true);
    const transactionDate = (transaction.date as any)?.toDate ? (transaction.date as any).toDate() : new Date(transaction.date);
    setDescription(transaction.description);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setDate(transactionDate.toISOString().split('T')[0]);
    setSelectedEnvelope(transaction.envelope);
    setIsShared(transaction.type === 'shared');
    if (transaction.paidBy) setPaidBy(transaction.paidBy);
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setIsEditing(false);
    setDescription('');
    setAmount('');
    if (categories.length > 0) setCategory(categories[0].name);
    setDate(new Date().toISOString().split('T')[0]);
    setIsShared(false);
    setSelectedSpendingSource('');
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingTransaction || !description || !amount || !date || !category) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    
    setIsSubmitting(true);
    const amountValue = parseFloat(amount);
    
    const updates: Partial<Transaction> = {
      description,
      amount: amountValue,
      originalAmount: amountValue,
      category,
      envelope: selectedEnvelope || '',
      date: Timestamp.fromDate(new Date(date)),
      type: isShared && profile.coupleId ? 'shared' : 'private',
      ...(isShared && profile.coupleId && { paidBy }),
    };

    try {
      await dispatch(updateTransactionData({ id: editingTransaction.id, updates })).unwrap();
      
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Cập nhật thành công!',
        message: `Đã cập nhật giao dịch "${description}".`
      });
      
      handleCancelEdit();
      onDataChange();
    } catch (error: any) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi cập nhật!',
        message: error || 'Không thể cập nhật giao dịch. Vui lòng thử lại.'
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!profile || !deleteModal.transactionId) return;
    
    setIsDeleting(true);
    try {
      // Find the transaction to get spending source info before deleting
      const transactionToDelete = transactions.find(t => t.id === deleteModal.transactionId);
      
      // Delete the transaction
      await dispatch(removeTransaction({ transactionId: deleteModal.transactionId, userId: profile.uid })).unwrap();
      
      // Refund money to spending source if it was tracked
      if (transactionToDelete?.spendingSourceId && transactionToDelete?.amount) {
        try {
          await dispatch(updateBalance({
            spendingSourceId: transactionToDelete.spendingSourceId,
            amount: transactionToDelete.amount,
            operation: 'add', // Add money back (refund)
            description: `Hoàn tiền từ giao dịch đã xóa: ${deleteModal.transactionName}`
          }));
        } catch (balanceError) {
          console.warn('Failed to refund to spending source:', balanceError);
          // Don't fail the whole operation if refund fails
        }
      }
      
      setDeleteModal({isOpen: false, transactionId: '', transactionName: ''});
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Xóa thành công!',
        message: `Đã xóa giao dịch "${deleteModal.transactionName}" và hoàn lại số tiền vào nguồn chi tiêu.`
      });
      
      onDataChange();
    } catch (error: any) {
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi xóa giao dịch!',
        message: error || 'Không thể xóa giao dịch. Vui lòng thử lại.'
      });
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Sửa chi tiêu' : 'Thêm chi tiêu mới'}</h2>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              <i className="fas fa-times mr-1"></i>Hủy
            </button>
          )}
        </div>
        <form onSubmit={isEditing ? handleUpdateTransaction : handleSubmit} className="space-y-4">
          <div className="animate-fade-in animate-stagger-1">
            <label className="block text-sm font-medium text-slate-700">Mô tả</label>
            <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="animate-fade-in animate-stagger-2">
            <label className="block text-sm font-medium text-slate-700">Số tiền (VND)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" step="1" />
          </div>
          <div className="animate-fade-in animate-stagger-3">
            <label className="block text-sm font-medium text-slate-700">Danh mục</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </Select>
          </div>
          
          
          <div className="animate-fade-in animate-stagger-4">
            <label className="block text-sm font-medium text-slate-700">Nguồn tiền để trừ <span className="text-red-500">*</span></label>
            {console.log('Rendering spending sources:', spendingSources)}
            <Select 
              value={selectedSpendingSource} 
              onChange={(e) => setSelectedSpendingSource(e.target.value)} 
              required
              disabled={spendingSourcesLoading}
            >
              <option value="">
                {spendingSourcesLoading ? "— Đang tải... —" : "— Chọn nguồn tiền —"}
              </option>
              {spendingSources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name} ({formatCurrency(source.balance)})
                </option>
              ))}
            </Select>
            {spendingSourcesError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  Lỗi tải nguồn chi tiêu: {spendingSourcesError}
                </p>
                <button 
                  type="button"
                  onClick={() => profile?.uid && dispatch(fetchSpendingSources(profile.uid))}
                  className="mt-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                >
                  🔄 Thử lại
                </button>
              </div>
            )}
            {!spendingSourcesError && spendingSources.length === 0 && !spendingSourcesLoading && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Chưa có nguồn chi tiêu nào. 
                  <a href="/spending-sources" className="underline ml-1">Tạo nguồn đầu tiên</a>
                </p>
              </div>
            )}
          </div>
          
          {defaultAccount && (() => {
            const envelopes = defaultAccount.envelopes || {};
            const envelopeNames = Object.keys(envelopes);
            
            return envelopeNames.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">Ngân sách</label>
                <Select value={selectedEnvelope} onChange={(e) => setSelectedEnvelope(e.target.value)}>
                  <option value="">-- Chọn ngân sách --</option>
                  {envelopeNames.map(envName => {
                    const envelope = envelopes[envName];
                    const remaining = envelope.allocated - envelope.spent;
                    return (
                      <option key={envName} value={envName}>
                        {envName} (Còn: {formatCurrency(remaining)})
                      </option>
                    );
                  })}
                </Select>
                {selectedEnvelope && envelopes[selectedEnvelope] && (
                  <div className="mt-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Đã phân bổ:</span>
                      <span>{formatCurrency(envelopes[selectedEnvelope].allocated)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Đã chi:</span>
                      <span>{formatCurrency(envelopes[selectedEnvelope].spent)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Còn lại:</span>
                      <span className={`${envelopes[selectedEnvelope].allocated - envelopes[selectedEnvelope].spent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(envelopes[selectedEnvelope].allocated - envelopes[selectedEnvelope].spent)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Chưa có ngân sách nào. 
                  <a href="/envelopes" className="underline ml-1">Tạo ngân sách đầu tiên</a>
                </p>
              </div>
            );
          })()}
          
           <div>
            <label className="block text-sm font-medium text-slate-700">Ngày</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          {profile?.coupleId && (
            <div className="space-y-3 pt-2">
                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input id="isShared" type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="isShared" className="font-medium text-slate-900">Chi tiêu chung</label>
                    </div>
                </div>
                {isShared && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Người trả</label>
                        <Select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                            <option value={profile.uid}>{profile.name} (Tôi)</option>
                            <option value={profile.partnerId!}>{profile.partnerName}</option>
                        </Select>
                    </div>
                )}
            </div>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting || categories.length === 0 || !defaultAccount || !selectedEnvelope || (!isEditing && (!selectedSpendingSource || spendingSources.length === 0))} 
            className="w-full"
          >
            {isSubmitting ? (isEditing ? 'Đang cập nhật...' : 'Đang thêm...') : (isEditing ? 'Cập nhật chi tiêu' : 'Thêm chi tiêu')}
          </Button>
        </form>
      </Card>
      <Card className="lg:col-span-2">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Các chi tiêu gần đây</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Lọc theo tháng:</label>
              <Select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          {/* Monthly Summary */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Tổng chi tiêu {formatMonth(selectedMonth)}</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(monthlyTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Số giao dịch</p>
                <p className="text-2xl font-semibold text-slate-800">{filteredTransactions.length}</p>
              </div>
            </div>
            
            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="pt-4 border-t border-red-200">
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Top danh mục chi tiêu</p>
                <div className="space-y-2">
                  {categoryBreakdown.map(([category, amount]) => {
                    const percentage = monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0;
                    return (
                      <div key={category} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{category}</span>
                            <span className="text-slate-600">{formatCurrency(amount)} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-red-100 rounded-full h-1.5">
                            <div 
                              className="bg-red-500 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ngày</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mô tả</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Danh mục</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTransactions.map(t => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {t.type === 'shared' && <i className="fas fa-user-friends text-slate-400" title="Chi tiêu chung"></i>}
                      <span>{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-right">-{formatCurrency(t.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {t.ownerId === profile?.uid && (
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleEditClick(t)} 
                          className="text-blue-600 hover:text-blue-900 transition-colors duration-200 hover:scale-110 transform"
                          title="Sửa"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(t.id, t.description)} 
                          className="text-red-600 hover:text-red-900 transition-colors duration-200 hover:scale-110 transform"
                          title="Xóa"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
               {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    <i className="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                    <p>Không có chi tiêu nào trong {formatMonth(selectedMonth)}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({isOpen: false, transactionId: '', transactionName: ''})}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch "${deleteModal.transactionName}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal({isOpen: false, type: 'success', title: '', message: ''})}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        autoClose={notificationModal.type === 'success'}
        autoCloseDelay={3000}
      />
    </div>
  );
};

export default TransactionManager;
