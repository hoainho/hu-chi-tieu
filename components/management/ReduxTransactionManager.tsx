import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchTransactions } from '../../store/slices/transactionSlice';
import { fetchUserProfile } from '../../store/slices/userSlice';
import TransactionManager from './TransactionManager';
import { getCategories } from '../../services/firestoreService';

const ReduxTransactionManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const { transactions, loading } = useAppSelector(state => state.transaction);
  
  // Local state for categories (will be moved to Redux later)
  const [categories, setCategories] = React.useState<any[]>([]);

  useEffect(() => {
    console.log('ReduxTransactionManager - profile state:', profile);
    if (profile?.uid) {
      console.log('ReduxTransactionManager - dispatching fetchTransactions for:', profile.uid);
      dispatch(fetchTransactions(profile.uid));
      
      // Load categories
      const loadCategories = async () => {
        try {
          console.log('ReduxTransactionManager - loading categories for:', profile.uid);
          const cats = await getCategories(profile.uid);
          console.log('ReduxTransactionManager - loaded categories:', cats);
          setCategories(cats);
        } catch (error) {
          console.error('Failed to load categories:', error);
        }
      };
      loadCategories();
    } else {
      console.log('ReduxTransactionManager - no profile or uid');
    }
  }, [profile?.uid, dispatch]);

  const handleDataChange = () => {
    if (profile?.uid) {
      dispatch(fetchTransactions(profile.uid));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading transactions...</div>;
  }

  if (!profile) {
    return <div className="flex justify-center p-8">Loading user profile...</div>;
  }

  return (
    <TransactionManager
      transactions={transactions}
      categories={categories}
      onDataChange={handleDataChange}
    />
  );
};

export default ReduxTransactionManager;
