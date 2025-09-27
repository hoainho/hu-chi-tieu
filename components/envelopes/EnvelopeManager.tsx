import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchAccounts } from '../../store/slices/accountSlice';
import { Account } from '../../types';
import { 
  getAccountsByUser, 
  createEnvelope, 
  updateEnvelopeAllocation, 
  deleteEnvelope,
  getEnvelopeStatus,
  calculateTotalBudget
} from '../../services/accountService';
import { UserDataContext } from '../../context/UserDataContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

const EnvelopeManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const { accounts, loading } = useAppSelector(state => state.account);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  
  // New envelope form
  const [newEnvelopeName, setNewEnvelopeName] = useState('');
  const [newEnvelopeAmount, setNewEnvelopeAmount] = useState('');
  
  // Edit envelope
  const [editingEnvelope, setEditingEnvelope] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  // Load accounts when component mounts
  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchAccounts(profile.uid));
    }
  }, [profile?.uid, dispatch]);

  // Set selected account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  const envelopes = selectedAccount?.envelopes || {};
  const budgetSummary = calculateTotalBudget(envelopes);

  const handleCreateEnvelope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !newEnvelopeName || !newEnvelopeAmount) return;

    const amount = parseFloat(newEnvelopeAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (envelopes[newEnvelopeName]) {
      toast.error('Ngân sách với tên này đã tồn tại');
      return;
    }

    setIsCreating(true);
    try {
      await createEnvelope(selectedAccountId, newEnvelopeName, amount);
      toast.success(`Ngân sách "${newEnvelopeName}" đã được tạo thành công!`);
      
      setNewEnvelopeName('');
      setNewEnvelopeAmount('');
      if (profile?.uid) {
        dispatch(fetchAccounts(profile.uid));
      }
    } catch (error) {
      console.error('Failed to create envelope:', error);
      toast.error('Không thể tạo ngân sách');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateEnvelope = async (envelopeName: string) => {
    if (!selectedAccountId || !editAmount) return;

    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      await updateEnvelopeAllocation(selectedAccountId, envelopeName, amount);
      toast.success(`Ngân sách "${envelopeName}" đã được cập nhật thành công!`);
      
      setEditingEnvelope(null);
      setEditAmount('');
      if (profile?.uid) {
        dispatch(fetchAccounts(profile.uid));
      }
    } catch (error) {
      console.error('Failed to update envelope:', error);
      toast.error('Không thể cập nhật ngân sách');
    }
  };

  const handleDeleteEnvelope = async (envelopeName: string) => {
    if (!selectedAccountId) return;

    const envelope = envelopes[envelopeName];
    if (envelope.spent > 0) {
      const confirm = window.confirm(
        `Ngân sách này đã chi tiêu ${formatCurrency(envelope.spent)}. Việc xóa sẽ không ảnh hưởng đến các giao dịch hiện tại. Bạn có chắc chắn?`
      );
      if (!confirm) return;
    }

    try {
      await deleteEnvelope(selectedAccountId, envelopeName);
      toast.success(`Ngân sách "${envelopeName}" đã được xóa thành công!`);
      
      if (profile?.uid) {
        dispatch(fetchAccounts(profile.uid));
      }
    } catch (error) {
      console.error('Failed to delete envelope:', error);
      toast.error('Không thể xóa ngân sách');
    }
  };

  const startEditing = (envelopeName: string, currentAmount: number) => {
    setEditingEnvelope(envelopeName);
    setEditAmount(currentAmount.toString());
  };

  const cancelEditing = () => {
    setEditingEnvelope(null);
    setEditAmount('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <div className="text-center p-8">
          <i className="fas fa-wallet text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy tài khoản</h3>
          <p className="text-gray-500 mb-4">Tạo tài khoản trước để quản lý ngân sách.</p>
          <Button onClick={() => window.location.href = '/accounts'}>
            Tạo tài khoản
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Ngân sách</h1>
        
        {/* Account Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Tài khoản:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget Summary */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Tổng quan ngân sách</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(budgetSummary.totalAllocated)}
            </div>
            <div className="text-sm text-gray-600">Tổng phân bổ</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(budgetSummary.totalSpent)}
            </div>
            <div className="text-sm text-gray-600">Tổng chi tiêu</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(budgetSummary.totalRemaining)}
            </div>
            <div className="text-sm text-gray-600">Còn lại</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {budgetSummary.overallPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Đã sử dụng</div>
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Tỉ lệ sử dụng ngân sách</span>
            <span>{budgetSummary.overallPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                budgetSummary.overallPercentage >= 90 ? 'bg-red-500' :
                budgetSummary.overallPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetSummary.overallPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create New Envelope */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Tạo ngân sách mới</h2>
          <form onSubmit={handleCreateEnvelope} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên ngân sách
              </label>
              <Input
                type="text"
                value={newEnvelopeName}
                onChange={(e) => setNewEnvelopeName(e.target.value)}
                placeholder="Ví dụ: Đồ ăn, Giải trí"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số tiền ngân sách (VND)
              </label>
              <Input
                type="number"
                value={newEnvelopeAmount}
                onChange={(e) => setNewEnvelopeAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="1000"
                required
              />
            </div>
            
            <Button
              type="submit"
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang tạo...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Tạo ngân sách
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Envelope List */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Các ngân sách</h2>
            
            {Object.keys(envelopes).length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-envelope-open text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500">Chưa có ngân sách nào được tạo.</p>
                <p className="text-sm text-gray-400">Tạo ngân sách đầu tiên để bắt đầu lập kế hoạch tài chính!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(envelopes).map(([name, envelope]) => {
                  const envelopeData = envelope as { allocated: number; spent: number };
                  const status = getEnvelopeStatus(envelopeData);
                  
                  return (
                    <div key={name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800 capitalize">{name}</h3>
                        <div className="flex items-center space-x-2">
                          {editingEnvelope === name ? (
                            <>
                              <button
                                onClick={() => handleUpdateEnvelope(name)}
                                className="text-green-600 hover:text-green-800"
                                title="Lưu"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-gray-600 hover:text-gray-800"
                                title="Hủy"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(name, envelopeData.allocated)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Chỉnh sửa phân bổ"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteEnvelope(name)}
                                className="text-red-600 hover:text-red-800"
                                title="Xóa ngân sách"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Phân bổ:</span>
                          {editingEnvelope === name ? (
                            <Input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="mt-1 text-sm"
                              min="0"
                              step="1000"
                            />
                          ) : (
                            <div className="font-semibold text-blue-600">
                              {formatCurrency(envelopeData.allocated)}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-600">Chi tiêu:</span>
                          <div className="font-semibold text-red-600">
                            {formatCurrency(envelopeData.spent)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Còn lại:</span>
                          <div className={`font-semibold ${
                            status.isOverspent ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(status.remaining)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Sử dụng</span>
                          <span>{status.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              status.status === 'critical' ? 'bg-red-500' :
                              status.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(status.percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      {status.isOverspent && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          Vượt ngân sách
                        </div>
                      )}
                      {status.status === 'warning' && !status.isOverspent && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          Ngân sách thấp
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnvelopeManager;
