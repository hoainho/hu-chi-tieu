import React, { createContext, ReactNode } from 'react';
import { Transaction, IncomeSource, Category, Asset, UserProfile } from '../types';
import { useUserData } from '../hooks/useUserData';

interface UserDataContextType {
  profile: UserProfile | null;
  transactions: Transaction[];
  incomes: IncomeSource[];
  categories: Category[];
  assets: Asset[];
  loading: boolean;
  error: string | null;
  refreshData: () => void;
}

export const UserDataContext = createContext<UserDataContextType>({
  profile: null,
  transactions: [],
  incomes: [],
  categories: [],
  assets: [],
  loading: true,
  error: null,
  refreshData: () => {},
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
