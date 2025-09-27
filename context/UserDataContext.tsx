import React, { createContext, ReactNode } from 'react';
import { Transaction, IncomeSource, Category, Asset, UserProfile, Account } from '../types';
import { useUserData } from '../hooks/useUserData';

interface UserDataContextType {
  profile: UserProfile | null;
  transactions: Transaction[];
  incomes: IncomeSource[];
  categories: Category[];
  assets: Asset[];
  accounts: Account[];
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  refreshAssets: () => void;
  refreshTransactions: () => void;
  refreshIncomes: () => void;
  refreshCategories: () => void;
  refreshAccounts: () => void;
}

export const UserDataContext = createContext<UserDataContextType>({
  profile: null,
  transactions: [],
  incomes: [],
  categories: [],
  assets: [],
  accounts: [],
  loading: true,
  error: null,
  refreshData: () => {},
  refreshAssets: () => {},
  refreshTransactions: () => {},
  refreshIncomes: () => {},
  refreshCategories: () => {},
  refreshAccounts: () => {},
});

interface UserDataProviderProps {
    children: ReactNode;
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({ children }) => {
    const userData = useUserData();

    return (
        <UserDataContext.Provider value={userData}>
            {children}
        </UserDataContext.Provider>
    )
}
