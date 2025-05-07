'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode
} from 'firebase/auth';
import { auth } from '@/firebase/firebase';
import { getScriptUrlFromFirebase, getScriptUrlFromStorage } from '@/utils/scriptUrlManager';
import { fetchLeetCodeProblems } from '@/utils/leetcodeData';

// Create auth context
const AuthContext = createContext({});

// Context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);

  // Function to login with email and password
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Function to register with email and password
  const signup = async (email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    return userCredential;
  };

  // Function to send password reset email
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Function to resend verification email
  const resendVerificationEmail = (user) => {
    return sendEmailVerification(user);
  };
  
  // Function to apply action code (for email verification)
  const verifyEmail = (actionCode) => {
    return applyActionCode(auth, actionCode);
  };

  // Function to logout
  const logout = async () => {
    setUser(null);
    await signOut(auth);
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Check if email is verified and show alert if needed
        if (!user.emailVerified) {
          setShowVerificationAlert(true);
        } else {
          setShowVerificationAlert(false);
        }
        
        // Sync script URL from Firebase to localStorage when user logs in
        // This ensures consistent experience across devices
        try {
          const scriptUrl = await getScriptUrlFromFirebase(user.uid);
          
          // If we got a valid script URL and there's no data in local storage,
          // trigger a data fetch automatically
          if (scriptUrl && typeof window !== 'undefined') {
            // We'll force a refresh by dispatching a custom event that DataContext can listen for
            const event = new CustomEvent('scriptUrlSynced', { detail: { scriptUrl } });
            window.dispatchEvent(event);
            
            // Directly try to fetch data as a fallback approach
            try {
              await fetchLeetCodeProblems();
            } catch (error) {
              console.error("Error auto-fetching problems after login:", error);
            }
          }
        } catch (error) {
          console.error("Error syncing script URL on login:", error);
        }
      } else {
        setUser(null);
        setShowVerificationAlert(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      resetPassword, 
      resendVerificationEmail,
      verifyEmail,
      loading,
      showVerificationAlert,
      setShowVerificationAlert 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);