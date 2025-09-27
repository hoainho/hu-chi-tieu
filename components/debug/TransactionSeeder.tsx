import React from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { createTransaction } from '../../store/slices/transactionSlice';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const TransactionSeeder: React.FC = () => {
  const { profile } = useAppSelector(state => state.user);
  const { accounts } = useAppSelector(state => state.account);
  const dispatch = useAppDispatch();

  const createSampleTransactions = async () => {
    if (!profile || !accounts.length) {
      toast.error('Cần có profile và account để tạo dữ liệu mẫu');
      return;
    }

    const accountId = accounts[0].id;
    const sampleTransactions = [
      // This month
      {
        description: 'Mua sắm tại siêu thị',
        amount: 500000,
        originalAmount: 500000,
        originalCurrency: 'VND' as const,
        exchangeRate: 1,
        category: 'food',
        envelope: 'food',
        date: Timestamp.now(),
        accountId,
        type: 'private' as const,
        ownerId: profile.uid,
      },
      {
        description: 'Tiền điện tháng này',
        amount: 300000,
        originalAmount: 300000,
        originalCurrency: 'VND' as const,
        exchangeRate: 1,
        category: 'utilities',
        envelope: 'utilities',
        date: Timestamp.now(),
        accountId,
        type: 'private' as const,
        ownerId: profile.uid,
      },
      // Last month
      {
        description: 'Ăn uống ngoài',
        amount: 200000,
        originalAmount: 200000,
        originalCurrency: 'VND' as const,
        exchangeRate: 1,
        category: 'food',
        envelope: 'food',
        date: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        accountId,
        type: 'private' as const,
        ownerId: profile.uid,
      },
      {
        description: 'Xăng xe',
        amount: 400000,
        originalAmount: 400000,
        originalCurrency: 'VND' as const,
        exchangeRate: 1,
        category: 'transport',
        envelope: 'transport',
        date: Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
        accountId,
        type: 'private' as const,
        ownerId: profile.uid,
      },
      // 2 months ago
      {
        description: 'Mua quần áo',
        amount: 800000,
        originalAmount: 800000,
        originalCurrency: 'VND' as const,
        exchangeRate: 1,
        category: 'shopping',
        envelope: 'shopping',
        date: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
        accountId,
        type: 'private' as const,
        ownerId: profile.uid,
      },
    ];

    try {
      for (const transaction of sampleTransactions) {
        await dispatch(createTransaction(transaction)).unwrap();
      }
      toast.success(`Đã tạo ${sampleTransactions.length} giao dịch mẫu!`);
    } catch (error) {
      console.error('Error creating sample transactions:', error);
      toast.error('Lỗi khi tạo dữ liệu mẫu');
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-blue-800 mb-2">🛠️ Transaction Seeder</h3>
      <p className="text-sm text-blue-700 mb-3">
        Tạo dữ liệu giao dịch mẫu để test tính năng xu hướng chi tiêu
      </p>
      <button
        onClick={createSampleTransactions}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Tạo 5 giao dịch mẫu
      </button>
    </div>
  );
};

export default TransactionSeeder;
