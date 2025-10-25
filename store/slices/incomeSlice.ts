import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IncomeSource } from '../../types';
import { getIncomes, addIncome, updateIncome, deleteIncome } from '../../services/firestoreService';

interface IncomeState {
  incomes: IncomeSource[];
  loading: boolean;
  error: string | null;
}

const initialState: IncomeState = {
  incomes: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchIncomes = createAsyncThunk(
  'income/fetchIncomes',
  async (userId: string, { rejectWithValue }) => {
    try {
      const incomes = await getIncomes(userId);
      return incomes;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách thu nhập');
    }
  }
);

export const createIncome = createAsyncThunk(
  'income/createIncome',
  async (incomeData: Omit<IncomeSource, 'id'>, { rejectWithValue }) => {
    try {
      const docRef = await addIncome(incomeData);
      return { ...incomeData, id: docRef.id } as IncomeSource;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tạo thu nhập');
    }
  }
);

export const updateIncomeData = createAsyncThunk(
  'income/updateIncome',
  async ({ id, updates }: { id: string; updates: Partial<IncomeSource> }, { rejectWithValue }) => {
    try {
      await updateIncome(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể cập nhật thu nhập');
    }
  }
);

export const removeIncome = createAsyncThunk(
  'income/removeIncome',
  async ({ incomeId, userId }: { incomeId: string; userId: string }, { rejectWithValue }) => {
    try {
      await deleteIncome(incomeId);
      return incomeId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể xóa thu nhập');
    }
  }
);

const incomeSlice = createSlice({
  name: 'income',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch incomes
      .addCase(fetchIncomes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncomes.fulfilled, (state, action) => {
        state.loading = false;
        // Convert Firestore Timestamps to ISO strings
        const incomes = action.payload.map(income => ({
          ...income,
          date: (income.date as any)?.toDate ? (income.date as any).toDate().toISOString() : income.date
        }));
        state.incomes = incomes;
      })
      .addCase(fetchIncomes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create income
      .addCase(createIncome.fulfilled, (state, action) => {
        state.incomes.push(action.payload);
      })
      .addCase(createIncome.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Update income
      .addCase(updateIncomeData.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.incomes.findIndex(i => i.id === id);
        if (index !== -1) {
          state.incomes[index] = { ...state.incomes[index], ...updates };
        }
      })
      .addCase(updateIncomeData.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Remove income
      .addCase(removeIncome.fulfilled, (state, action) => {
        state.incomes = state.incomes.filter(i => i.id !== action.payload);
      })
      .addCase(removeIncome.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = incomeSlice.actions;
export default incomeSlice.reducer;
