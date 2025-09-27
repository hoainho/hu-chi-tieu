import { useState, useEffect, useCallback, useContext } from 'react';
import { Transaction, IncomeSource, Category, Asset, UserProfile, Account } from '../types';
import { getTransactions, getIncomes, getCategories, getAssets, getUserProfile } from '../services/firestoreService';
import { getAccountsByUser } from '../services/accountService';
import { AuthContext } from '../context/AuthContext';
import autoSetupService from '../services/autoSetupService';
import toast from 'react-hot-toast';

export const useUserData = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = user?.uid;

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      // Clear data on logout
      setProfile(null);
      setTransactions([]);
      setIncomes([]);
      setCategories([]);
      setAssets([]);
      setAccounts([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch user profile first
      const userProfile = await getUserProfile(userId);
      setProfile(userProfile);
      
      if (!userProfile) {
          throw new Error("Không thể tải hồ sơ người dùng.");
      }

      // 2. Check if user needs auto-setup (first time login)
      const needsSetup = await autoSetupService.shouldAutoSetup(userProfile);
      if (needsSetup) {
        console.log('New user detected, setting up default data...');
        toast.loading('Đang thiết lập tài khoản lần đầu...', { id: 'setup' });
        
        try {
          await autoSetupService.setupNewUser(userProfile);
          toast.success('Tài khoản đã được thiết lập thành công!', { id: 'setup' });
        } catch (setupError) {
          console.error('Auto-setup failed:', setupError);
          toast.error('Không thể thiết lập tài khoản tự động', { id: 'setup' });
        }
      }

      // 3. Fetch all other data based on profile
      const [transactionsData, incomesData, categoriesData, assetsData, accountsData] = await Promise.all([
        getTransactions(userId, userProfile.coupleId),
        getIncomes(userId, userProfile.coupleId),
        getCategories(userId),
        getAssets(userId, userProfile.coupleId),
        getAccountsByUser(userId),
      ]);

      setTransactions(transactionsData);
      setIncomes(incomesData);
      setCategories(categoriesData);
      setAssets(assetsData);
      setAccounts(accountsData);

    } catch (err: any) {
      console.error(err);
      let errorMessage = 'Không thể tìm nạp dữ liệu tài chính của bạn.';
      if (err.code === 'unavailable' || err.message.includes('firestore/permission-denied')) {
          errorMessage = 'Không thể kết nối với cơ sở dữ liệu. Điều này có thể do sự cố mạng hoặc cấu hình Firebase không chính xác trong services/firebase.ts hoặc các quy tắc bảo mật không chính xác.';
      } else if (err.message) {
          errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Individual refresh functions
  const refreshAssets = useCallback(async () => {
    if (!userId || !profile) return;
    try {
      const assetsData = await getAssets(userId, profile.coupleId);
      setAssets(assetsData);
    } catch (err) {
      console.error('Failed to refresh assets:', err);
    }
  }, [userId, profile]);

  const refreshTransactions = useCallback(async () => {
    if (!userId || !profile) return;
    try {
      const transactionsData = await getTransactions(userId, profile.coupleId);
      setTransactions(transactionsData);
    } catch (err) {
      console.error('Failed to refresh transactions:', err);
    }
  }, [userId, profile]);

  const refreshIncomes = useCallback(async () => {
    if (!userId || !profile) return;
    try {
      const incomesData = await getIncomes(userId, profile.coupleId);
      setIncomes(incomesData);
    } catch (err) {
      console.error('Failed to refresh incomes:', err);
    }
  }, [userId, profile]);

  const refreshCategories = useCallback(async () => {
    if (!userId) return;
    try {
      const categoriesData = await getCategories(userId);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  }, [userId]);

  const refreshAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const accountsData = await getAccountsByUser(userId);
      setAccounts(accountsData);
    } catch (err) {
      console.error('Failed to refresh accounts:', err);
    }
  }, [userId]);

  return { 
    profile, 
    transactions, 
    incomes, 
    categories, 
    assets, 
    accounts, 
    loading, 
    error, 
    refreshData: fetchData,
    refreshAssets,
    refreshTransactions,
    refreshIncomes,
    refreshCategories,
    refreshAccounts
  };
};