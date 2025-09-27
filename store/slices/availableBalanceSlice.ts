import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import availableBalanceService, { AvailableBalanceRecord, AvailableBalanceTransaction } from '../../services/availableBalanceService';

interface AvailableBalanceState {
  currentBalance: number;
  balanceHistory: AvailableBalanceRecord[];
  transactionHistory: AvailableBalanceTransaction[];
  loading: boolean;
  error: string | null;
}

const initialState: AvailableBalanceState = {
  currentBalance: 0,
  balanceHistory: [],
  transactionHistory: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCurrentBalance = createAsyncThunk(
  'availableBalance/fetchCurrent',
  async ({ userId, coupleId }: { userId: string; coupleId?: string }) => {
    return await availableBalanceService.getCurrentBalance(userId, coupleId);
  }
);

export const fetchBalanceHistory = createAsyncThunk(
  'availableBalance/fetchHistory',
  async ({ userId, coupleId }: { userId: string; coupleId?: string }) => {
    return await availableBalanceService.getBalanceHistory(userId, coupleId);
  }
);

export const fetchTransactionHistory = createAsyncThunk(
  'availableBalance/fetchTransactions',
  async ({ userId, coupleId }: { userId: string; coupleId?: string }) => {
    return await availableBalanceService.getTransactionHistory(userId, coupleId);
  }
);

export const addIncomeToBalance = createAsyncThunk(
  'availableBalance/addIncome',
  async ({ 
    userId, 
    amount, 
    description, 
    sourceId, 
    coupleId 
  }: { 
    userId: string; 
    amount: number; 
    description: string; 
    sourceId: string; 
    coupleId?: string; 
  }) => {
    await availableBalanceService.addIncome(userId, amount, description, sourceId, coupleId);
    return await availableBalanceService.getCurrentBalance(userId, coupleId);
  }
);

export const deductSpendingFromBalance = createAsyncThunk(
  'availableBalance/deductSpending',
  async ({ 
    userId, 
    amount, 
    description, 
    sourceId, 
    coupleId 
  }: { 
    userId: string; 
    amount: number; 
    description: string; 
    sourceId: string; 
    coupleId?: string; 
  }) => {
    await availableBalanceService.deductSpending(userId, amount, description, sourceId, coupleId);
    return await availableBalanceService.getCurrentBalance(userId, coupleId);
  }
);

export const deductInvestmentFromBalance = createAsyncThunk(
  'availableBalance/deductInvestment',
  async ({ 
    userId, 
    amount, 
    description, 
    sourceId, 
    coupleId 
  }: { 
    userId: string; 
    amount: number; 
    description: string; 
    sourceId: string; 
    coupleId?: string; 
  }) => {
    await availableBalanceService.deductInvestment(userId, amount, description, sourceId, coupleId);
    return await availableBalanceService.getCurrentBalance(userId, coupleId);
  }
);

const availableBalanceSlice = createSlice({
  name: 'availableBalance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch current balance
      .addCase(fetchCurrentBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBalance = action.payload;
      })
      .addCase(fetchCurrentBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch current balance';
      })
      
      // Fetch balance history
      .addCase(fetchBalanceHistory.fulfilled, (state, action) => {
        state.balanceHistory = action.payload;
      })
      
      // Fetch transaction history
      .addCase(fetchTransactionHistory.fulfilled, (state, action) => {
        state.transactionHistory = action.payload;
      })
      
      // Add income
      .addCase(addIncomeToBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addIncomeToBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBalance = action.payload;
      })
      .addCase(addIncomeToBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add income';
      })
      
      // Deduct spending
      .addCase(deductSpendingFromBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deductSpendingFromBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBalance = action.payload;
      })
      .addCase(deductSpendingFromBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to deduct spending';
      })
      
      // Deduct investment
      .addCase(deductInvestmentFromBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deductInvestmentFromBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBalance = action.payload;
      })
      .addCase(deductInvestmentFromBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to deduct investment';
      });
  },
});

export const { clearError, resetState } = availableBalanceSlice.actions;
export default availableBalanceSlice.reducer;
