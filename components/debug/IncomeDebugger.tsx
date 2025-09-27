import React from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { createIncome } from '../../store/slices/incomeSlice';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const IncomeDebugger: React.FC = () => {
  const { profile } = useAppSelector(state => state.user);
  const { incomes, loading, error } = useAppSelector(state => state.income);
  const dispatch = useAppDispatch();

  const createSampleIncome = async () => {
    if (!profile) {
      toast.error('Cần đăng nhập để tạo thu nhập mẫu');
      return;
    }

    const sampleIncome = {
      name: 'Lương tháng ' + (new Date().getMonth() + 1),
      amount: 15000000,
      date: Timestamp.now(),
      type: 'private' as const,
      ownerId: profile.uid,
    };

    try {
      await dispatch(createIncome(sampleIncome)).unwrap();
      toast.success('Đã tạo thu nhập mẫu!');
    } catch (error) {
      console.error('Error creating sample income:', error);
      toast.error('Lỗi khi tạo thu nhập mẫu');
    }
  };

  console.log('🔍 INCOME DEBUG INFO:');
  console.log('Profile:', profile);
  console.log('Incomes:', incomes);
  console.log('Loading:', loading);
  console.log('Error:', error);

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-green-800 mb-2">💰 Income Debug Info</h3>
      <div className="text-sm text-green-700 space-y-1">
        <div>Profile: <strong>{profile ? 'Loaded' : 'Not loaded'}</strong></div>
        <div>Incomes count: <strong>{incomes.length}</strong></div>
        <div>Loading: <strong>{loading ? 'Yes' : 'No'}</strong></div>
        <div>Error: <strong>{error || 'None'}</strong></div>
        {incomes.length > 0 && (
          <div>Latest income: <strong>{incomes[incomes.length - 1]?.name}</strong></div>
        )}
      </div>
      <button
        onClick={createSampleIncome}
        className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        disabled={loading}
      >
        {loading ? 'Creating...' : 'Tạo thu nhập mẫu'}
      </button>
    </div>
  );
};

export default IncomeDebugger;
