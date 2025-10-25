import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SavingsGoal, SavingsGoalTransaction } from '../../types';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  depositToSavingsGoal,
  withdrawFromSavingsGoal,
  getSavingsGoalTransactions
} from '../../services/firestoreService';

interface SavingsGoalState {
  goals: SavingsGoal[];
  transactions: Record<string, SavingsGoalTransaction[]>; // goalId -> transactions
  loading: boolean;
  error: string | null;
}

const initialState: SavingsGoalState = {
  goals: [],
  transactions: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchSavingsGoals = createAsyncThunk(
  'savingsGoal/fetchGoals',
  async (userId: string, { rejectWithValue }) => {
    try {
      const goals = await getSavingsGoals(userId);
      return goals;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải danh sách quỹ tiết kiệm');
    }
  }
);

export const createGoal = createAsyncThunk(
  'savingsGoal/createGoal',
  async (goalData: Omit<SavingsGoal, 'id'>, { rejectWithValue }) => {
    try {
      const docRef = await createSavingsGoal(goalData);
      return { ...goalData, id: docRef.id } as SavingsGoal;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tạo quỹ tiết kiệm');
    }
  }
);

export const updateGoal = createAsyncThunk(
  'savingsGoal/updateGoal',
  async ({ id, updates }: { id: string; updates: Partial<SavingsGoal> }, { rejectWithValue }) => {
    try {
      await updateSavingsGoal(id, updates);
      return { id, updates };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể cập nhật quỹ tiết kiệm');
    }
  }
);

export const deleteGoal = createAsyncThunk(
  'savingsGoal/deleteGoal',
  async (goalId: string, { rejectWithValue }) => {
    try {
      await deleteSavingsGoal(goalId);
      return goalId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể xóa quỹ tiết kiệm');
    }
  }
);

export const depositToGoal = createAsyncThunk(
  'savingsGoal/deposit',
  async (
    {
      goalId,
      amount,
      description,
      spendingSourceId,
      ownerId,
    }: {
      goalId: string;
      amount: number;
      description?: string;
      spendingSourceId?: string;
      ownerId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const newAmount = await depositToSavingsGoal(goalId, amount, description, spendingSourceId, ownerId);
      return { goalId, newAmount };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể nạp tiền vào quỹ');
    }
  }
);

export const withdrawFromGoal = createAsyncThunk(
  'savingsGoal/withdraw',
  async (
    {
      goalId,
      amount,
      description,
      spendingSourceId,
      ownerId,
    }: {
      goalId: string;
      amount: number;
      description?: string;
      spendingSourceId?: string;
      ownerId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const newAmount = await withdrawFromSavingsGoal(goalId, amount, description, spendingSourceId, ownerId);
      return { goalId, newAmount };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể rút tiền từ quỹ');
    }
  }
);

export const fetchGoalTransactions = createAsyncThunk(
  'savingsGoal/fetchTransactions',
  async (goalId: string, { rejectWithValue }) => {
    try {
      const transactions = await getSavingsGoalTransactions(goalId);
      return { goalId, transactions };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Không thể tải lịch sử giao dịch');
    }
  }
);

const savingsGoalSlice = createSlice({
  name: 'savingsGoal',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch goals
      .addCase(fetchSavingsGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavingsGoals.fulfilled, (state, action) => {
        state.loading = false;
        // Convert Firestore Timestamps to ISO strings
        const goals = action.payload.map(goal => ({
          ...goal,
          createdAt: (goal.createdAt as any)?.toDate ? (goal.createdAt as any).toDate().toISOString() : goal.createdAt,
          updatedAt: (goal.updatedAt as any)?.toDate ? (goal.updatedAt as any).toDate().toISOString() : goal.updatedAt,
          deadline: (goal.deadline as any)?.toDate ? (goal.deadline as any).toDate().toISOString() : goal.deadline
        }));
        state.goals = goals;
      })
      .addCase(fetchSavingsGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create goal
      .addCase(createGoal.fulfilled, (state, action) => {
        state.goals.unshift(action.payload);
      })
      .addCase(createGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Update goal
      .addCase(updateGoal.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.goals.findIndex(g => g.id === id);
        if (index !== -1) {
          state.goals[index] = { ...state.goals[index], ...updates };
        }
      })
      .addCase(updateGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Delete goal
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.goals = state.goals.filter(g => g.id !== action.payload);
        delete state.transactions[action.payload];
      })
      .addCase(deleteGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Deposit
      .addCase(depositToGoal.fulfilled, (state, action) => {
        const { goalId, newAmount } = action.payload;
        const goal = state.goals.find(g => g.id === goalId);
        if (goal) {
          goal.currentAmount = newAmount;
          // Check if goal is completed
          if (newAmount >= goal.targetAmount && goal.status !== 'completed') {
            goal.status = 'completed';
          }
        }
      })
      .addCase(depositToGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Withdraw
      .addCase(withdrawFromGoal.fulfilled, (state, action) => {
        const { goalId, newAmount } = action.payload;
        const goal = state.goals.find(g => g.id === goalId);
        if (goal) {
          goal.currentAmount = newAmount;
        }
      })
      .addCase(withdrawFromGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Fetch transactions
      .addCase(fetchGoalTransactions.fulfilled, (state, action) => {
        const { goalId, transactions } = action.payload;
        state.transactions[goalId] = transactions;
      })
      .addCase(fetchGoalTransactions.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = savingsGoalSlice.actions;
export default savingsGoalSlice.reducer;
