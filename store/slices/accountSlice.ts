import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Account, SupportedCurrency } from '../../types';
import { getAccountsByUser, createAccount } from '../../services/accountService';

interface AccountState {
  accounts: Account[];
  loading: boolean;
  creating: boolean;
  inviting: boolean;
  error: string | null;
  selectedAccount: Account | null;
}

const initialState: AccountState = {
  accounts: [],
  loading: false,
  creating: false,
  inviting: false,
  error: null,
  selectedAccount: null,
};

// Async thunks
export const fetchAccounts = createAsyncThunk(
  'account/fetchAccounts',
  async (userId: string, { rejectWithValue }) => {
    try {
      const accounts = await getAccountsByUser(userId);
      return accounts;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách tài khoản');
    }
  }
);

export const createNewAccount = createAsyncThunk(
  'account/createNew',
  async (
    data: {
      name: string;
      type: 'personal' | 'shared';
      ownerIds: string[];
      currency: SupportedCurrency;
    },
    { rejectWithValue }
  ) => {
    try {
      const accountId = await createAccount(
        data.name,
        data.type,
        data.ownerIds,
        data.currency
      );
      
      // Fetch the created account
      const accounts = await getAccountsByUser(data.ownerIds[0]);
      const newAccount = accounts.find(acc => acc.id === accountId);
      
      if (!newAccount) {
        throw new Error('Không thể tải tài khoản vừa tạo');
      }
      
      return newAccount;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tạo tài khoản mới');
    }
  }
);

export const updateAccountData = createAsyncThunk(
  'account/update',
  async (
    data: { id: string; updates: Partial<Account> },
    { rejectWithValue }
  ) => {
    try {
      // Placeholder - will implement later
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể cập nhật tài khoản');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'account/delete',
  async (accountId: string, { rejectWithValue }) => {
    try {
      // Placeholder - will implement later
      return accountId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể xóa tài khoản');
    }
  }
);

export const sendInvitation = createAsyncThunk(
  'account/sendInvitation',
  async (
    data: {
      accountId: string;
      inviterId: string;
      inviteeEmail: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Placeholder - will implement later
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể gửi lời mời');
    }
  }
);

export const acceptInvitation = createAsyncThunk(
  'account/acceptInvitation',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      // Placeholder - will implement later
      return inviteId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể chấp nhận lời mời');
    }
  }
);

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    selectAccount: (state, action: PayloadAction<Account | null>) => {
      state.selectedAccount = action.payload;
    },
    updateAccountBalance: (
      state,
      action: PayloadAction<{ accountId: string; newBalance: number }>
    ) => {
      const account = state.accounts.find(
        (acc) => acc.id === action.payload.accountId
      );
      if (account) {
        account.balance = action.payload.newBalance;
      }
    },
    addAccountToList: (state, action: PayloadAction<Account>) => {
      state.accounts.push(action.payload);
    },
    removeAccountFromList: (state, action: PayloadAction<string>) => {
      state.accounts = state.accounts.filter(
        (acc) => acc.id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    // Fetch accounts
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        // Convert Firestore Timestamps to ISO strings
        const accounts = action.payload.map(account => ({
          ...account,
          createdAt: (account.createdAt as any)?.toDate ? (account.createdAt as any).toDate().toISOString() : account.createdAt
        }));
        state.accounts = accounts;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create new account
    builder
      .addCase(createNewAccount.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createNewAccount.fulfilled, (state, action) => {
        state.creating = false;
        state.accounts.push(action.payload);
      })
      .addCase(createNewAccount.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      });

    // Update account
    builder
      .addCase(updateAccountData.fulfilled, (state, action) => {
        const index = state.accounts.findIndex(
          (acc) => acc.id === action.payload.id
        );
        if (index !== -1) {
          state.accounts[index] = {
            ...state.accounts[index],
            ...action.payload.updates,
          };
        }
      })
      .addCase(updateAccountData.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete account
    builder
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.accounts = state.accounts.filter(
          (acc) => acc.id !== action.payload
        );
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Send invitation
    builder
      .addCase(sendInvitation.pending, (state) => {
        state.inviting = true;
        state.error = null;
      })
      .addCase(sendInvitation.fulfilled, (state) => {
        state.inviting = false;
      })
      .addCase(sendInvitation.rejected, (state, action) => {
        state.inviting = false;
        state.error = action.payload as string;
      });

    // Accept invitation
    builder
      .addCase(acceptInvitation.fulfilled, (state) => {
        // Reload accounts after accepting invitation
      })
      .addCase(acceptInvitation.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  selectAccount,
  updateAccountBalance,
  addAccountToList,
  removeAccountFromList,
} = accountSlice.actions;

export default accountSlice.reducer;
