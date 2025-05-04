'use client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { fetchLeetCodeProblems, getProblemStats } from '@/utils/leetcodeData';
import { fetchDueReviews } from '@/utils/reviewService';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

// Create the context
const DataContext = createContext();

// Provider component
export function DataProvider({ children }) {
  const [problems, setProblems] = useState([]);
  const [dueReviews, setDueReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviewsError, setReviewsError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [lastReviewsFetched, setLastReviewsFetched] = useState(null);
  const [needsScriptUrl, setNeedsScriptUrl] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(true); // Assume sync is in progress initially
  const [syncTimeout, setSyncTimeout] = useState(null);
  const [globalSyncId, setGlobalSyncId] = useState(Date.now()); // Used to track global sync events
  
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
        const timestamp = new Date().toISOString();
        setLastFetched(timestamp);
        
        // Update global sync ID to trigger updates across all components
        setGlobalSyncId(Date.now());
        
        // Also update reviews when problems are updated
        loadReviews(force);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user, problems.length, needsScriptUrl, syncInProgress]);

  // Load reviews function that can be called manually
  const loadReviews = useCallback(async (force = false) => {
    // Don't try to fetch data if not authenticated
    if (!user) return;
    
    // Skip fetching if data exists and force is false
    if (dueReviews.length > 0 && !force && !needsScriptUrl) {
      return;
    }
    
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      
      const reviews = await fetchDueReviews();
      setDueReviews(Array.isArray(reviews) ? reviews : []);
      const timestamp = new Date().toISOString();
      setLastReviewsFetched(timestamp);
      
      // Update global sync ID to trigger updates across all components
      setGlobalSyncId(Date.now());
    } catch (err) {
      console.error('Error fetching review data:', err);
      setReviewsError('Failed to load reviews. Please check your connection and try again.');
    } finally {
      setReviewsLoading(false);
    }
  }, [user, dueReviews.length, needsScriptUrl]);

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
      loadReviews();
    }
  }, [user, authLoading, loadData, loadReviews]);

  // Listen for script URL sync events
  useEffect(() => {
    const handleScriptUrlSync = (event) => {
      console.log('Script URL synced from Firebase, auto-refreshing data');
      
      // Script URL has been synced from Firebase, no longer waiting
      setSyncInProgress(false);
      if (syncTimeout) clearTimeout(syncTimeout);
      
      // Update global sync ID to trigger updates across all components
      setGlobalSyncId(Date.now());
      
      // Force refresh all data when script URL is updated
      loadData(true);
      loadReviews(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scriptUrlSynced', handleScriptUrlSync);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scriptUrlSynced', handleScriptUrlSync);
      }
    };
  }, [loadData, loadReviews, syncTimeout]);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if data is stale when tab becomes visible
        const currentTime = new Date();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Check problems data staleness
        const problemsDataIsStale = !lastFetched || 
          (new Date(currentTime) - new Date(lastFetched) > fiveMinutes);
        
        // Check reviews data staleness
        const reviewsDataIsStale = !lastReviewsFetched || 
          (new Date(currentTime) - new Date(lastReviewsFetched) > fiveMinutes);
        
        if (problemsDataIsStale) {
          console.log('Problems data is stale, refreshing...');
          loadData(true);
        }
        
        if (reviewsDataIsStale) {
          console.log('Reviews data is stale, refreshing...');
          loadReviews(true);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData, loadReviews, lastFetched, lastReviewsFetched]);

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

  // Refresh functions for manual data reloading
  const refreshData = useCallback(() => {
    loadData(true);
    // Update global sync ID to trigger updates across all components
    setGlobalSyncId(Date.now());
  }, [loadData]);
  
  const refreshReviews = useCallback(() => {
    loadReviews(true);
    // Update global sync ID to trigger updates across all components
    setGlobalSyncId(Date.now());
  }, [loadReviews]);

  // Refresh both problem and review data at once
  const refreshAllData = useCallback(() => {
    loadData(true);
    loadReviews(true);
    // Update global sync ID to trigger updates across all components
    setGlobalSyncId(Date.now());
  }, [loadData, loadReviews]);

  // Context value
  const value = {
    problems,
    dueReviews,
    stats,
    loading,
    reviewsLoading,
    error,
    reviewsError,
    refreshData,
    refreshReviews,
    refreshAllData,
    lastFetched,
    lastReviewsFetched,
    isAuthenticated: !!user,
    needsScriptUrl,
    syncInProgress,
    globalSyncId
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