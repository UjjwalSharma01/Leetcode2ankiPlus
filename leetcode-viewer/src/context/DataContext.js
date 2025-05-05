'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { fetchLeetCodeProblems, getProblemStats } from '@/utils/leetcodeData';
import { fetchDueReviews, fetchAllScheduledReviews } from '@/utils/reviewService';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

// Create the context
const DataContext = createContext();

// Provider component
export function DataProvider({ children }) {
  const [problems, setProblems] = useState([]);
  const [dueReviews, setDueReviews] = useState([]);
  const [upcomingReviews, setUpcomingReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [upcomingReviewsLoading, setUpcomingReviewsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviewsError, setReviewsError] = useState(null);
  const [upcomingReviewsError, setUpcomingReviewsError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [lastReviewsFetched, setLastReviewsFetched] = useState(null);
  const [lastUpcomingReviewsFetched, setLastUpcomingReviewsFetched] = useState(null);
  const [needsScriptUrl, setNeedsScriptUrl] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(true); // Assume sync is in progress initially
  const [syncTimeout, setSyncTimeout] = useState(null);
  const [globalSyncId, setGlobalSyncId] = useState(Date.now()); // Used to track global sync events
  
  // New cache control variables
  const [fetchingProblems, setFetchingProblems] = useState(false);
  const [fetchingDueReviews, setFetchingDueReviews] = useState(false);
  const [fetchingAllReviews, setFetchingAllReviews] = useState(false);
  const [fetchingUpcomingReviews, setFetchingUpcomingReviews] = useState(false);
  const [pendingFetchProblems, setPendingFetchProblems] = useState(false);
  const [pendingFetchReviews, setPendingFetchReviews] = useState(false);
  const [pendingFetchUpcomingReviews, setPendingFetchUpcomingReviews] = useState(false);
  const [cacheValidTime] = useState(15 * 60 * 1000); // 15 minutes in milliseconds (increased from 5)
  
  // Track if initial data is loaded to avoid redundant API calls
  const initialDataLoaded = useRef({
    problems: false,
    dueReviews: false,
    upcomingReviews: false
  });
  
  // Use a ref to track the active route
  const currentPathRef = useRef('');
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Helper function to check if data is stale
  const isDataStale = useCallback((lastFetchTimestamp) => {
    if (!lastFetchTimestamp) return true;
    const currentTime = new Date();
    return (new Date(currentTime) - new Date(lastFetchTimestamp) > cacheValidTime);
  }, [cacheValidTime]);

  // Track when data was last refreshed to avoid redundant updates
  const lastRefreshTime = useRef({
    problems: 0,
    dueReviews: 0,
    upcomingReviews: 0
  });

  // Helper to store cached data in session storage
  const cacheDataInSession = useCallback((key, data, timestamp) => {
    try {
      if (typeof window !== 'undefined') {
        // Store the data and timestamp together
        window.sessionStorage.setItem(key, JSON.stringify({
          data,
          timestamp,
          syncId: globalSyncId
        }));
        console.log(`Cached ${key} data in session storage`);
      }
    } catch (err) {
      console.warn('Failed to cache data in session storage', err);
    }
  }, [globalSyncId]);

  // Helper to retrieve cached data from session storage
  const getDataFromCache = useCallback((key) => {
    try {
      if (typeof window !== 'undefined') {
        const cachedData = window.sessionStorage.getItem(key);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Check if cache is still valid
          if (!isDataStale(parsed.timestamp)) {
            console.log(`Using ${key} data from session storage cache`);
            return parsed.data;
          } else {
            console.log(`${key} cache is stale, will fetch fresh data`);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve data from session storage', err);
    }
    return null;
  }, [isDataStale]);

  // Load data function that can be called manually - wrapped in useCallback to avoid unnecessary recreations
  const loadData = useCallback(async (force = false) => {
    // Don't try to fetch data if not authenticated
    if (!user) return;
    
    // Check for cached data in session storage first (only if not forcing refresh)
    const cachedData = !force ? getDataFromCache('leetcode_problems') : null;
    if (cachedData) {
      setProblems(cachedData);
      setStats(getProblemStats(cachedData));
      // Set last fetched from cache timestamp
      const cached = JSON.parse(window.sessionStorage.getItem('leetcode_problems'));
      setLastFetched(cached.timestamp);
      initialDataLoaded.current.problems = true;
      return;
    }
    
    // Skip fetching if data exists, force is false, cache is valid, and not flagged for URL check
    if (problems.length > 0 && !force && !needsScriptUrl && !isDataStale(lastFetched)) {
      console.log('Using cached problems data, skip fetching');
      initialDataLoaded.current.problems = true;
      return;
    }
    
    // Throttle refreshes to prevent multiple rapid refreshes - but only if not forcing
    const now = Date.now();
    if (!force && now - lastRefreshTime.current.problems < 3000) {
      console.log('Throttling problem data refresh, too soon after previous refresh');
      return;
    }
    lastRefreshTime.current.problems = now;
    
    // Prevent duplicate fetch requests
    if (fetchingProblems) {
      if (force) {
        console.log('Force refresh requested, continuing despite in-progress fetch');
      } else {
        console.log('Problems fetch already in progress, skipping redundant request');
        setPendingFetchProblems(true);
        return;
      }
    }
    
    try {
      setLoading(true);
      setFetchingProblems(true);
      setError(null);
      
      console.log('Fetching problems data from API' + (force ? ' (forced refresh)' : ''));
      // Pass true for skipUrlCheck during initial login when syncInProgress is true
      // Also pass force parameter to fetchLeetCodeProblems
      const data = await fetchLeetCodeProblems(syncInProgress, force);
      
      // Check if we got a special response indicating missing script URL
      if (data && data.needsScriptUrl) {
        console.log("Script URL not configured, flagging for settings redirect");
        setNeedsScriptUrl(true);
        setProblems([]);
        setStats({});
      } else {
        setNeedsScriptUrl(false);
        const problemsData = Array.isArray(data) ? data : [];
        setProblems(problemsData);
        setStats(getProblemStats(problemsData));
        const timestamp = new Date().toISOString();
        setLastFetched(timestamp);
        initialDataLoaded.current.problems = true;
        
        // Cache the data in session storage - only if not a forced refresh
        if (!force) {
          cacheDataInSession('leetcode_problems', problemsData, timestamp);
        } else {
          console.log('Skipping cache update for forced refresh');
          // Clear the existing cache when forced
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('leetcode_problems');
          }
        }
        
        // Update global sync ID to trigger updates across all components
        setGlobalSyncId(Date.now());
        
        // Broadcast that data has been refreshed
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('leetcodeDataRefreshed', {
            detail: { timestamp, syncId: Date.now(), forced: force }
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setFetchingProblems(false);
      setPendingFetchProblems(false);
    }
  }, [user, problems.length, needsScriptUrl, syncInProgress, lastFetched, 
      fetchingProblems, isDataStale, getDataFromCache, cacheDataInSession]);

  // Load reviews function that can be called manually
  const loadReviews = useCallback(async (force = false) => {
    // Don't try to fetch data if not authenticated
    if (!user) return;
    
    // Check for cached data in session storage first
    const cachedData = !force ? getDataFromCache('due_reviews') : null;
    if (cachedData) {
      setDueReviews(cachedData);
      // Set last fetched from cache timestamp
      const cached = JSON.parse(window.sessionStorage.getItem('due_reviews'));
      setLastReviewsFetched(cached.timestamp);
      initialDataLoaded.current.dueReviews = true;
      return;
    }
    
    // Skip fetching if data exists, force is false, and cache is valid
    if (dueReviews.length > 0 && !force && !needsScriptUrl && !isDataStale(lastReviewsFetched)) {
      console.log('Using cached due reviews data, skip fetching');
      initialDataLoaded.current.dueReviews = true;
      return;
    }
    
    // Throttle refreshes to prevent multiple rapid refreshes
    const now = Date.now();
    if (!force && now - lastRefreshTime.current.dueReviews < 3000) { // Increased from 2s to 3s threshold
      console.log('Throttling due reviews refresh, too soon after previous refresh');
      return;
    }
    lastRefreshTime.current.dueReviews = now;
    
    // Prevent duplicate fetch requests
    if (fetchingDueReviews) {
      console.log('Due reviews fetch already in progress, skipping redundant request');
      setPendingFetchReviews(true);
      return;
    }
    
    try {
      setReviewsLoading(true);
      setFetchingDueReviews(true);
      setReviewsError(null);
      
      console.log('Fetching due reviews data from API');
      const reviews = await fetchDueReviews();
      
      const reviewsData = Array.isArray(reviews) ? reviews : [];
      setDueReviews(reviewsData);
      const timestamp = new Date().toISOString();
      setLastReviewsFetched(timestamp);
      initialDataLoaded.current.dueReviews = true;
      
      // Cache the data in session storage
      cacheDataInSession('due_reviews', reviewsData, timestamp);
      
      // Update global sync ID to trigger updates across all components
      setGlobalSyncId(Date.now());
      
      // Broadcast that review data has been refreshed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('reviewsDataRefreshed', {
          detail: { timestamp, syncId: Date.now() }
        }));
      }
    } catch (err) {
      console.error('Error fetching review data:', err);
      setReviewsError('Failed to load reviews. Please check your connection and try again.');
    } finally {
      setReviewsLoading(false);
      setFetchingDueReviews(false);
      setPendingFetchReviews(false);
    }
  }, [user, dueReviews.length, needsScriptUrl, lastReviewsFetched, 
      fetchingDueReviews, isDataStale, getDataFromCache, cacheDataInSession]);

  // Load upcoming reviews
  const loadUpcomingReviews = useCallback(async (forceRefresh = false) => {
    try {
      // Skip if script URL isn't configured or user isn't logged in
      if (!user || !needsScriptUrl || fetchingUpcomingReviews) return;
      
      // Don't refresh if we just did recently (unless forced)
      if (!forceRefresh && lastUpcomingReviewsFetched 
          && (new Date() - new Date(lastUpcomingReviewsFetched) < 60000)) {
        return;
      }
      
      setFetchingUpcomingReviews(true);
      
      // Check if we have cached data
      if (!forceRefresh) {
        const cachedData = getDataFromCache('upcoming_reviews');
        if (cachedData) {
          setUpcomingReviews(cachedData.data);
          setLastUpcomingReviewsFetched(cachedData.timestamp);
          setFetchingUpcomingReviews(false);
          initialDataLoaded.current.upcomingReviews = true;
          return;
        }
      }
      
      // Fetch all scheduled reviews (includes upcoming)
      const allReviews = await fetchAllScheduledReviews(forceRefresh);
      
      // Filter out the due reviews (today or earlier) to find upcoming ones
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get a list of all due review IDs for filtering
      const dueReviewIds = new Set(dueReviews.map(r => r.id));
      
      // Filter for upcoming reviews only (future dates that aren't in dueReviews)
      const upcoming = allReviews.filter(review => {
        try {
          // Get the review date field (handle different property names)
          const reviewDate = review.nextReviewDate || review['Next Review Date'];
          if (!reviewDate) {
            console.error("Missing review date:", review);
            return false;
          }
          
          // Skip if this review is already in the due reviews
          const reviewId = review.id || review.ID || review.Id;
          if (dueReviewIds.has(reviewId)) return false;
          
          // Convert to date object if needed
          const nextReview = reviewDate instanceof Date ? reviewDate : new Date(reviewDate);
          if (isNaN(nextReview.getTime())) {
            console.error("Invalid review date:", reviewDate);
            return false;
          }
          
          nextReview.setHours(0, 0, 0, 0);
          
          // Make sure today's date has hours reset for accurate comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          return nextReview > today;
        } catch (e) {
          console.error("Error parsing date for review:", e);
          return false;
        }
      }).sort((a, b) => {
        // Sort by date ascending
        const dateA = new Date(a.nextReviewDate || a['Next Review Date']);
        const dateB = new Date(b.nextReviewDate || b['Next Review Date']);
        return dateA - dateB;
      });
      
      console.log(`Found ${upcoming.length} upcoming reviews`);
      setUpcomingReviews(upcoming);
      const timestamp = new Date().toISOString();
      setLastUpcomingReviewsFetched(timestamp);
      initialDataLoaded.current.upcomingReviews = true;
      
      // Cache the data in session storage
      cacheDataInSession('upcoming_reviews', upcoming, timestamp);
      
    } catch (err) {
      console.error('Error fetching upcoming review data:', err);
      setUpcomingReviewsError('Failed to load upcoming reviews. Please check your connection and try again.');
    } finally {
      setFetchingUpcomingReviews(false);
      setPendingFetchUpcomingReviews(false);
    }
  }, [user, needsScriptUrl, fetchingUpcomingReviews, lastUpcomingReviewsFetched, dueReviews]);

  // Track page changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set initial path
      currentPathRef.current = window.location.pathname;
      
      // Listen for route changes
      const handleRouteChange = () => {
        const newPath = window.location.pathname;
        if (newPath !== currentPathRef.current) {
          console.log(`Route changed from ${currentPathRef.current} to ${newPath}`);
          currentPathRef.current = newPath;
          
          // Check if we need to refresh data based on route
          const checkDataFreshness = () => {
            const problemsDataIsStale = isDataStale(lastFetched);
            const reviewsDataIsStale = isDataStale(lastReviewsFetched);
            
            // Load appropriate data based on the current route
            if (newPath === '/' || newPath === '/dashboard' || newPath === '/problems') {
              if (problemsDataIsStale) {
                console.log('Problems data is stale on route change, refreshing');
                loadData();
              }
            }
            
            if (newPath === '/reviews') {
              if (reviewsDataIsStale) {
                console.log('Reviews data is stale on route change, refreshing');
                loadReviews();
                loadUpcomingReviews();
              }
            }
          };
          
          // Slight delay to let the route change complete
          setTimeout(checkDataFreshness, 100);
        }
      };
      
      // Use MutationObserver to detect changes in the DOM that might indicate route changes
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            if (window.location.pathname !== currentPathRef.current) {
              handleRouteChange();
            }
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href']
      });
      
      // Clean up
      return () => observer.disconnect();
    }
  }, [loadData, loadReviews, loadUpcomingReviews, lastFetched, lastReviewsFetched, isDataStale]);

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

  // Process any pending fetches if another fetch completes
  useEffect(() => {
    if (pendingFetchProblems && !fetchingProblems) {
      setPendingFetchProblems(false);
      loadData(true);
    }
    
    if (pendingFetchReviews && !fetchingDueReviews) {
      setPendingFetchReviews(false);
      loadReviews(true);
    }
    
    if (pendingFetchUpcomingReviews && !fetchingUpcomingReviews) {
      setPendingFetchUpcomingReviews(false);
      loadUpcomingReviews(true);
    }
  }, [
    fetchingProblems, fetchingDueReviews, fetchingUpcomingReviews,
    pendingFetchProblems, pendingFetchReviews, pendingFetchUpcomingReviews, 
    loadData, loadReviews, loadUpcomingReviews
  ]);

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
      loadUpcomingReviews(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scriptUrlSynced', handleScriptUrlSync);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scriptUrlSynced', handleScriptUrlSync);
      }
    };
  }, [loadData, loadReviews, loadUpcomingReviews, syncTimeout]);

  // Listen for data refresh events from other components
  useEffect(() => {
    const handleDataRefresh = (event) => {
      if (event.detail && event.detail.syncId !== globalSyncId) {
        console.log('Data refresh detected from another component');
        // Check if we need to refresh our local state
        loadData();
      }
    };
    
    const handleReviewsRefresh = (event) => {
      if (event.detail && event.detail.syncId !== globalSyncId) {
        console.log('Reviews refresh detected from another component');
        // Check if we need to refresh our local state
        loadReviews();
      }
    };
    
    const handleUpcomingRefresh = (event) => {
      if (event.detail && event.detail.syncId !== globalSyncId) {
        console.log('Upcoming reviews refresh detected from another component');
        // Check if we need to refresh our local state
        loadUpcomingReviews();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('leetcodeDataRefreshed', handleDataRefresh);
      window.addEventListener('reviewsDataRefreshed', handleReviewsRefresh);
      window.addEventListener('upcomingReviewsRefreshed', handleUpcomingRefresh);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('leetcodeDataRefreshed', handleDataRefresh);
        window.removeEventListener('reviewsDataRefreshed', handleReviewsRefresh);
        window.removeEventListener('upcomingReviewsRefreshed', handleUpcomingRefresh);
      }
    };
  }, [loadData, loadReviews, loadUpcomingReviews, globalSyncId]);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking data freshness');
        
        // Get current route
        const currentPath = window.location.pathname;
        
        // Check if data is stale when tab becomes visible
        const problemsDataIsStale = isDataStale(lastFetched);
        const reviewsDataIsStale = isDataStale(lastReviewsFetched);
        const upcomingDataIsStale = isDataStale(lastUpcomingReviewsFetched);
        
        // Only refresh data relevant to the current page to avoid unnecessary API calls
        if (currentPath === '/' || currentPath === '/dashboard' || currentPath === '/problems' || currentPath === '/settings') {
          if (problemsDataIsStale) {
            console.log('Problems data is stale, refreshing...');
            loadData(true);
          }
        }
        
        if (currentPath === '/reviews') {
          if (reviewsDataIsStale) {
            console.log('Reviews data is stale, refreshing...');
            loadReviews(true);
          }
          
          if (upcomingDataIsStale) {
            console.log('Upcoming reviews data is stale, refreshing...');
            loadUpcomingReviews(true);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData, loadReviews, loadUpcomingReviews, lastFetched, lastReviewsFetched, lastUpcomingReviewsFetched, isDataStale]);

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
  
  const refreshUpcomingReviews = useCallback(() => {
    loadUpcomingReviews(true);
    // Update global sync ID to trigger updates across all components
    setGlobalSyncId(Date.now());
  }, [loadUpcomingReviews]);

  // Refresh both problem and review data at once
  const refreshAllData = useCallback(() => {
    loadData(true);
    loadReviews(true);
    loadUpcomingReviews(true);
    // Update global sync ID to trigger updates across all components
    setGlobalSyncId(Date.now());
  }, [loadData, loadReviews, loadUpcomingReviews]);

  // Context value
  const value = {
    problems,
    dueReviews,
    upcomingReviews,
    stats,
    loading,
    reviewsLoading,
    upcomingReviewsLoading,
    error,
    reviewsError,
    refreshData,
    refreshReviews,
    refreshUpcomingReviews,
    refreshAllData,
    loadUpcomingReviews,
    lastFetched,
    lastReviewsFetched,
    lastUpcomingReviewsFetched,
    isAuthenticated: !!user,
    needsScriptUrl,
    syncInProgress,
    globalSyncId,
    isDataStale
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