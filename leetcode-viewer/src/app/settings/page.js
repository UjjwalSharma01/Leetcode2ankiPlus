'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getScriptUrlFromStorage, saveScriptUrl } from '@/utils/scriptUrlManager';
import { useData } from '@/context/DataContext';
import AuthLayout from '@/components/AuthLayout';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { user, resendVerificationEmail } = useAuth();
  const { refreshData } = useData();
  const router = useRouter();
  
  const [scriptUrl, setScriptUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isResending, setIsResending] = useState(false);
  
  useEffect(() => {
    // Load script URL from storage on component mount
    const loadScriptUrl = async () => {
      try {
        const savedUrl = await getScriptUrlFromStorage();
        if (savedUrl) {
          setScriptUrl(savedUrl);
        }
      } catch (error) {
        console.error('Failed to load script URL:', error);
      }
    };
    
    loadScriptUrl();
  }, []);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Pass the user ID correctly to the saveScriptUrl function
      await saveScriptUrl(user?.uid, scriptUrl);
      toast.success('Script URL saved successfully');
      // Refresh data to reflect potential new data from the script
      refreshData();
    } catch (error) {
      console.error('Failed to save script URL:', error);
      toast.error('Failed to save script URL');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Simple check to see if the URL responds
      const response = await axios.get('/api/proxy', {
        params: {
          url: scriptUrl
        }
      });
      
      if (response.data && response.status === 200) {
        setTestResult({
          success: true,
          message: 'Successfully connected to the script URL'
        });
        toast.success('Connection successful!');
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('Failed to test script URL:', error);
      setTestResult({
        success: false,
        message: 'Could not connect to the script URL. Please check it and try again.'
      });
      toast.error('Connection failed. Please check URL.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user || isResending) return;
    
    setIsResending(true);
    try {
      await resendVerificationEmail(user);
      toast.success('Verification email sent! Please check your inbox and spam folder.');
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      toast.error('Failed to send verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="px-4 py-6 space-y-8 settings-page">
        {/* Header with subtle gradient background */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-premium p-6 mb-8">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-blue-500/10 filter blur-xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-24 w-24 rounded-full bg-green-500/10 filter blur-xl"></div>
          
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
              Settings
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-3xl">
              Configure your LeetCode2AnkiPlus integration settings
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
          {/* Sidebar with information */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card border border-gray-100 dark:border-gray-700 p-6 sticky top-20">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">About Integration</h2>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  LeetCode2AnkiPlus uses a Google Apps Script to integrate with your Google Sheets.
                </p>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Important Note
                  </h3>
                  <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                    You need to deploy your script as a web application and use the web app URL. Make sure it's accessible to anyone (even anonymous) and properly configured for requests.
                  </p>
                </div>
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Need Help?</h4>
                  </div>
                  <div className="px-4 py-3">
                    <a 
                      href="https://github.com/UjjwalSharma01/Leetcode2ankiPlus/blob/master/README.md" 
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Documentation
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main settings form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information Card */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Information</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'Not available'}</p>
                  </div>
                  <div className="flex items-center">
                    {user?.emailVerified ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Not Verified
                        </span>
                        <button
                          onClick={handleResendVerification}
                          disabled={isResending}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                        >
                          {isResending ? 'Sending...' : 'Resend Verification'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Status</h3>
                  <div className="rounded-md bg-gray-50 dark:bg-gray-700/50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {user?.emailVerified 
                            ? 'Your account is fully verified and has access to all features.'
                            : 'You must verify your email address to access all features of LeetCode2AnkiPlus.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-xl shadow-card border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">LeetCode Script Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="script-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Google Apps Script Web App URL
                  </label>
                  <div className="mt-1">
                    <input
                      id="script-url"
                      name="script-url"
                      type="text"
                      className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md transition-all duration-200"
                      placeholder="https://script.google.com/macros/s/your-script-id/exec"
                      value={scriptUrl}
                      onChange={(e) => setScriptUrl(e.target.value)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter the URL from your deployed Google Apps Script web app
                  </p>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-lg ${
                    testResult.success 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-800'
                  }`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {testResult.success ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm">{testResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={!scriptUrl || isTesting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {isTesting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Testing...
                      </>
                    ) : (
                      <>Test Connection</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!scriptUrl || isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200 hover:shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>Save Settings</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* App Information Card */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 overflow-hidden rounded-xl shadow-card border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-md">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">About LeetCode2AnkiPlus</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Version 1.0</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                <p>LeetCode2AnkiPlus helps you track your LeetCode problem-solving journey and create spaced repetition reviews.</p>
              </div>
              <div className="mt-4 flex">
                <a 
                  href="https://github.com/UjjwalSharma01/Leetcode2ankiPlus"
                  className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit Project Page
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}