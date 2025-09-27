import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../services/firebase';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('useAuth - auth object:', auth);
        
        // If Firebase is not configured, auth will be null.
        if (!auth) {
            console.log('useAuth - auth is null, setting loading to false');
            setLoading(false);
            return;
        }

        console.log('useAuth - setting up onAuthStateChanged listener');
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('useAuth - onAuthStateChanged triggered, user:', user);
            setUser(user);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => {
            console.log('useAuth - cleaning up listener');
            unsubscribe();
        };
    }, []);

    return { user, loading };
};