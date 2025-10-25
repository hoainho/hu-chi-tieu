import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Transaction } from '../../types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '../../services/firestoreService';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

const initialState: TransactionState = {
  transactions: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchTransactions = createAsyncThunk(
  'transaction/fetchTransactions',
  async (userId: string, { rejectWithValue }) => {
    try {
      const transactions = await getTransactions(userId);
      return transactions;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách giao dịch');
    }
  }
);

export const createTransaction = createAsyncThunk(
  'transaction/createTransaction',
  async (transactionData: Omit<Transaction, 'id'>, { rejectWithValue }) => {
    try {
      const docRef = await addTransaction(transactionData);
      return { ...transactionData, id: docRef.id } as Transaction;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tạo giao dịch');
    }
  }
);

export const updateTransactionData = createAsyncThunk(
  'transaction/updateTransaction',
  async ({ id, updates }: { id: string; updates: Partial<Transaction> }, { rejectWithValue }) => {
    try {
      await updateTransaction(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể cập nhật giao dịch');
    }
  }
);

export const removeTransaction = createAsyncThunk(
  'transaction/removeTransaction',
  async ({ transactionId, userId }: { transactionId: string; userId: string }, { rejectWithValue }) => {
    try {
      await deleteTransaction(transactionId);
      return transactionId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể xóa giao dịch');
    }
  }
);

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        // Convert Firestore Timestamps to ISO strings
        const transactions = action.payload.map(transaction => ({
          ...transaction,
          date: (transaction.date as any)?.toDate ? (transaction.date as any).toDate().toISOString() : transaction.date
        }));
        state.transactions = transactions;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create transaction
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.transactions.push(action.payload);
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Update transaction
      .addCase(updateTransactionData.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
          state.transactions[index] = { ...state.transactions[index], ...updates };
        }
      })
      .addCase(updateTransactionData.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Remove transaction
      .addCase(removeTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter(t => t.id !== action.payload);
      })
      .addCase(removeTransaction.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = transactionSlice.actions;
export default transactionSlice.reducer;
