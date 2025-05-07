'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { auth } from '@/firebase/firebase';

// Loading component for Suspense fallback
function VerificationLoading() {
  return (
    <div className="text-center p-8">
      <div className="mx-auto h-16 w-16 relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-blue-500 blur-md opacity-70 animate-pulse"></div>
        <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-t-green-500 border-r-blue-500 border-b-green-500 border-l-blue-500 border-opacity-30"></div>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Initializing verification...</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Please wait a moment while we set up your verification process...
      </p>
    </div>
  );
}

// The actual verification component that uses useSearchParams
function VerificationContent() {
  const [verificationState, setVerificationState] = useState('verifying'); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const { verifyEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    setMounted(true);
    
    const oobCode = searchParams.get('oobCode');
    
    if (!oobCode) {
      setVerificationState('error');
      setErrorMessage('Invalid verification link. Please request a new verification email.');
      return;
    }
    
    const verifyEmailAddress = async () => {
      try {
        // Apply the verification code
        await verifyEmail(oobCode);
        
        setVerificationState('success');
      } catch (error) {
        console.error('Error verifying email:', error);
        setVerificationState('error');
        
        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('This verification link has expired or already been used. Please request a new verification email.');
        } else {
          setErrorMessage('Failed to verify your email. Please try again later or contact support.');
        }
      }
    };
    
    if (oobCode) {
      verifyEmailAddress();
    }
  }, [verifyEmail, searchParams]);

  const renderContent = () => {
    switch (verificationState) {
      case 'verifying':
        return (
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 relative mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-blue-500 blur-md opacity-70 animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-t-green-500 border-r-blue-500 border-b-green-500 border-l-blue-500 border-opacity-30"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verifying your email</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we verify your email address...
            </p>
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email Verified!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Thank you for verifying your email address. You now have full access to all features.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-800">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Please <strong>refresh this page</strong> or click the button below to access the dashboard with your verified account.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
              >
                Refresh Page
              </button>
              
              <Link 
                href="/"
                className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        );
        
      case 'error':
        return (
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verification Failed</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
              <Link 
                href="/login"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Go to Login
              </Link>
              {/* Show "Resend verification" option here in the future if needed */}
            </div>
          </div>
        );
    }
  };

  return renderContent();
}

// Main component that wraps VerificationContent in Suspense
export default function VerifyEmail() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-r from-blue-400/20 to-green-500/20 blur-3xl opacity-50 transform -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-green-400/20 to-blue-500/20 blur-3xl opacity-50 transform translate-y-1/3"></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.02] dark:opacity-[0.05]" 
           style={{ 
             backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z\' fill=\'%23000000\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             backgroundSize: '100px 100px' 
           }}>
      </div>

      <div className={`relative z-10 max-w-md w-full transition-all duration-700 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        {/* Logo & Branding */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl mb-6 transform transition-all duration-300 hover:scale-110">
            <span className="text-white text-2xl font-bold">L2A+</span>
          </div>
          <h1 className="mt-2 text-center text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Email Verification
          </h1>
        </div>
        
        {/* Verification Card */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-premium border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300">
          <Suspense fallback={<VerificationLoading />}>
            <VerificationContent />
          </Suspense>
        </div>
        
        {/* Footer */}
        <div className="mt-8 flex justify-center">
          <a 
            href="https://github.com/UjjwalSharma01/Leetcode2ankiPlus" 
            target="_blank"
            rel="noopener noreferrer" 
            className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors hover:scale-105 transform"
          >
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Part of the LeetCode2AnkiPlus project
          </a>
        </div>
      </div>
    </div>
  );
}
