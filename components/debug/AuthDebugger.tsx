import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';

const AuthDebugger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthDebugger - auth object:', auth);
    
    if (!auth) {
      console.log('AuthDebugger - No auth, setting loading to false');
      setLoading(false);
      setAuthError('Firebase auth not initialized');
      return;
    }

    console.log('AuthDebugger - Setting up auth listener');
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('AuthDebugger - Timeout reached, forcing loading to false');
      setLoading(false);
      setAuthError('Auth timeout - assuming no user');
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        console.log('AuthDebugger - Auth state changed:', user);
        clearTimeout(timeout);
        setUser(user);
        setLoading(false);
        setAuthError(null);
      },
      (error) => {
        console.error('AuthDebugger - Auth error:', error);
        clearTimeout(timeout);
        setLoading(false);
        setAuthError(error.message);
      }
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading authentication...</p>
          <p className="text-gray-500 text-sm mt-2">Debug: Checking Firebase auth state</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthDebugger;
