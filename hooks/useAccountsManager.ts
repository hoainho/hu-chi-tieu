import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchAccounts, createNewAccount, updateAccountData, deleteAccount } from '../store/slices/accountSlice';
import { Account, SupportedCurrency } from '../types';
import toast from 'react-hot-toast';

export interface AccountFormData {
  name: string;
  type: 'personal' | 'shared';
  currency: SupportedCurrency;
  balance: number;
}

export const useAccountsManager = () => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const { accounts, loading, creating, error } = useAppSelector(state => state.account);
  
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'personal',
    currency: 'VND',
    balance: 0
  });

  // Load accounts when component mounts
  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchAccounts(profile.uid));
    }
  }, [profile?.uid, dispatch]);

  // Calculate total balance across all accounts
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  // Create new account
  const createAccount = useCallback(async (data: AccountFormData) => {
    if (!profile?.uid) return false;

    try {
      await dispatch(createNewAccount({
        name: data.name,
        type: data.type,
        ownerIds: [profile.uid],
        currency: data.currency
      })).unwrap();

      // Update balance if provided
      if (data.balance > 0) {
        // TODO: Add initial balance transaction
      }

      toast.success(`Tài khoản "${data.name}" đã được tạo thành công!`);
      resetForm();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Không thể tạo tài khoản');
      return false;
    }
  }, [profile?.uid, dispatch]);

  // Update account
  const updateAccount = useCallback(async (accountId: string, data: Partial<AccountFormData>) => {
    try {
      await dispatch(updateAccountData({
        id: accountId,
        updates: data
      })).unwrap();

      toast.success('Tài khoản đã được cập nhật!');
      setEditingAccount(null);
      resetForm();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Không thể cập nhật tài khoản');
      return false;
    }
  }, [dispatch]);

  // Delete account
  const removeAccount = useCallback(async (accountId: string, accountName: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tài khoản "${accountName}"?\n\nHành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu liên quan.`
    );

    if (!confirmed) return false;

    try {
      await dispatch(deleteAccount(accountId)).unwrap();
      toast.success(`Tài khoản "${accountName}" đã được xóa!`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Không thể xóa tài khoản');
      return false;
    }
  }, [dispatch]);

  // Form helpers
  const startEditing = useCallback((account: Account) => {
    setEditingAccount(account.id);
    setFormData({
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: account.balance
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingAccount(null);
    resetForm();
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      type: 'personal',
      currency: 'VND',
      balance: 0
    });
  }, []);

  const updateFormData = useCallback((updates: Partial<AccountFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // Data
    accounts,
    totalBalance,
    loading,
    creating,
    error,
    
    // Form state
    editingAccount,
    formData,
    
    // Actions
    createAccount,
    updateAccount,
    removeAccount,
    startEditing,
    cancelEditing,
    resetForm,
    updateFormData
  };
};
