'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Link from 'next/link';

export default function AuthLayout({ children }) {
  const { user, loading, resendVerificationEmail } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/landing');
      } else {
        // Add a small animation delay for the content appearance
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setIsReady(true);
          setIsTransitioning(false);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, user, router]);

  const handleResendEmail = async () => {
    if (!user || isSending) return;
    
    setIsSending(true);
    try {
      await resendVerificationEmail(user);
      setResendSuccess(true);
      // Reset success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Failed to resend verification email:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center">
          {/* Enhanced loading spinner with pulsing effect */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-blue-500 blur-md opacity-70 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-t-green-500 border-r-blue-500 border-b-green-500 border-l-blue-500 border-opacity-30"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 animate-pulse font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Block access if email is not verified
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-premium border border-gray-100 dark:border-gray-700 overflow-hidden p-8">
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Email Verification Required</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You need to verify your email address before you can access LeetCode2AnkiPlus.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              We&apos;ve sent a verification link to <span className="font-medium">{user.email}</span>
            </p>
            
            {resendSuccess && (
              <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-700 dark:text-green-400 text-sm">
                  Verification email sent! Please check your inbox and spam folder.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={handleResendEmail}
                disabled={isSending}
                className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  "Resend Verification Email"
                )}
              </button>
              <Link 
                href="/login"
                className="w-full block text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-all duration-500 ease-in-out ${isTransitioning ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'}`}>
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Subtle background pattern effect */}
      <div className="absolute inset-0 z-0 opacity-[0.015] dark:opacity-[0.03]" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23000000\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '100px 100px' 
           }}>
      </div>

      <main className="flex-grow w-full max-w-full overflow-x-hidden px-2 sm:px-0 relative z-10">
        <div className="mx-auto w-full max-w-7xl py-4 transition-all duration-300 ease-out transform-gpu">
          {children}
        </div>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 shadow-lg text-center py-6 text-sm relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white dark:from-gray-900 dark:to-gray-800 opacity-50"></div>
        {/* Subtle top border gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
        {/* Subtle bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent blur-sm"></div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p className="text-gray-600 dark:text-gray-300">
              © {new Date().getFullYear()} LeetCode2AnkiPlus
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://github.com/UjjwalSharma01/Leetcode2ankiPlus" 
                className="text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200 flex items-center hover:scale-105 transform"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}