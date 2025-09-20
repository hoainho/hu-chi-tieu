import { useState, useEffect, useCallback, useContext } from 'react';
import { Transaction, IncomeSource, Category, Asset, UserProfile } from '../types';
import { getTransactions, getIncomes, getCategories, getAssets, getUserProfile } from '../services/firestoreService';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useUserData = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
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

      // 2. Fetch all other data based on profile
      const [transactionsData, incomesData, categoriesData, assetsData] = await Promise.all([
        getTransactions(userId, userProfile.coupleId),
        getIncomes(userId, userProfile.coupleId),
        getCategories(userId),
        getAssets(userId, userProfile.coupleId),
      ]);

      setTransactions(transactionsData);
      setIncomes(incomesData);
      setCategories(categoriesData);
      setAssets(assetsData);

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

  return { profile, transactions, incomes, categories, assets, loading, error, refreshData: fetchData };
};