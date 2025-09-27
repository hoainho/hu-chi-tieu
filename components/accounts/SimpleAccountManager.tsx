import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchAccounts } from '../../store/slices/accountSlice';
import { Account, SupportedCurrency } from '../../types';
import { createAccount, getAccountsByUser } from '../../services/accountService';
import { formatCurrency } from '../../utils/formatters';
import { formatDate } from '../../utils/dateHelpers';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const SimpleAccountManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile, loading: userLoading, error: userError } = useAppSelector(state => state.user);
  const { accounts: reduxAccounts, loading: accountsLoading } = useAppSelector(state => state.account);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // New account form
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    type: 'personal' as 'personal' | 'shared',
    currency: 'VND' as SupportedCurrency
  });

  // Load accounts
  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchAccounts(profile.uid));
    }
  }, [profile?.uid, dispatch]);

  // Use Redux accounts or fallback to local state
  const displayAccounts = reduxAccounts.length > 0 ? reduxAccounts : accounts;

  const handleCreateAccount = async () => {
    if (!profile?.uid) return;
    if (!newAccountData.name.trim()) {
      toast.error('Vui lòng nhập tên tài khoản');
      return;
    }

    setCreating(true);
    try {
      const accountId = await createAccount(
        newAccountData.name,
        newAccountData.type,
        [profile.uid],
        newAccountData.currency
      );
      
      toast.success('Tạo tài khoản thành công!');
      
      // Reset form
      setNewAccountData({
        name: '',
        type: 'personal',
        currency: 'VND'
      });
      
      // Reload accounts
      dispatch(fetchAccounts(profile.uid));
      
    } catch (error: any) {
      console.error('Failed to create account:', error);
      toast.error(error.message || 'Không thể tạo tài khoản');
    } finally {
      setCreating(false);
    }
  };

  const loading = userLoading || accountsLoading || loadingAccounts;
  const error = userError;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300 border bg-red-50">
        <div className="text-center text-red-600">
          <i className="fas fa-exclamation-triangle fa-2x mb-4"></i>
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <div className="text-center text-gray-500">
          <p>Vui lòng đăng nhập để quản lý tài khoản</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Quản lý tài khoản</h1>
      
      {/* Create Account Form */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Tạo tài khoản mới</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tên tài khoản
            </label>
            <Input
              value={newAccountData.name}
              onChange={(e) => setNewAccountData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ví dụ: Tài khoản chính"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Loại tài khoản
            </label>
            <Select
              value={newAccountData.type}
              onChange={(e) => setNewAccountData(prev => ({ ...prev, type: e.target.value as 'personal' | 'shared' }))}
            >
              <option value="personal">Cá nhân</option>
              <option value="shared">Chia sẻ</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tiền tệ
            </label>
            <Select
              value={newAccountData.currency}
              onChange={(e) => setNewAccountData(prev => ({ ...prev, currency: e.target.value as SupportedCurrency }))}
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </Select>
          </div>
        </div>
        
        <div className="mt-4">
          <Button
            onClick={handleCreateAccount}
            disabled={creating || !newAccountData.name.trim()}
            className="w-full md:w-auto"
          >
            {creating ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Đang tạo...
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                Tạo tài khoản
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Accounts List */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Danh sách tài khoản</h2>
        
        {displayAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-wallet fa-3x mb-4 text-gray-300"></i>
            <p>Chưa có tài khoản nào</p>
            <p className="text-sm">Tạo tài khoản đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayAccounts.map((account) => (
              <div key={account.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{account.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    account.type === 'personal' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {account.type === 'personal' ? 'Cá nhân' : 'Chia sẻ'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số dư:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tiền tệ:</span>
                    <span className="font-medium">{account.currency}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tạo lúc:</span>
                    <span className="text-gray-600">{formatDate(account.createdAt)}</span>
                  </div>
                </div>
                
                {/* Envelopes summary */}
                {Object.keys(account.envelopes || {}).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">
                      Ngân sách: {Object.keys(account.envelopes).length}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SimpleAccountManager;
