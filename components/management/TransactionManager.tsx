import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Transaction, Category, Account } from '../../types';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchAccounts } from '../../store/slices/accountSlice';
import { createTransaction, removeTransaction } from '../../store/slices/transactionSlice';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
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
  
  // Local state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories.length > 0 ? categories[0].name : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [paidBy, setPaidBy] = useState(profile?.uid || '');
  const [selectedEnvelope, setSelectedEnvelope] = useState('');
  
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

  // Load accounts using Redux
  useEffect(() => {
    if (profile?.uid && accounts.length === 0 && !accountsLoading) {
      dispatch(fetchAccounts(profile.uid));
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !description || !amount || !date || !category) {
        toast.error('Vui lòng điền đầy đủ thông tin và chọn một danh mục.');
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
    
    const newTransaction: Omit<Transaction, 'id'> = {
      description,
      amount: amountValue,
      originalAmount: amountValue,
      originalCurrency: 'VND',
      exchangeRate: 1,
      category,
      envelope: selectedEnvelope || '',
      accountId: defaultAccount.id,
      date: Timestamp.fromDate(new Date(date)),
      type: isShared && profile.coupleId ? 'shared' : 'private',
      ownerId: profile.uid,
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
      ...(isShared && profile.coupleId && { paidBy }),
    };

    try {
      await dispatch(createTransaction(newTransaction)).unwrap();
      toast.success('Thêm chi tiêu thành công!');
      setDescription('');
      setAmount('');
      if (categories.length > 0) setCategory(categories[0].name);
      setDate(new Date().toISOString().split('T')[0]);
      setIsShared(false);
      onDataChange();
    } catch (error: any) {
      toast.error(error || 'Thêm chi tiêu thất bại.');
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) {
        try {
            await dispatch(removeTransaction({ transactionId: id, userId: profile.uid })).unwrap();
            toast.success('Xóa giao dịch thành công!');
            onDataChange();
        } catch (error: any) {
            toast.error(error || 'Xóa giao dịch thất bại.');
            console.error(error);
        }
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-4">Thêm chi tiêu mới</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Mô tả</label>
            <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Số tiền (VND)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" step="1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Danh mục</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </Select>
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
            disabled={isSubmitting || categories.length === 0 || !defaultAccount || !selectedEnvelope} 
            className="w-full"
          >
            {isSubmitting ? 'Đang thêm...' : 'Thêm chi tiêu'}
          </Button>
        </form>
      </Card>
      <Card className="lg:col-span-2">
        <h2 className="text-lg font-semibold mb-4">Các chi tiêu gần đây</h2>
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
              {transactions.map(t => (
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
                        <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-900"><i className="fas fa-trash"></i></button>
                    )}
                  </td>
                </tr>
              ))}
               {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-slate-500">Chưa có chi tiêu nào được ghi lại.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default TransactionManager;
