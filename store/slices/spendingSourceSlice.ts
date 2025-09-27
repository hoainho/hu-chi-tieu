import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SpendingSource } from '../../types';
import { 
  getSpendingSources, 
  addSpendingSource, 
  updateSpendingSource, 
  deleteSpendingSource,
  updateSpendingSourceBalance
} from '../../services/firestoreService';

interface SpendingSourceState {
  spendingSources: SpendingSource[];
  loading: boolean;
  error: string | null;
}

const initialState: SpendingSourceState = {
  spendingSources: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchSpendingSources = createAsyncThunk(
  'spendingSource/fetchSpendingSources',
  async (userId: string, { rejectWithValue }) => {
    try {
      const spendingSources = await getSpendingSources(userId);
      return spendingSources;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách nguồn chi tiêu');
    }
  }
);

export const createSpendingSource = createAsyncThunk(
  'spendingSource/createSpendingSource',
  async (spendingSourceData: Omit<SpendingSource, 'id'>, { rejectWithValue }) => {
    try {
      const docRef = await addSpendingSource(spendingSourceData);
      return { ...spendingSourceData, id: docRef.id } as SpendingSource;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tạo nguồn chi tiêu');
    }
  }
);

export const updateSpendingSourceData = createAsyncThunk(
  'spendingSource/updateSpendingSource',
  async ({ id, updates }: { id: string; updates: Partial<SpendingSource> }, { rejectWithValue }) => {
    try {
      await updateSpendingSource(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể cập nhật nguồn chi tiêu');
    }
  }
);

export const removeSpendingSource = createAsyncThunk(
  'spendingSource/removeSpendingSource',
  async ({ spendingSourceId, userId }: { spendingSourceId: string; userId: string }, { rejectWithValue }) => {
    try {
      await deleteSpendingSource(spendingSourceId);
      return spendingSourceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể xóa nguồn chi tiêu');
    }
  }
);

export const updateBalance = createAsyncThunk(
  'spendingSource/updateBalance',
  async ({ 
    spendingSourceId, 
    amount, 
    operation, 
    description 
  }: { 
    spendingSourceId: string; 
    amount: number; 
    operation: 'add' | 'subtract';
    description: string;
  }, { rejectWithValue }) => {
    try {
      const newBalance = await updateSpendingSourceBalance(spendingSourceId, amount, operation);
      return { spendingSourceId, newBalance, amount, operation, description };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể cập nhật số dư');
    }
  }
);

const spendingSourceSlice = createSlice({
  name: 'spendingSource',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch spending sources
      .addCase(fetchSpendingSources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSpendingSources.fulfilled, (state, action) => {
        state.loading = false;
        state.spendingSources = action.payload;
      })
      .addCase(fetchSpendingSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create spending source
      .addCase(createSpendingSource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSpendingSource.fulfilled, (state, action) => {
        state.loading = false;
        state.spendingSources.unshift(action.payload);
      })
      .addCase(createSpendingSource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update spending source
      .addCase(updateSpendingSourceData.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.spendingSources.findIndex(source => source.id === id);
        if (index !== -1) {
          state.spendingSources[index] = { ...state.spendingSources[index], ...updates };
        }
      })
      
      // Remove spending source
      .addCase(removeSpendingSource.fulfilled, (state, action) => {
        state.spendingSources = state.spendingSources.filter(source => source.id !== action.payload);
      })
      
      // Update balance
      .addCase(updateBalance.fulfilled, (state, action) => {
        const { spendingSourceId, newBalance } = action.payload;
        const index = state.spendingSources.findIndex(source => source.id === spendingSourceId);
        if (index !== -1) {
          state.spendingSources[index].balance = newBalance;
        }
      });
  },
});

export const { clearError } = spendingSourceSlice.actions;
export default spendingSourceSlice.reducer;
