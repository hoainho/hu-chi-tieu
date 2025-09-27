import React, { useState } from 'react';
import { useAccountsManager } from '../../hooks/useAccountsManager';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import AccountCard from './AccountCard';
import AccountForm from './AccountForm';
import Card from '../ui/Card';
import Button from '../ui/Button';

const EnhancedAccountManager: React.FC = () => {
  const {
    accounts,
    totalBalance,
    loading,
    creating,
    editingAccount,
    formData,
    createAccount,
    updateAccount,
    removeAccount,
    startEditing,
    cancelEditing,
    updateFormData
  } = useAccountsManager();

  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateAccount = async (data: any) => {
    const success = await createAccount(data);
    if (success) {
      setShowCreateForm(false);
    }
    return success;
  };

  const handleUpdateAccount = async (data: any) => {
    if (!editingAccount) return false;
    return await updateAccount(editingAccount, data);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Đang tải danh sách tài khoản...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý Tài khoản</h1>
          <p className="text-gray-600 mt-1">
            {accounts.length} tài khoản • Tổng số dư: {formatVietnameseCurrency(totalBalance)}
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={creating}
        >
          <i className="fas fa-plus mr-2"></i>
          Tạo tài khoản mới
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-wallet text-xl text-white"></i>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {formatVietnameseCurrency(totalBalance)}
            </div>
            <div className="text-sm text-gray-600">Tổng số dư</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-user text-xl text-white"></i>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {accounts.filter(acc => acc.type === 'personal').length}
            </div>
            <div className="text-sm text-gray-600">Tài khoản cá nhân</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-users text-xl text-white"></i>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {accounts.filter(acc => acc.type === 'shared').length}
            </div>
            <div className="text-sm text-gray-600">Tài khoản chia sẻ</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create/Edit Form */}
        <div className="lg:col-span-1">
          {(showCreateForm || editingAccount) && (
            <AccountForm
              formData={formData}
              onUpdateFormData={updateFormData}
              onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount}
              onCancel={editingAccount ? cancelEditing : () => setShowCreateForm(false)}
              isEditing={!!editingAccount}
              isSubmitting={creating}
            />
          )}

          {!showCreateForm && !editingAccount && (
            <Card>
              <div className="text-center py-8">
                <i className="fas fa-plus-circle text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Tạo tài khoản mới
                </h3>
                <p className="text-gray-600 mb-4">
                  Thêm tài khoản để quản lý tài chính hiệu quả hơn
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Bắt đầu
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Account List */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Danh sách tài khoản</h2>
            
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-wallet text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500">Chưa có tài khoản nào được tạo.</p>
                <p className="text-sm text-gray-400">Tạo tài khoản đầu tiên để bắt đầu quản lý tài chính!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={startEditing}
                    onDelete={removeAccount}
                    isEditing={editingAccount === account.id}
                  />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => window.location.href = '/transactions/new'}
              className="flex items-center justify-center space-x-2"
            >
              <i className="fas fa-plus-circle"></i>
              <span>Thêm giao dịch</span>
            </Button>
            
            <Button
              onClick={() => window.location.href = '/envelopes'}
              className="flex items-center justify-center space-x-2"
            >
              <i className="fas fa-envelope"></i>
              <span>Quản lý Envelopes</span>
            </Button>
            
            <Button
              onClick={() => window.location.href = '/assets'}
              className="flex items-center justify-center space-x-2"
            >
              <i className="fas fa-chart-line"></i>
              <span>Quản lý tài sản</span>
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

export default EnhancedAccountManager;
