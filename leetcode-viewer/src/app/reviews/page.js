'use client';

import { useState, useEffect, useRef } from 'react';
import AuthLayout from '@/components/AuthLayout';
import Link from 'next/link';
import { completeReview } from '@/utils/reviewService';
import { useData } from '@/context/DataContext';

export default function ReviewsPage() {
  const { 
    dueReviews, 
    upcomingReviews,
    reviewsLoading, 
    upcomingReviewsLoading,
    reviewsError, 
    refreshReviews, 
    refreshUpcomingReviews,
    refreshAllData, 
    lastReviewsFetched,
    loadUpcomingReviews,
    globalSyncId
  } = useData();
  
  const [activeReview, setActiveReview] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showUpcoming, setShowUpcoming] = useState(false); // Toggle state for showing upcoming/due reviews
  const fetchingInProgress = useRef(false); // Add a ref to track if a fetch is in progress
  
  // Load upcoming reviews from DataContext when component mounts or when globalSyncId changes
  useEffect(() => {
    // Only call if not already loading and data is actually needed
    if (!upcomingReviewsLoading && 
        upcomingReviews.length === 0 && 
        !reviewsLoading && 
        !fetchingInProgress.current) {
      fetchingInProgress.current = true;
      // Add a small delay to allow multiple components to initialize before triggering fetch
      const timer = setTimeout(() => {
        loadUpcomingReviews();
        fetchingInProgress.current = false;
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loadUpcomingReviews, upcomingReviewsLoading, upcomingReviews.length, reviewsLoading, globalSyncId]);

  // Update the timestamp when reviews data changes
  useEffect(() => {
    if (lastReviewsFetched) {
      setLastUpdated(new Date(lastReviewsFetched).toLocaleString());
    }
  }, [lastReviewsFetched]);

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

  const startReview = (problem) => {
    setActiveReview(problem);
  };

  const handleReviewComplete = async (difficulty) => {
    if (!activeReview) return;
    
    try {
      await completeReview(activeReview, difficulty);
      
      // Update local completed state
      const newCompleted = [...completed, activeReview.id];
      setCompleted(newCompleted);
      setActiveReview(null);
      
      // Save completed state in sessionStorage
      try {
        sessionStorage.setItem('reviewsCompleted', JSON.stringify(newCompleted));
      } catch (err) {
        console.error('Error saving completed reviews to session:', err);
      }
      
      // Refresh all data to ensure consistency across tabs
      refreshAllData();
    } catch (err) {
      console.error('Failed to complete review:', err);
    }
  };

  const handleSkip = () => {
    // Move to the next problem (component will re-render with updated dueReviews)
    if (!activeReview) return;
    setActiveReview(null);
    
    // Refresh reviews to get updated order
    refreshReviews();
  };

  const toggleReviewMode = () => {
    setShowUpcoming(!showUpcoming);
  };

  // Format relative date for upcoming reviews
  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    
    // Handle both string dates and Date objects
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.error("Invalid date string:", dateStr);
      return 'Invalid date';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === 2) {
      return 'Day after tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const isLoading = reviewsLoading || upcomingReviewsLoading;

  if (isLoading && dueReviews.length === 0 && upcomingReviews.length === 0) {
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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Scheduled Reviews</h1>
            <p className="mt-1 sm:mt-2 text-gray-600 dark:text-gray-400">
              Review your LeetCode problems with spaced repetition
            </p>
          </div>
          
          <div className="flex space-x-2">
            {/* Toggle Button - Always visible regardless of review state */}
            <button
              onClick={toggleReviewMode}
              className={`self-start sm:self-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm 
                ${showUpcoming 
                  ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300' 
                  : 'text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300'}`}
            >
              {showUpcoming ? 'Show Due Today' : 'Show Upcoming'}
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={() => refreshAllData()}
              disabled={isLoading}
              className="self-start sm:self-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
              title="Refresh reviews"
            >
              {isLoading ? (
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
        </div>
    
        {reviewsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-400">{reviewsError}</p>
              </div>
            </div>
          </div>
        )}
    
        {activeReview ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 break-words">{activeReview.title}</h2>
            <div className="mb-4">
              <div className="flex flex-wrap gap-y-1">
                <p className="text-gray-700 dark:text-gray-300 w-full sm:w-auto sm:mr-4">Problem #{activeReview.id}</p>
                <p className="text-gray-700 dark:text-gray-300">Review #{activeReview.reviewCount + 1}</p>
              </div>
              {activeReview.details && activeReview.details.URL && (
                <div className="mt-3 sm:mt-2">
                  <a 
                    href={activeReview.details.URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-words"
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
                  className="px-4 py-3 sm:py-2 bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-500 rounded transition-colors w-full sm:w-auto min-h-[44px]"
                >
                  Easy
                </button>
                <button 
                  onClick={() => handleReviewComplete('medium')} 
                  className="px-4 py-3 sm:py-2 bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-500 rounded transition-colors w-full sm:w-auto min-h-[44px]"
                >
                  Medium
                </button>
                <button 
                  onClick={() => handleReviewComplete('hard')} 
                  className="px-4 py-3 sm:py-2 bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-500 rounded transition-colors w-full sm:w-auto min-h-[44px]"
                >
                  Hard
                </button>
                <button 
                  onClick={handleSkip} 
                  className="px-4 py-3 sm:py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded transition-colors w-full sm:w-auto min-h-[44px]"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (dueReviews.length > 0 || upcomingReviews.length > 0) && (
              <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-green-500 dark:border-green-400 rounded-full"></div>
                Refreshing...
              </div>
            )}

            {/* Review Section - Toggles between Due Today and Upcoming */}
            {!showUpcoming && dueReviews.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 mb-6">
                <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
                  <span className="inline-block bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 px-2 py-1 rounded-md mr-2">
                    Due Today
                  </span>
                  <span>({dueReviews.length})</span>
                  {upcomingReviews.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      (+ {upcomingReviews.length} upcoming)
                    </span>
                  )}
                </h2>
                
                {/* Mobile view - card layout */}
                <div className="sm:hidden space-y-4">
                  {dueReviews.map(problem => (
                    <div key={problem.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                      <div className="font-medium text-gray-900 dark:text-gray-100 break-words">
                        {problem.title}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2">
                        <span>Problem #{problem.id}</span>
                        <span>•</span>
                        <span>Review #{problem.reviewCount}</span>
                      </div>
                      <button 
                        onClick={() => startReview(problem)}
                        className="mt-3 w-full py-3 bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded-md text-center text-sm font-medium transition-colors min-h-[44px]"
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
            ) : showUpcoming && upcomingReviews.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 mb-6">
                <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
                  <span className="inline-block bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded-md mr-2">
                    Upcoming
                  </span>
                  <span>({upcomingReviews.length})</span>
                  {dueReviews.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ({dueReviews.length} due today)
                    </span>
                  )}
                </h2>
                
                {/* Mobile view - card layout for Upcoming Reviews */}
                <div className="sm:hidden space-y-4">
                  {upcomingReviews.map(problem => {
                    // Get ID and title safely, handling different property names
                    const id = problem.ID || problem.Id || problem.id || "N/A";
                    const title = problem.Title || problem.title || "Untitled";
                    const nextReviewDate = problem['Next Review Date'] || problem.nextReviewDate;
                    
                    return (
                      <div key={id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                        <div className="font-medium text-gray-900 dark:text-gray-100 break-words">
                          {title}
                        </div>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2">
                          <span>Problem #{id}</span>
                          <span>•</span>
                          <span>{formatRelativeDate(nextReviewDate)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Desktop view - table layout for Upcoming Reviews */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {upcomingReviews.map(problem => {
                        // Get ID and title safely, handling different property names
                        const id = problem.ID || problem.Id || problem.id || "N/A";
                        const title = problem.Title || problem.title || "Untitled";
                        const nextReviewDate = problem['Next Review Date'] || problem.nextReviewDate;
                        
                        return (
                          <tr key={id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                              {id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatRelativeDate(nextReviewDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
                <div className="text-center py-8 sm:py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                    {showUpcoming ? "No Upcoming Reviews" : "No Reviews Due Today"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 px-4">
                    {showUpcoming 
                      ? "There are no problems scheduled for future review." 
                      : "There are no problems due for review today."}
                  </p>
                  <div className="mt-6">
                    <Link href="/problems" className="inline-flex items-center px-4 py-3 sm:py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors min-h-[44px]">
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
          Last updated: {lastUpdated || "Never"}
        </div>
      </div>
    </AuthLayout>
  );
}