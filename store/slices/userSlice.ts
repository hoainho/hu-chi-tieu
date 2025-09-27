import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../types';
import { getUserProfile } from '../../services/firestoreService';
import autoSetupService from '../../services/autoSetupService';
import { timestampToISOString } from '../../utils/dateHelpers';

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      console.log('fetchUserProfile - starting for userId:', userId);
      const profile = await getUserProfile(userId);
      console.log('fetchUserProfile - got profile:', profile);
      
      if (!profile) {
        throw new Error("Không thể tải hồ sơ người dùng.");
      }

      // Validate profile structure before auto-setup
      if (!profile.preferences) {
        console.error('Profile missing preferences:', profile);
        throw new Error('Profile thiếu thông tin preferences');
      }

      // Check if user needs auto-setup (first time login)
      const needsSetup = await autoSetupService.shouldAutoSetup(profile);
      if (needsSetup) {
        console.log('New user detected, setting up default data...');
        console.log('Profile before setup:', profile);
        await autoSetupService.setupNewUser(profile);
        // Refetch profile after setup
        const updatedProfile = await getUserProfile(userId);
        console.log('fetchUserProfile - updated profile after setup:', updatedProfile);
        return updatedProfile;
      }

      console.log('fetchUserProfile - returning profile:', profile);
      return profile;
    } catch (error: any) {
      console.error('fetchUserProfile - error:', error);
      return rejectWithValue(error.message || 'Không thể tải hồ sơ người dùng');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUser: (state) => {
      state.profile = null;
      state.error = null;
    },
    setProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        // Convert Firestore Timestamps to ISO strings for Redux serialization
        const profile = { ...action.payload };
        if (profile.createdAt) {
          (profile.createdAt as any) = timestampToISOString(profile.createdAt);
        }
        state.profile = profile;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUser, setProfile } = userSlice.actions;
export default userSlice.reducer;
