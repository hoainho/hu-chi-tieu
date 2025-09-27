import { createSlice } from '@reduxjs/toolkit';

interface BudgetState {
  budgets: any[];
  loading: boolean;
  error: string | null;
}

const initialState: BudgetState = {
  budgets: [],
  loading: false,
  error: null,
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    // Placeholder reducers
  },
});

export default budgetSlice.reducer;
