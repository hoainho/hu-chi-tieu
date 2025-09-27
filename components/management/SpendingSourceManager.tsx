import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { SpendingSource } from '../../types';
import { useAppSelector, useAppDispatch } from '../../store';
import { 
  fetchSpendingSources, 
  createSpendingSource, 
  removeSpendingSource,
  updateSpendingSourceData,
  updateBalance
} from '../../store/slices/spendingSourceSlice';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { formatDate } from '../../utils/dateHelpers';

const SpendingSourceManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const { spendingSources, loading } = useAppSelector(state => state.spendingSource);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [type, setType] = useState<SpendingSource['type']>('bank_account');
  const [accountNumber, setAccountNumber] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Balance update state
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceOperation, setBalanceOperation] = useState<'add' | 'subtract'>('add');
  const [balanceDescription, setBalanceDescription] = useState('');

  // Load spending sources
  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchSpendingSources(profile.uid));
    }
  }, [profile?.uid, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name || !initialBalance) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    
    setIsSubmitting(true);
    
    const newSpendingSource: Omit<SpendingSource, 'id'> = {
      name,
      balance: parseFloat(initialBalance),
      type,
      ownerType: isShared && profile.coupleId ? 'shared' : 'private',
      ownerId: profile.uid,
      ...(description && { description }),
      ...(type === 'bank_account' && accountNumber && { accountNumber }),
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    try {
      console.log('Creating spending source:', newSpendingSource);
      const result = await dispatch(createSpendingSource(newSpendingSource)).unwrap();
      console.log('Created spending source result:', result);
      toast.success('Thêm nguồn chi tiêu thành công!');
      
      // Refresh the list to ensure sync with Firestore
      await dispatch(fetchSpendingSources(profile.uid));
      
      // Reset form
      setName('');
      setDescription('');
      setInitialBalance('');
      setType('bank_account');
      setAccountNumber('');
      setIsShared(false);
    } catch (error: any) {
      console.error('Error creating spending source:', error);
      toast.error(error || 'Thêm nguồn chi tiêu thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
    const source = spendingSources.find(s => s.id === id);
    if (window.confirm(`Bạn có chắc chắn muốn xóa nguồn "${source?.name}" không?`)) {
      try {
        await dispatch(removeSpendingSource({ spendingSourceId: id, userId: profile.uid })).unwrap();
        toast.success('Xóa nguồn chi tiêu thành công!');
        
        // Refresh the list to ensure sync with Firestore
        await dispatch(fetchSpendingSources(profile.uid));
      } catch (error: any) {
        toast.error(error || 'Xóa nguồn chi tiêu thất bại.');
      }
    }
  };

  const handleBalanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedSourceId || !balanceAmount || !balanceDescription) {
      toast.error('Vui lòng điền đầy đủ thông tin cập nhật số dư.');
      return;
    }

    try {
      await dispatch(updateBalance({
        spendingSourceId: selectedSourceId,
        amount: parseFloat(balanceAmount),
        operation: balanceOperation,
        description: balanceDescription
      })).unwrap();
      
      toast.success(`${balanceOperation === 'add' ? 'Nạp' : 'Rút'} tiền thành công!`);
      
      // Refresh the list to ensure sync with Firestore
      await dispatch(fetchSpendingSources(profile.uid));
      
      // Reset balance form
      setSelectedSourceId('');
      setBalanceAmount('');
      setBalanceDescription('');
    } catch (error: any) {
      toast.error(error || 'Cập nhật số dư thất bại.');
    }
  };

  const getTypeLabel = (type: SpendingSource['type']) => {
    switch (type) {
      case 'bank_account': return 'Tài khoản ngân hàng';
      case 'cash': return 'Tiền mặt';
      case 'e_wallet': return 'Ví điện tử';
      case 'credit_card': return 'Thẻ tín dụng';
      case 'other': return 'Khác';
      default: return type;
    }
  };

  const getTypeIcon = (type: SpendingSource['type']) => {
    switch (type) {
      case 'bank_account': return 'fas fa-university';
      case 'cash': return 'fas fa-money-bill-wave';
      case 'e_wallet': return 'fas fa-mobile-alt';
      case 'credit_card': return 'fas fa-credit-card';
      case 'other': return 'fas fa-wallet';
      default: return 'fas fa-wallet';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Quản lý Nguồn Chi Tiêu</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Spending Source */}
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Thêm nguồn mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tên nguồn</label>
              <Input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="VD: Tài khoản Vietcombank, Ví MoMo"
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">Loại nguồn</label>
              <Select value={type} onChange={(e) => setType(e.target.value as SpendingSource['type'])}>
                <option value="bank_account">Tài khoản ngân hàng</option>
                <option value="cash">Tiền mặt</option>
                <option value="e_wallet">Ví điện tử</option>
                <option value="credit_card">Thẻ tín dụng</option>
                <option value="other">Khác</option>
              </Select>
            </div>

            {type === 'bank_account' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Số tài khoản (tùy chọn)</label>
                <Input 
                  type="text" 
                  value={accountNumber} 
                  onChange={(e) => setAccountNumber(e.target.value)} 
                  placeholder="VD: ****1234"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700">Số dư ban đầu (VND)</label>
              <Input 
                type="number" 
                value={initialBalance} 
                onChange={(e) => setInitialBalance(e.target.value)} 
                placeholder="0"
                required 
                min="0" 
                step="1" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">Mô tả (tùy chọn)</label>
              <Input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Mô tả thêm về nguồn này"
              />
            </div>

            {profile?.coupleId && (
              <div className="relative flex items-start pt-2">
                <div className="flex h-6 items-center">
                  <input 
                    id="isSharedSource" 
                    type="checkbox" 
                    checked={isShared} 
                    onChange={e => setIsShared(e.target.checked)} 
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" 
                  />
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label htmlFor="isSharedSource" className="font-medium text-slate-900">Nguồn chung</label>
                </div>
              </div>
            )}
            
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Đang thêm...' : 'Thêm nguồn'}
            </Button>
          </form>
        </Card>

        {/* Spending Sources List */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Danh sách nguồn chi tiêu</h2>
          
          {spendingSources.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <i className="fas fa-wallet text-4xl mb-4"></i>
              <p>Chưa có nguồn chi tiêu nào được tạo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spendingSources.map(source => (
                <div key={source.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        source.balance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        <i className={getTypeIcon(source.type)}></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 flex items-center gap-2">
                          {source.name}
                          {source.ownerType === 'shared' && (
                            <i className="fas fa-user-friends text-slate-400 text-sm" title="Nguồn chung"></i>
                          )}
                        </h3>
                        <p className="text-sm text-slate-500">{getTypeLabel(source.type)}</p>
                        {source.accountNumber && (
                          <p className="text-xs text-slate-400">Số TK: {source.accountNumber}</p>
                        )}
                      </div>
                    </div>
                    
                    {source.ownerId === profile?.uid && (
                      <button 
                        onClick={() => handleDelete(source.id)} 
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Xóa nguồn"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Số dư:</span>
                      <span className={`font-semibold ${
                        source.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(source.balance)}
                      </span>
                    </div>
                    
                    {source.description && (
                      <p className="text-xs text-slate-500 italic">{source.description}</p>
                    )}
                    
                    <div className="text-xs text-slate-400">
                      Cập nhật: {formatDate(source.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Balance Update Section */}
      {spendingSources.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Cập nhật số dư</h2>
          <form onSubmit={handleBalanceUpdate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nguồn</label>
              <Select 
                value={selectedSourceId} 
                onChange={(e) => setSelectedSourceId(e.target.value)}
                required
              >
                <option value="">Chọn nguồn</option>
                {spendingSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({formatCurrency(source.balance)})
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Thao tác</label>
              <Select 
                value={balanceOperation} 
                onChange={(e) => setBalanceOperation(e.target.value as 'add' | 'subtract')}
              >
                <option value="add">Nạp tiền</option>
                <option value="subtract">Rút tiền</option>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền</label>
              <Input 
                type="number" 
                value={balanceAmount} 
                onChange={(e) => setBalanceAmount(e.target.value)} 
                placeholder="0"
                required 
                min="0" 
                step="1" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mô tả</label>
              <Input 
                type="text" 
                value={balanceDescription} 
                onChange={(e) => setBalanceDescription(e.target.value)} 
                placeholder="VD: Nạp từ lương"
                required 
              />
            </div>
            
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                {balanceOperation === 'add' ? 'Nạp tiền' : 'Rút tiền'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default SpendingSourceManager;
