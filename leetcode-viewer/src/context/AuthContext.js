'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '@/firebase/firebase';

// Create auth context
const AuthContext = createContext({});

// Context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to login with email and password
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Function to register with email and password
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Function to logout
  const logout = async () => {
    setUser(null);
    await signOut(auth);
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);