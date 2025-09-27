import React, { useEffect, useContext } from 'react';
import { useAppDispatch } from '../../store';
import { fetchUserProfile } from '../../store/slices/userSlice';
import { AuthContext } from '../../context/AuthContext';

interface ReduxUserProviderProps {
  children: React.ReactNode;
}

const ReduxUserProvider: React.FC<ReduxUserProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    console.log('ReduxUserProvider - user state:', user);
    if (user?.uid) {
      console.log('ReduxUserProvider - dispatching fetchUserProfile for:', user.uid);
      // Load user profile when user is authenticated
      dispatch(fetchUserProfile(user.uid));
    } else {
      console.log('ReduxUserProvider - no user or uid');
    }
  }, [user?.uid, dispatch]);

  return <>{children}</>;
};

export default ReduxUserProvider;
