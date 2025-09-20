
import React, { useMemo } from 'react';
import Card from '../ui/Card';
import { Transaction } from '../../types';

interface FinancialAdviceProps {
  transactions: Transaction[];
  totalIncome: number;
}

const FinancialAdvice: React.FC<FinancialAdviceProps> = ({ transactions, totalIncome }) => {
  const advice = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const date = t.date.toDate();
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalExpenses = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);

    if (totalIncome === 0 && totalExpenses === 0) {
      return "Hãy bắt đầu bằng cách thêm các nguồn thu nhập và chi phí hàng ngày để nhận được lời khuyên được cá nhân hóa!";
    }

    if (totalIncome > 0 && totalExpenses > totalIncome) {
      return "Chi tiêu của bạn trong tháng này cao hơn thu nhập. Hãy xem xét lại việc chi tiêu, đặc biệt là trong các danh mục như 'Ăn ngoài' hoặc 'Mua sắm', để tìm các khoản có thể cắt giảm.";
    }

    const expenseByCategory = monthlyTransactions.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {} as { [key: string]: number });

    const topCategoryEntry = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a)[0];

    if (topCategoryEntry) {
      const [topCategory] = topCategoryEntry;
      return `Danh mục chi tiêu cao nhất của bạn trong tháng này là '${topCategory}'. Hãy cân nhắc đặt ngân sách cho danh mục này để quản lý chi tiêu hiệu quả hơn.`;
    }

    return "Bạn đang làm rất tốt! Hãy tiếp tục theo dõi tài chính của mình để luôn đạt được các mục tiêu.";
  }, [transactions, totalIncome]);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <i className="fas fa-lightbulb"></i>
        </div>
        <div>
            <h2 className="text-lg font-semibold">Mẹo tài chính</h2>
            <p className="text-slate-600 mt-1">{advice}</p>
        </div>
      </div>
    </Card>
  );
};

export default FinancialAdvice;
