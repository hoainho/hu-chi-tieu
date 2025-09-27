import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import userReducer from './slices/userSlice';
import accountReducer from './slices/accountSlice';
import transactionReducer from './slices/transactionSlice';
import incomeReducer from './slices/incomeSlice';
import investmentReducer from './slices/investmentSlice';
import budgetReducer from './slices/budgetSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    account: accountReducer,
    transaction: transactionReducer,
    income: incomeReducer,
    investment: investmentReducer,
    budget: budgetReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Firestore Timestamp and other non-serializable values
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'user/fetchUserProfile/fulfilled',
          'account/fetchAccounts/fulfilled',
          'transaction/fetchTransactions/fulfilled',
          'transaction/createTransaction/fulfilled',
          'income/fetchIncomes/fulfilled',
          'income/createIncome/fulfilled'
        ],
        ignoredActionsPaths: ['payload.createdAt', 'payload.date', 'payload.lastLoginAt'],
        ignoredPaths: [
          'register', 
          'rehydrate',
          'user.profile.createdAt',
          'user.profile.lastLoginAt',
          'account.accounts.createdAt',
          'transaction.transactions.date',
          'income.incomes.date'
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for components
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
