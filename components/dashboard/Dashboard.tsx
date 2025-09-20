import React, { useMemo, useState, useContext } from 'react';
import { UserDataContext } from '../../context/UserDataContext';
import SummaryCard from './SummaryCard';
import ExpensePieChart from './ExpensePieChart';
import MonthlyComparisonChart from './MonthlyComparisonChart';
import FinancialAdvice from './FinancialAdvice';
import ExpenseTrendChart from './ExpenseTrendChart';
import Card from '../ui/Card';
import TopExpenseCategoriesChart from './TopExpenseCategoriesChart';
import AssetAllocationChart from './AssetAllocationChart';

type DataFilter = 'all' | 'personal' | 'shared';

const Dashboard: React.FC = () => {
  const { transactions, incomes, assets, loading, error, profile } = useContext(UserDataContext);
  const [filter, setFilter] = useState<DataFilter>('all');

  const filteredData = useMemo(() => {
    if (filter === 'personal') {
      return {
        transactions: transactions.filter(t => t.type === 'private'),
        incomes: incomes.filter(i => i.type === 'private'),
        assets: assets.filter(a => a.ownerType === 'private'),
      };
    }
    if (filter === 'shared') {
      return {
        transactions: transactions.filter(t => t.type === 'shared'),
        incomes: incomes.filter(i => i.type === 'shared'),
        assets: assets.filter(a => a.ownerType === 'shared'),
      };
    }
    return { transactions, incomes, assets };
  }, [filter, transactions, incomes, assets]);

  const { totalIncome, totalExpenses, savings } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthIncomes = filteredData.incomes.filter(income => {
      const incomeDate = income.date.toDate();
      return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
    });

    const currentMonthTransactions = filteredData.transactions.filter(transaction => {
      const transactionDate = transaction.date.toDate();
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });

    const totalIncome = currentMonthIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = currentMonthTransactions.reduce((sum, item) => sum + item.amount, 0);
    const savings = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, savings };
  }, [filteredData.incomes, filteredData.transactions]);

  const totalAssets = useMemo(() => {
    return filteredData.assets.reduce((sum, item) => sum + item.value, 0);
  }, [filteredData.assets]);

  const getTabClass = (tabName: DataFilter) => 
    `px-4 py-2 font-semibold rounded-md transition-colors text-sm ${
      filter === tabName
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Bảng điều khiển</h1>
        {profile?.coupleId && (
          <div className="bg-white p-1.5 rounded-lg shadow-sm inline-flex items-center gap-2 self-start">
            <button onClick={() => setFilter('all')} className={getTabClass('all')}>Tất cả</button>
            <button onClick={() => setFilter('personal')} className={getTabClass('personal')}>Cá nhân</button>
            <button onClick={() => setFilter('shared')} className={getTabClass('shared')}>Chung</button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Thu nhập tháng này" 
          amount={totalIncome} 
          icon="fa-arrow-up" 
          color="green" 
        />
        <SummaryCard 
          title="Chi tiêu tháng này" 
          amount={totalExpenses} 
          icon="fa-arrow-down" 
          color="red" 
        />
        <SummaryCard 
          title="Tiết kiệm tháng này" 
          amount={savings} 
          icon="fa-piggy-bank" 
          color="blue" 
        />
         <SummaryCard 
          title="Tổng tài sản" 
          amount={totalAssets} 
          icon="fa-briefcase" 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
            <ExpensePieChart transactions={filteredData.transactions} />
        </div>
        <div className="lg:col-span-3">
            <MonthlyComparisonChart transactions={filteredData.transactions} incomes={filteredData.incomes} />
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
            <AssetAllocationChart assets={filteredData.assets} />
        </div>
        <div className="lg:col-span-3">
            <TopExpenseCategoriesChart transactions={filteredData.transactions} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ExpenseTrendChart transactions={filteredData.transactions} />
      </div>

       <FinancialAdvice transactions={filteredData.transactions} totalIncome={totalIncome} />
    </div>
  );
};

export default Dashboard;
