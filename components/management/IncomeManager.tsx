import React, { useState } from 'react';
import { useAppSelector } from '../../store';
import toast from 'react-hot-toast';
import { IncomeSource } from '../../types';
import { addIncome, deleteIncome } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

interface IncomeManagerProps {
  incomes: IncomeSource[];
  onDataChange: () => void;
}

const IncomeManager: React.FC<IncomeManagerProps> = ({ incomes, onDataChange }) => {
  const { profile } = useAppSelector(state => state.user);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name || !amount || !date) return;

    setIsSubmitting(true);
    const newIncome: Omit<IncomeSource, 'id'> = {
      name,
      amount: parseFloat(amount),
      date: Timestamp.fromDate(new Date(date)),
      type: isShared && profile.coupleId ? 'shared' : 'private',
      ownerId: profile.uid,
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
    };

    try {
      await addIncome(newIncome);
      toast.success('Thêm nguồn thu nhập thành công!');
      setName('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsShared(false);
      onDataChange();
    } catch (error) {
      toast.error('Thêm nguồn thu nhập thất bại.');
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
     if (window.confirm('Bạn có chắc chắn muốn xóa nguồn thu nhập này không?')) {
        try {
            await deleteIncome(id);
            toast.success('Đã xóa thu nhập.');
            onDataChange();
        } catch (error) {
            toast.error('Xóa thu nhập thất bại.');
            console.error(error);
        }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-4">Thêm thu nhập mới</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tên nguồn thu</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Lương, Việc làm thêm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Số tiền (VND)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" step="1" />
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-700">Ngày nhận</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {profile?.coupleId && (
            <div className="relative flex items-start pt-2">
                <div className="flex h-6 items-center">
                    <input id="isSharedIncome" type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                </div>
                <div className="ml-3 text-sm leading-6">
                    <label htmlFor="isSharedIncome" className="font-medium text-slate-900">Thu nhập chung</label>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ngày</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nguồn</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {incomes.map(i => (
                <tr key={i.id}>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{i.date.toDate().toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                        {i.type === 'shared' && <i className="fas fa-user-friends text-slate-400" title="Thu nhập chung"></i>}
                        <span>{i.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">+{formatCurrency(i.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {i.ownerId === profile?.uid && (
                        <button onClick={() => handleDelete(i.id)} className="text-red-600 hover:text-red-900"><i className="fas fa-trash"></i></button>
                    )}
                  </td>
                </tr>
              ))}
              {incomes.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-slate-500">Chưa có nguồn thu nhập nào được ghi lại.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default IncomeManager;
