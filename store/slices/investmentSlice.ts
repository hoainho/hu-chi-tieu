import { createSlice } from '@reduxjs/toolkit';

interface InvestmentState {
  investments: any[];
  loading: boolean;
  error: string | null;
}

const initialState: InvestmentState = {
  investments: [],
  loading: false,
  error: null,
};

const investmentSlice = createSlice({
  name: 'investment',
  initialState,
  reducers: {
    // Placeholder reducers
  },
});

export default investmentSlice.reducer;
