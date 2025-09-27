import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchIncomes, createIncome, removeIncome } from '../../store/slices/incomeSlice';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import IncomeDebugger from '../debug/IncomeDebugger';

const ReduxIncomeManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const { incomes, loading, error } = useAppSelector(state => state.income);
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // Load incomes when component mounts
  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchIncomes(profile.uid));
    }
  }, [profile?.uid, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name || !amount || !date) return;

    setIsSubmitting(true);
    const newIncome = {
      name,
      amount: parseFloat(amount),
      date: Timestamp.fromDate(new Date(date)),
      type: (isShared && profile.coupleId ? 'shared' : 'private') as 'private' | 'shared',
      ownerId: profile.uid,
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
    };

    try {
      await dispatch(createIncome(newIncome)).unwrap();
      toast.success('Thêm nguồn thu nhập thành công!');
      setName('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsShared(false);
    } catch (error: any) {
      toast.error(error.message || 'Thêm nguồn thu nhập thất bại.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!profile) return;
    
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa nguồn thu nhập "${name}" không?`);
    if (!confirmed) return;

    try {
      await dispatch(removeIncome({ incomeId: id, userId: profile.uid })).unwrap();
      toast.success(`Đã xóa thu nhập "${name}".`);
    } catch (error: any) {
      toast.error(error.message || 'Xóa thu nhập thất bại.');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <Card className="border-red-300 border bg-red-50 max-w-lg text-center">
          <div className="text-red-500">
            <i className="fas fa-exclamation-triangle fa-3x"></i>
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-800">Lỗi tải dữ liệu</h2>
          <p className="mt-2 text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-4">Thêm thu nhập mới</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tên nguồn thu</label>
            <Input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="VD: Lương, Việc làm thêm" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Số tiền (VND)</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              required 
              min="1" 
              step="1" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Ngày nhận</label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
            />
          </div>

          {profile?.coupleId && (
            <div className="relative flex items-start pt-2">
              <div className="flex h-6 items-center">
                <input 
                  id="isSharedIncome" 
                  type="checkbox" 
                  checked={isShared} 
                  onChange={e => setIsShared(e.target.checked)} 
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" 
                />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="isSharedIncome" className="font-medium text-slate-900">
                  Thu nhập chung
                </label>
              </div>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Đang thêm...' : 'Thêm thu nhập'}
          </Button>
        </form>
      </Card>
      
      <Card className="lg:col-span-2">
        <h2 className="text-lg font-semibold mb-4">Các nguồn thu nhập</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ngày
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Nguồn
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {incomes.map(income => (
                <tr key={income.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {typeof income.date === 'string' 
                      ? new Date(income.date).toLocaleDateString('vi-VN')
                      : (income.date as any)?.toDate?.()?.toLocaleDateString('vi-VN') || 'Invalid Date'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {income.type === 'shared' && (
                        <i className="fas fa-user-friends text-slate-400" title="Thu nhập chung"></i>
                      )}
                      <span>{income.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">
                    +{formatCurrency(income.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {income.ownerId === profile?.uid && (
                      <button 
                        onClick={() => handleDelete(income.id, income.name)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                        title="Xóa thu nhập"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {incomes.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-dollar-sign text-4xl text-slate-300 mb-2"></i>
                      <p>Chưa có nguồn thu nhập nào được ghi lại.</p>
                      <p className="text-sm text-slate-400 mt-1">Thêm thu nhập đầu tiên để bắt đầu theo dõi.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default ReduxIncomeManager;
