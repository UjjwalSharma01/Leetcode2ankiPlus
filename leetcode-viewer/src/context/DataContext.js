'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { fetchLeetCodeProblems, getProblemStats } from '@/utils/leetcodeData';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

// Create the context
const DataContext = createContext();

// Provider component
export function DataProvider({ children }) {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [needsScriptUrl, setNeedsScriptUrl] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(true); // Assume sync is in progress initially
  const [syncTimeout, setSyncTimeout] = useState(null);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Load data function that can be called manually - wrapped in useCallback to avoid unnecessary recreations
  const loadData = useCallback(async (force = false) => {
    // Don't try to fetch data if not authenticated
    if (!user) return;
    
    // Skip fetching if data exists and force is false
    if (problems.length > 0 && !force && !needsScriptUrl) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Pass true for skipUrlCheck during initial login when syncInProgress is true
      const data = await fetchLeetCodeProblems(syncInProgress);
      
      // Check if we got a special response indicating missing script URL
      if (data && data.needsScriptUrl) {
        console.log("Script URL not configured, flagging for settings redirect");
        setNeedsScriptUrl(true);
        setProblems([]);
        setStats({});
      } else {
        setNeedsScriptUrl(false);
        setProblems(Array.isArray(data) ? data : []);
        setStats(getProblemStats(Array.isArray(data) ? data : []));
        setLastFetched(new Date().toISOString());
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user, problems.length, needsScriptUrl, syncInProgress]);

  // Set up a sync timeout to stop waiting after a reasonable time
  useEffect(() => {
    if (user && syncInProgress) {
      // Wait for 5 seconds max for Firebase sync, then stop waiting
      const timeout = setTimeout(() => {
        console.log("Firebase sync timeout reached, no longer waiting");
        setSyncInProgress(false);
        
        // Force a reload of data after sync timeout
        loadData(true);
      }, 5000);
      
      setSyncTimeout(timeout);
      
      return () => clearTimeout(timeout);
    }
  }, [user, syncInProgress, loadData]);

  // Initial data load when user is authenticated
  useEffect(() => {
    // Only attempt to load data when auth state is settled and user is logged in
    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading, loadData]);

  // Listen for script URL sync events
  useEffect(() => {
    const handleScriptUrlSync = (event) => {
      console.log('Script URL synced from Firebase, auto-refreshing data');
      
      // Script URL has been synced from Firebase, no longer waiting
      setSyncInProgress(false);
      if (syncTimeout) clearTimeout(syncTimeout);
      
      loadData(true); // Force refresh data when script URL is updated
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scriptUrlSynced', handleScriptUrlSync);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scriptUrlSynced', handleScriptUrlSync);
      }
    };
  }, [loadData, syncTimeout]);

  // Redirect to settings page if script URL is needed
  useEffect(() => {
    if (needsScriptUrl && !syncInProgress && !loading && !authLoading && user) {
      console.log("Redirecting to settings page due to missing script URL");
      
      // Create notification in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('notification', JSON.stringify({
          type: 'warning',
          message: 'Please configure your Google Script URL to start using the app'
        }));
      }
      
      // Redirect to settings page
      router.push('/settings');
    }
  }, [needsScriptUrl, syncInProgress, loading, authLoading, user, router]);

  // Refresh function for manual data reloading
  const refreshData = useCallback(() => loadData(true), [loadData]);

  // Context value
  const value = {
    problems,
    stats,
    loading: loading || (authLoading && !problems.length), // Show loading if auth is loading or data is loading
    error,
    refreshData,
    lastFetched,
    isAuthenticated: !!user,
    needsScriptUrl,
    syncInProgress
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// Custom hook for using the data context
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}