'use client';

import { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import Link from 'next/link';
import { fetchDueReviews, completeReview } from '@/utils/reviewService';
import { useData } from '@/context/DataContext';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
const REVIEWS_CACHE_KEY = 'leetcode_reviews_cache';

export default function ReviewsPage() {
  const { problems, loading, error, refreshData, lastFetched } = useData();
  const [activeReview, setActiveReview] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [dueReviews, setDueReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewError, setReviewError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [lastGlobalFetch, setLastGlobalFetch] = useState(null);

  // Update when global data changes (dashboard/problems/settings sync)
  useEffect(() => {
    // Skip first run or when lastFetched hasn't changed
    if (lastGlobalFetch === lastFetched || !lastFetched) {
      setLastGlobalFetch(lastFetched);
      return;
    }

    // If global data was refreshed, refresh reviews too
    if (lastFetched && lastFetched !== lastGlobalFetch) {
      console.log('Global data refreshed, syncing review data...');
      refreshReviews();
      setLastGlobalFetch(lastFetched);
    }
  }, [lastFetched, lastGlobalFetch]);

  // Load reviews with cache-first strategy
  useEffect(() => {
    async function loadReviews() {
      try {
        setLoadingReviews(true);
        
        // Try to get data from cache first
        const cachedData = getCachedReviewsData();
        
        if (cachedData) {
          // Use cached data if available
          setDueReviews(cachedData.reviews);
          setLastUpdated(cachedData.timestamp);
          setReviewError(null);
          setLoadingReviews(false);
          setInitialLoadComplete(true);
          
          // If cache is not stale, we can stop here
          if (!isCacheStale(cachedData.timestamp)) {
            return;
          }
          
          // If cache is stale, we'll refresh in the background
          setLoadingReviews(true);
        }
        
        // Fetch fresh data
        const reviews = await fetchDueReviews();
        const timestamp = new Date().toLocaleString();
        
        // Update state
        setDueReviews(reviews);
        setLastUpdated(timestamp);
        setReviewError(null);
        
        // Cache the data
        cacheReviewsData(reviews, timestamp);
      } catch (err) {
        // If we have cached data, keep using it even if refresh fails
        const cachedData = getCachedReviewsData();
        if (cachedData && !initialLoadComplete) {
          setDueReviews(cachedData.reviews);
          setLastUpdated(cachedData.timestamp);
          setReviewError('Failed to refresh reviews, showing cached data.');
        } else {
          setReviewError('Failed to load reviews. Please try again later.');
        }
        console.error(err);
      } finally {
        setLoadingReviews(false);
        setInitialLoadComplete(true);
      }
    }
    
    loadReviews();
    
    // Handle tab visibility changes for efficient refreshing
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const cachedData = getCachedReviewsData();
        if (!cachedData || isCacheStale(cachedData.timestamp)) {
          loadReviews();
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialLoadComplete]);

  // Function to check if cache is stale
  function isCacheStale(timestamp) {
    if (!timestamp) return true;
    const cachedTime = new Date(timestamp).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - cachedTime) > CACHE_DURATION;
  }

  // Function to get cached reviews data
  function getCachedReviewsData() {
    if (typeof window === 'undefined') return null;
    try {
      const cachedData = localStorage.getItem(REVIEWS_CACHE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('Error retrieving cache:', err);
    }
    return null;
  }

  // Function to cache reviews data
  function cacheReviewsData(reviews, timestamp) {
    if (typeof window === 'undefined') return;
    try {
      const cacheData = {
        reviews,
        timestamp,
        expiresAt: new Date().getTime() + CACHE_DURATION
      };
      localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Error caching reviews data:', err);
    }
  }

  // Function to refresh reviews data
  const refreshReviews = async () => {
    try {
      setLoadingReviews(true);
      
      // Fetch fresh data
      const reviews = await fetchDueReviews();
      const timestamp = new Date().toLocaleString();
      
      // Update state
      setDueReviews(reviews);
      setLastUpdated(timestamp);
      setReviewError(null);
      
      // Cache the data
      cacheReviewsData(reviews, timestamp);
    } catch (err) {
      setReviewError('Failed to refresh reviews. Please try again later.');
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const startReview = (problem) => {
    setActiveReview(problem);
  };

  const handleReviewComplete = async (difficulty) => {
    if (!activeReview) return;
    
    try {
      await completeReview(activeReview, difficulty);
      
      // Update local state
      const updatedReviews = dueReviews.filter(p => p.id !== activeReview.id);
      const newCompleted = [...completed, activeReview.id];
      const timestamp = new Date().toLocaleString();
      
      setCompleted(newCompleted);
      setDueReviews(updatedReviews);
      setActiveReview(null);
      setLastUpdated(timestamp);
      
      // Update cache with new state
      cacheReviewsData(updatedReviews, timestamp);
      
      // Refresh global data to ensure data consistency
      refreshData();
      
      // Save completed state in sessionStorage to persist during tab switches
      try {
        const sessionCompleted = JSON.parse(sessionStorage.getItem('reviewsCompleted') || '[]');
        sessionStorage.setItem('reviewsCompleted', JSON.stringify([...sessionCompleted, activeReview.id]));
      } catch (err) {
        console.error('Error saving completed reviews to session:', err);
      }
    } catch (err) {
      setReviewError('Failed to complete review. Please try again.');
      console.error(err);
    }
  };

  const handleSkip = () => {
    // Move current problem to the end of the queue
    if (!activeReview) return;
    const updatedReviews = [...dueReviews.filter(p => p.id !== activeReview.id), activeReview];
    setDueReviews(updatedReviews);
    setActiveReview(null);
    
    // Update cache with new state
    cacheReviewsData(updatedReviews, lastUpdated);
  };

  // Load completed reviews from sessionStorage on mount
  useEffect(() => {
    try {
      const sessionCompleted = JSON.parse(sessionStorage.getItem('reviewsCompleted') || '[]');
      if (sessionCompleted.length > 0) {
        setCompleted(sessionCompleted);
      }
    } catch (err) {
      console.error('Error loading completed reviews from session:', err);
    }
  }, []);

  // Combined loading state from both problems and reviews
  const isLoading = loading || (loadingReviews && dueReviews.length === 0 && !initialLoadComplete);

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-green-400"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="px-4 py-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Scheduled Reviews</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review your LeetCode problems with spaced repetition
            </p>
          </div>
          
          {/* Refresh Button - similar to problems page */}
          <button
            onClick={refreshReviews}
            disabled={loadingReviews}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
            title="Refresh reviews"
          >
            {loadingReviews ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
    
        {(error || reviewError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error || reviewError}</p>
              </div>
            </div>
          </div>
        )}
    
        {activeReview ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{activeReview.title}</h2>
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300">Problem #{activeReview.id}</p>
              <p className="text-gray-700 dark:text-gray-300">Review #{activeReview.reviewCount + 1}</p>
              {activeReview.details && activeReview.details.URL && (
                <div className="mt-2">
                  <a 
                    href={activeReview.details.URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View Problem on LeetCode
                  </a>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="mb-4 font-medium text-gray-800 dark:text-gray-200">How difficult was this problem for you?</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleReviewComplete('easy')} 
                  className="px-4 py-3 sm:py-2 bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-500 rounded transition-colors w-full sm:w-auto"
                >
                  Easy
                </button>
                <button 
                  onClick={() => handleReviewComplete('medium')} 
                  className="px-4 py-3 sm:py-2 bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-500 rounded transition-colors w-full sm:w-auto"
                >
                  Medium
                </button>
                <button 
                  onClick={() => handleReviewComplete('hard')} 
                  className="px-4 py-3 sm:py-2 bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-500 rounded transition-colors w-full sm:w-auto"
                >
                  Hard
                </button>
                <button 
                  onClick={handleSkip} 
                  className="px-4 py-3 sm:py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded transition-colors w-full sm:w-auto"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {loadingReviews && dueReviews.length > 0 && (
              <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-green-500 dark:border-green-400 rounded-full"></div>
                Refreshing...
              </div>
            )}
          
            {dueReviews.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
                <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Due for Review ({dueReviews.length})</h2>
                
                {/* Mobile view - card layout */}
                <div className="sm:hidden space-y-4">
                  {dueReviews.map(problem => (
                    <div key={problem.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {problem.title}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Problem #{problem.id} • Review #{problem.reviewCount}
                      </div>
                      <button 
                        onClick={() => startReview(problem)}
                        className="mt-2 w-full py-2 bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded-md text-center text-sm font-medium transition-colors"
                      >
                        Start Review
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Desktop view - table layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Review Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {dueReviews.map(problem => (
                        <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{problem.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{problem.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{problem.reviewCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => startReview(problem)}
                              className="text-green-600 hover:text-green-900 dark:text-green-500 dark:hover:text-green-400"
                            >
                              Start Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No Reviews Due</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    There are no problems scheduled for review at this time.
                  </p>
                  <div className="mt-6">
                    <Link href="/problems" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors">
                      View All Problems
                    </Link>
                  </div>
                </div>
              </div>
            )}
      
            {completed.length > 0 && (
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      You've completed {completed.length} review{completed.length !== 1 ? 's' : ''} today!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Add timestamp at the bottom */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Last updated: {lastUpdated}
        </div>
      </div>
    </AuthLayout>
  );
}