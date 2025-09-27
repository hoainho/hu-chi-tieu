import React from 'react';
import { useAppSelector } from '../../store';
import { toDate } from '../../utils/dateHelpers';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';

const SpendingDebugger: React.FC = () => {
  const { transactions } = useAppSelector(state => state.transaction);

  console.log('🔍 DEBUGGING SPENDING TRENDS:');
  console.log('Total transactions:', transactions.length);

  if (transactions.length > 0) {
    console.log('Sample transaction:', transactions[0]);
    
    // Analyze amounts
    const amounts = transactions.map(t => t.amount);
    const positiveAmounts = amounts.filter(a => a > 0);
    const negativeAmounts = amounts.filter(a => a < 0);
    const zeroAmounts = amounts.filter(a => a === 0);
    
    console.log('Positive amounts:', positiveAmounts.length);
    console.log('Negative amounts:', negativeAmounts.length);
    console.log('Zero amounts:', zeroAmounts.length);
    
    // Check date format
    const sampleDate = transactions[0]?.date;
    console.log('Sample date:', sampleDate);
    console.log('Date type:', typeof sampleDate);
    console.log('Parsed date:', toDate(sampleDate));
    
    // Filter last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentTransactions = transactions.filter(txn => {
      const txnDate = toDate(txn.date);
      return txnDate && txnDate >= sixMonthsAgo;
    });
    
    console.log('Recent transactions (6 months):', recentTransactions.length);
    
    // Check expense transactions (both positive and negative)
    const expenseTransactions = recentTransactions.filter(txn => {
      // Try both positive and negative amounts
      return Math.abs(txn.amount) > 0;
    });
    
    console.log('Expense transactions:', expenseTransactions.length);
    
    if (expenseTransactions.length > 0) {
      console.log('Sample expense:', expenseTransactions[0]);
    }
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-yellow-800 mb-2">🔍 Spending Debug Info</h3>
      <div className="text-sm text-yellow-700 space-y-1">
        <div>Total transactions: <strong>{transactions.length}</strong></div>
        {transactions.length > 0 && (
          <>
            <div>Sample amount: <strong>{formatVietnameseCurrency(transactions[0].amount)}</strong></div>
            <div>Sample date: <strong>{transactions[0].date?.toString()}</strong></div>
            <div>Sample description: <strong>{transactions[0].description}</strong></div>
            <div>Sample category: <strong>{transactions[0].category}</strong></div>
            <div>Sample envelope: <strong>{transactions[0].envelope}</strong></div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpendingDebugger;
