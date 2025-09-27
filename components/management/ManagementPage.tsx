import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchTransactions } from '../../store/slices/transactionSlice';
import { getCategories } from '../../services/firestoreService';
import { Category } from '../../types';
import ReduxTransactionManager from './ReduxTransactionManager';
import ReduxIncomeManager from './ReduxIncomeManager';
import CategoryManager from './CategoryManager';
import Card from '../ui/Card';

type Tab = 'transactions' | 'incomes' | 'categories';

const ManagementPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const { loading, error, profile } = useAppSelector(state => state.user);
  const { transactions } = useAppSelector(state => state.transaction);

  // Fetch categories function
  const fetchCategoriesData = async () => {
    if (!profile?.uid) return;
    
    setCategoriesLoading(true);
    try {
      const categoriesData = await getCategories(profile.uid);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Fetch data when component mounts or when switching to categories tab
  useEffect(() => {
    if (profile?.uid) {
      if (activeTab === 'categories') {
        fetchCategoriesData();
      }
      if (activeTab === 'transactions') {
        dispatch(fetchTransactions(profile.uid));
      }
    }
  }, [dispatch, profile?.uid, activeTab]);

  // Function to refresh data after changes
  const handleDataChange = () => {
    if (profile?.uid) {
      fetchCategoriesData();
      dispatch(fetchTransactions(profile.uid));
    }
  };

  const getTabClass = (tabName: Tab) => 
    `px-4 py-2 font-semibold rounded-md transition-colors ${
      activeTab === tabName
        ? 'bg-blue-600 text-white'
        : 'text-slate-600 hover:bg-slate-200'
    }`;
  
  if (loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <Card className="border-red-300 border bg-red-50 max-w-lg text-center">
            <div className="text-red-500">
                <i className="fas fa-exclamation-triangle fa-3x"></i>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-800">Lỗi kết nối</h2>
            <p className="mt-2 text-slate-600">{error}</p>
             <p className="mt-4 text-sm text-slate-500">
                Vui lòng xác minh thiết lập của bạn và làm mới trang. Kiểm tra bảng điều khiển dành cho nhà phát triển để biết thêm chi tiết.
            </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Quản lý giao dịch</h1>
      <div className="bg-white p-2 rounded-lg shadow-sm inline-flex items-center gap-2">
        <button onClick={() => setActiveTab('transactions')} className={getTabClass('transactions')}>
          <i className="fas fa-money-bill-wave mr-2"></i>Chi tiêu
        </button>
        <button onClick={() => setActiveTab('incomes')} className={getTabClass('incomes')}>
          <i className="fas fa-dollar-sign mr-2"></i>Thu nhập
        </button>
         <button onClick={() => setActiveTab('categories')} className={getTabClass('categories')}>
          <i className="fas fa-tags mr-2"></i>Danh mục
        </button>
      </div>
      <div>
        {activeTab === 'transactions' && <ReduxTransactionManager />}
        {activeTab === 'incomes' && <ReduxIncomeManager />}
        {activeTab === 'categories' && (
          categoriesLoading ? (
            <div className="flex justify-center items-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
              <span className="ml-2 text-gray-600">Đang tải danh mục...</span>
            </div>
          ) : (
            <CategoryManager 
              transactions={transactions} 
              categories={categories} 
              onDataChange={handleDataChange} 
            />
          )
        )}
      </div>
    </div>
  );
};

export default ManagementPage;
