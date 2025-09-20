import React, { useState, useContext } from 'react';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Transaction, Category } from '../../types';
import { addTransaction, deleteTransaction } from '../../services/firestoreService';
import { UserDataContext } from '../../context/UserDataContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

interface TransactionManagerProps {
  transactions: Transaction[];
  categories: Category[];
  onDataChange: () => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ transactions, categories, onDataChange }) => {
  const { profile } = useContext(UserDataContext);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories.length > 0 ? categories[0].name : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [paidBy, setPaidBy] = useState(profile?.uid || '');

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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !description || !amount || !date || !category) {
        toast.error('Vui lòng điền đầy đủ thông tin và chọn một danh mục.');
        return;
    }
    setIsSubmitting(true);
    
    const newTransaction: Omit<Transaction, 'id'> = {
      description,
      amount: parseFloat(amount),
      category,
      date: Timestamp.fromDate(new Date(date)),
      type: isShared && profile.coupleId ? 'shared' : 'private',
      ownerId: profile.uid,
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
      ...(isShared && profile.coupleId && { paidBy }),
    };

    try {
      await addTransaction(newTransaction);
      toast.success('Thêm chi tiêu thành công!');
      setDescription('');
      setAmount('');
      if (categories.length > 0) setCategory(categories[0].name);
      setDate(new Date().toISOString().split('T')[0]);
      setIsShared(false);
      onDataChange();
    } catch (error) {
      toast.error('Thêm chi tiêu thất bại.');
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) {
        try {
            await deleteTransaction(id);
            toast.success('Đã xóa giao dịch.');
            onDataChange();
        } catch (error) {
            toast.error('Xóa giao dịch thất bại.');
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
          <Button type="submit" disabled={isSubmitting || categories.length === 0} className="w-full">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.date.toDate().toLocaleDateString()}</td>
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
