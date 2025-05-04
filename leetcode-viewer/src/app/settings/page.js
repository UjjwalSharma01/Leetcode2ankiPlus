'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { getScriptUrlFromStorage, saveScriptUrl } from '@/utils/scriptUrlManager';
import { useData } from '@/context/DataContext';
import AuthLayout from '@/components/AuthLayout';

export default function Settings() {
  const [scriptUrl, setScriptUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { lastFetched, refreshData } = useData();

  useEffect(() => {
    // Load saved URL from localStorage on component mount
    const savedValue = getScriptUrlFromStorage();
    setScriptUrl(savedValue);
    setSavedUrl(savedValue);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      // Clean URL and ensure no trailing slash
      const cleanUrl = scriptUrl.trim();
      const testUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getProblems`;
      
      console.log("Testing connection to:", testUrl);
      
      try {
        // Use axios which automatically follows redirects
        const response = await axios.get(testUrl, {
          headers: {
            'Accept': 'application/json, text/plain, */*',
          },
          timeout: 30000,
          maxRedirects: 5,
          withCredentials: false,
        });
        
        console.log("Response status:", response.status);
        console.log("Response type:", typeof response.data);
        
        // Check if we got a valid response
        let isValidResponse = false;
        
        if (response.status === 200) {
          // Case 1: JSON response with problems array
          if (response.data && response.data.problems) {
            console.log(`Found ${response.data.problems.length} problems in response`);
            isValidResponse = true;
          }
          // Case 2: Direct array in the response
          else if (Array.isArray(response.data)) {
            console.log(`Found ${response.data.length} problems in response array`);
            isValidResponse = true;
          }
          // Case 3: Contains "success" text or status parameter
          else if (
            (typeof response.data === 'object' && (response.data.success || response.data.status === 'online')) ||
            (typeof response.data === 'string' && response.data.includes('success'))
          ) {
            console.log("Found success indicator in response");
            isValidResponse = true;
          }
        }
        
        if (!isValidResponse) {
          console.warn("Invalid response from Google Apps Script:", response.data);
          throw new Error("Google Apps Script returned an invalid response. Make sure your script ID is correct.");
        }
        
        // Save to both Firebase (if user is logged in) and localStorage
        await saveScriptUrl(user?.uid || null, cleanUrl);
        
        setSavedUrl(cleanUrl);
        setMessage({ 
          type: 'success', 
          text: user ? 'Settings saved successfully! Your settings will sync across all your devices.' : 'Settings saved successfully! Google Apps Script connection is working.' 
        });
        
        // Refresh data after successfully updating the script URL
        refreshData();
        
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        throw new Error(`Connection error: ${fetchError.message}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'error', 
        text: `${error.message}. Make sure your Apps Script is deployed as a web app with 'Anyone' access.` 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Settings</h1>
          
          <form onSubmit={handleSave}>
            <div className="mb-6">
              <label htmlFor="scriptUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Google Apps Script URL
              </label>
              <input
                type="url"
                id="scriptUrl"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://script.google.com/macros/s/..."
                required
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter the URL of your deployed Google Apps Script web app.
                {user && " Your settings will sync across all your devices."}
              </p>
            </div>
            
            {message.text && (
              <div className={`p-4 mb-4 rounded-md ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
                {message.text}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Testing Connection...' : 'Save Settings'}
              </button>
              
              {savedUrl && (
                <button
                  type="button"
                  onClick={() => router.push('/problems')}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  View Problems
                </button>
              )}
            </div>
          </form>
          
          <div className="mt-6">
            {lastFetched && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                Last updated: {new Date(lastFetched).toLocaleString()}
              </div>
            )}
          </div>
          
          <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Help</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p>To use this app, you need to:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  Deploy the <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">GoogleAppsScript.gs</code> file 
                  as a web app in Google Apps Script.
                </li>
                <li>
                  Set the script to be accessible to &quot;Anyone, even anonymous&quot;.
                </li>
                <li>
                  Copy the deployed web app URL and paste it here.
                </li>
              </ol>
              <p className="mt-4">
                When you click &quot;Save Settings&quot;, the app will test the connection to 
                make sure it can access your Google Sheet data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}