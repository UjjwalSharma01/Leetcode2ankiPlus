'use client';

import { useState, useEffect } from 'react';
import AuthLayout from '@/components/AuthLayout';
import Link from 'next/link';
import { completeReview } from '@/utils/reviewService';
import { useData } from '@/context/DataContext';

export default function ReviewsPage() {
  const { 
    dueReviews, 
    reviewsLoading, 
    reviewsError, 
    refreshReviews, 
    refreshAllData, 
    lastReviewsFetched,
    globalSyncId
  } = useData();
  
  const [activeReview, setActiveReview] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  if (reviewsLoading && dueReviews.length === 0) {
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
          
          {/* Refresh Button */}
          <button
            onClick={refreshReviews}
            disabled={reviewsLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
            title="Refresh reviews"
          >
            {reviewsLoading ? (
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
            {reviewsLoading && dueReviews.length > 0 && (
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
          Last updated: {lastUpdated || "Never"}
        </div>
      </div>
    </AuthLayout>
  );
}