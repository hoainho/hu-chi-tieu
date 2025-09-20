import React, { useState, useContext } from 'react';
import { UserDataContext } from '../../context/UserDataContext';
import TransactionManager from './TransactionManager';
import IncomeManager from './IncomeManager';
import CategoryManager from './CategoryManager';
import Card from '../ui/Card';

type Tab = 'transactions' | 'incomes' | 'categories';

const ManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const { transactions, incomes, categories, loading, refreshData, error, profile } = useContext(UserDataContext);

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
        {activeTab === 'transactions' && <TransactionManager transactions={transactions} categories={categories} onDataChange={refreshData} />}
        {activeTab === 'incomes' && <IncomeManager incomes={incomes} onDataChange={refreshData} />}
        {activeTab === 'categories' && <CategoryManager transactions={transactions} categories={categories} onDataChange={refreshData} />}
      </div>
    </div>
  );
};

export default ManagementPage;
