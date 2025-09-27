import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchAccounts, createNewAccount, updateAccountData, deleteAccount, sendInvitation, clearError } from '../../store/slices/accountSlice';
import { Account, SupportedCurrency } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { formatDate } from '../../utils/dateHelpers';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const AccountManager: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Redux selectors
  const { profile } = useAppSelector(state => state.user);
  const { accounts, loading, creating, inviting, error } = useAppSelector(state => state.account);
  
  const [showInviteForm, setShowInviteForm] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  
  // New account form
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    type: 'personal' as 'personal' | 'shared',
    currency: 'VND' as SupportedCurrency
  });
  
  // Edit account form
  const [editAccountData, setEditAccountData] = useState({
    name: '',
    balance: 0
  });
  
  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchAccounts(profile.uid));
    }
  }, [dispatch, profile?.uid]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !newAccountData.name) return;

    const ownerIds = [profile.uid];
    
    try {
      await dispatch(createNewAccount({
        name: newAccountData.name,
        type: newAccountData.type,
        ownerIds,
        currency: newAccountData.currency
      })).unwrap();
      
      toast.success(`Tài khoản "${newAccountData.name}" đã được tạo thành công!`);
      
      setNewAccountData({
        name: '',
        type: 'personal',
        currency: 'VND'
      });
    } catch (error) {
      console.error('Lỗi tạo tài khoản:', error);
    }
  };

  const handleInviteToAccount = async (accountId: string) => {
    if (!profile?.uid || !inviteEmail) return;

    if (inviteEmail === profile.email) {
      toast.error('Bạn không thể mời chính mình');
      return;
    }

    try {
      await dispatch(sendInvitation({
        accountId,
        inviterId: profile.uid,
        inviteeEmail: inviteEmail
      })).unwrap();
      
      toast.success(`Lời mời đã được gửi tới ${inviteEmail}`);
      
      setInviteEmail('');
      setShowInviteForm(null);
    } catch (error) {
      console.error('Lỗi gửi lời mời:', error);
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account.id);
    setEditAccountData({
      name: account.name,
      balance: account.balance
    });
  };

  const handleUpdateAccount = async (accountId: string) => {
    if (!profile?.uid || !editAccountData.name) return;

    try {
      await dispatch(updateAccountData({
        id: accountId,
        updates: {
          name: editAccountData.name,
          balance: editAccountData.balance
        }
      })).unwrap();
      
      toast.success('Tài khoản đã được cập nhật!');
      setEditingAccount(null);
    } catch (error) {
      console.error('Lỗi cập nhật tài khoản:', error);
      toast.error('Không thể cập nhật tài khoản');
    }
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!profile?.uid) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tài khoản "${accountName}"?\n\nHành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.`
    );

    if (!confirmed) return;

    try {
      await dispatch(deleteAccount(accountId)).unwrap();
      
      toast.success(`Tài khoản "${accountName}" đã được xóa!`);
    } catch (error) {
      console.error('Lỗi xóa tài khoản:', error);
      toast.error('Không thể xóa tài khoản');
    }
  };

  const getAccountTypeIcon = (type: 'personal' | 'shared') => {
    return type === 'shared' ? 'fas fa-users' : 'fas fa-user';
  };

  const getAccountTypeColor = (type: 'personal' | 'shared') => {
    return type === 'shared' ? 'text-blue-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Quản lý Tài khoản</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create New Account */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Tạo Tài khoản Mới</h2>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên Tài khoản
              </label>
              <Input
                type="text"
                value={newAccountData.name}
                onChange={(e) => setNewAccountData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="VD: Ngân sách cá nhân, Tài khoản gia đình"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại Tài khoản
              </label>
              <Select
                value={newAccountData.type}
                onChange={(e) => setNewAccountData(prev => ({ 
                  ...prev, 
                  type: e.target.value as 'personal' | 'shared' 
                }))}
              >
                <option value="personal">Cá nhân</option>
                <option value="shared">Chia sẻ</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {newAccountData.type === 'shared' 
                  ? 'Có thể chia sẻ với đối tác hoặc thành viên gia đình'
                  : 'Chỉ bạn mới có thể truy cập tài khoản này'
                }
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đơn vị Tiền tệ
              </label>
              <Select
                value={newAccountData.currency}
                onChange={(e) => setNewAccountData(prev => ({ 
                  ...prev, 
                  currency: e.target.value as SupportedCurrency 
                }))}
              >
                <option value="VND">VND (Việt Nam Đồng)</option>
                <option value="USD">USD (Đô la Mỹ)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="JPY">JPY (Yên Nhật)</option>
              </Select>
            </div>
            
            <Button
              type="submit"
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang tạo...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Tạo Tài khoản
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Account List */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Tài khoản của bạn</h2>
            
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-wallet text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500">Chưa có tài khoản nào được tạo.</p>
                <p className="text-sm text-gray-400">Tạo tài khoản đầu tiên để bắt đầu quản lý tài chính!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <i className={`${getAccountTypeIcon(account.type)} ${getAccountTypeColor(account.type)} text-xl`}></i>
                        <div>
                          <h3 className="font-semibold text-gray-800">{account.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">
                            Tài khoản {account.type === 'personal' ? 'Cá nhân' : 'Chia sẻ'} • {account.currency}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditAccount(account)}
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Sửa
                        </Button>
                        
                        {account.type === 'shared' && account.ownerIds.length === 1 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowInviteForm(account.id)}
                          >
                            <i className="fas fa-user-plus mr-1"></i>
                            Mời
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteAccount(account.id, account.name)}
                        >
                          <i className="fas fa-trash mr-1"></i>
                          Xóa
                        </Button>
                      </div>
                    </div>
                    
                    {/* Account Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Số dư:</span>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(account.balance)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Envelopes:</span>
                        <div className="font-semibold text-blue-600">
                          {Object.keys(account.envelopes).length}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Thành viên:</span>
                        <div className="font-semibold text-purple-600">
                          {account.ownerIds.length}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Tạo lúc:</span>
                        <div className="font-semibold text-gray-600">
                          {formatDate(account.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Envelope Summary */}
                    {Object.keys(account.envelopes).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Envelopes</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {Object.entries(account.envelopes).slice(0, 6).map(([name, envelope]) => {
                            const envelopeData = envelope as { allocated: number; spent: number };
                            const percentage = envelopeData.allocated > 0 ? (envelopeData.spent / envelopeData.allocated) * 100 : 0;
                            return (
                              <div key={name} className="flex items-center justify-between">
                                <span className="capitalize truncate">{name}</span>
                                <span className={`font-medium ${
                                  percentage >= 90 ? 'text-red-600' :
                                  percentage >= 75 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            );
                          })}
                          {Object.keys(account.envelopes).length > 6 && (
                            <div className="text-gray-500">
                              +{Object.keys(account.envelopes).length - 6} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Edit Form */}
                    {editingAccount === account.id && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                          Chỉnh sửa tài khoản
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Tên tài khoản
                            </label>
                            <Input
                              type="text"
                              value={editAccountData.name}
                              onChange={(e) => setEditAccountData(prev => ({ ...prev, name: e.target.value }))}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Số dư hiện tại
                            </label>
                            <Input
                              type="number"
                              value={editAccountData.balance}
                              onChange={(e) => setEditAccountData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateAccount(account.id)}
                              disabled={!editAccountData.name}
                            >
                              Lưu
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditingAccount(null);
                                setEditAccountData({ name: '', balance: 0 });
                              }}
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Invite Form */}
                    {showInviteForm === account.id && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Mời ai đó vào tài khoản này
                        </h4>
                        <div className="flex space-x-2">
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Nhập địa chỉ email"
                            className="flex-1 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleInviteToAccount(account.id)}
                            disabled={inviting || !inviteEmail}
                          >
                            {inviting ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              'Gửi'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setShowInviteForm(null);
                              setInviteEmail('');
                            }}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      {accounts.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Thao tác nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => window.location.href = '/envelopes'}
              className="flex items-center justify-center space-x-2"
            >
              <i className="fas fa-envelope"></i>
              <span>Quản lý Envelopes</span>
            </Button>
            
            <Button
              onClick={() => window.location.href = '/transactions'}
              className="flex items-center justify-center space-x-2"
            >
              <i className="fas fa-plus-circle"></i>
              <span>Thêm giao dịch</span>
            </Button>
            
            <Button
              onClick={() => window.location.href = '/reports'}
              className="flex items-center justify-center space-x-2"
            >
              <i className="fas fa-chart-bar"></i>
              <span>Xem báo cáo</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AccountManager;
