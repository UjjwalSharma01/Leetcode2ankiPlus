import axios from 'axios';
import { getScriptUrlFromStorage } from './scriptUrlManager';

// Request tracking to prevent duplicate in-flight requests
const pendingRequests = {};

/**
 * Fetches problems due for review
 */
export async function fetchDueReviews(forceRefresh = false) {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }
    
    // Create a unique request ID 
    const requestId = `getDueReviews`;
    
    // If there's already a request in progress for this action, return that promise
    // unless forceRefresh is true, in which case we cancel existing requests
    if (pendingRequests[requestId] && !forceRefresh) {
      console.log('Reusing existing promise for getDueReviews');
      return pendingRequests[requestId];
    } else if (forceRefresh && pendingRequests[requestId]) {
      // Clean up any pending requests when force refresh is requested
      delete pendingRequests[requestId];
      console.log('Forcing new request for getDueReviews, ignoring pending request');
    }
    
    // If forceRefresh is true, add it to the query parameters
    const forceParam = forceRefresh ? `&forceRefresh=true&nocache=${Date.now()}` : '';
    
    // Create a new request and store its promise
    const requestPromise = axios.get(`/api/proxy?url=${encodeURIComponent(scriptUrl)}&action=getDueReviews${forceParam}`, {
      timeout: 30000,
      headers: forceRefresh ? {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      } : {}
    })
    .then(response => {
      // On success, return the data and clean up the pending request
      if (response.status === 200 && response.data && response.data.dueReviews) {
        return response.data.dueReviews;
      }
      return [];
    })
    .finally(() => {
      // Clean up the pending request regardless of success/failure
      delete pendingRequests[requestId];
    });
    
    // Store the promise for potential reuse
    pendingRequests[requestId] = requestPromise;
    return requestPromise;
  } catch (error) {
    console.error('Error fetching due reviews:', error);
    return [];
  }
}

/**
 * Completes a review
 */
export async function completeReview(problem, difficulty, complete = true) {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }
    
    // Use the proxy API route instead of calling Google Apps Script directly
    const response = await axios.post('/api/proxy', {
      scriptUrl,
      action: 'completeReview',
      id: problem.id,
      difficulty, // 'easy', 'medium', or 'hard'
      complete    // boolean indicating if problem was completed successfully
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error completing review:', error);
    throw error;
  }
}

/**
 * Adds a problem to review schedule
 */
export async function addProblemToReview(problemId, title, days = 1, updateIfExists = false) {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }
    
    // Use the proxy API route instead of calling Google Apps Script directly
    const response = await axios.post('/api/proxy', {
      scriptUrl,
      action: 'addToReview',
      id: problemId,
      title, // Optional - will be fetched from main sheet if not provided
      days,  // Optional - days until first review (default 1)
      updateIfExists // Optional - whether to update if problem already exists
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding problem to review:', error);
    throw error;
  }
}

/**
 * Adds all problems to review that aren't already in the review schedule
 */
export async function bulkAddProblemsToReview() {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }
    
    // Use the proxy API route instead of calling Google Apps Script directly
    const response = await axios.post('/api/proxy', {
      scriptUrl,
      action: 'bulkAddToReview',
      bulkType: 'all'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error bulk adding problems to review:', error);
    throw error;
  }
}

/**
 * Adds problems solved today to review
 */
export async function addTodaysProblemsToReview(daysUntilReview = 1) {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }
    
    // Use the proxy API route instead of calling Google Apps Script directly
    const response = await axios.post('/api/proxy', {
      scriptUrl,
      action: 'bulkAddToReview',
      bulkType: 'today',
      days: daysUntilReview
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding today\'s problems to review:', error);
    throw error;
  }
}

/**
 * Adds multiple problems to review by IDs
 */
export async function addMultipleProblemsToReview(problemIds, daysUntilReview = 1) {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }
    
    // Use the proxy API route instead of calling Google Apps Script directly
    const response = await axios.post('/api/proxy', {
      scriptUrl,
      action: 'bulkAddToReview',
      bulkType: 'selected',
      ids: problemIds,
      days: daysUntilReview
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error adding multiple problems to review:', error);
    throw error;
  }
}

/**
 * Fetches all scheduled reviews, including upcoming ones
 * This lets us display both due and upcoming reviews without changing the server
 */
export async function fetchAllScheduledReviews(forceRefresh = false) {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }

    // Create a new request specifically for all scheduled reviews
    const requestId = `getAllScheduledReviews`;
    
    // If there's already a request in progress for this action, return that promise
    // unless forceRefresh is true
    if (pendingRequests[requestId] && !forceRefresh) {
      console.log('Reusing existing promise for getAllScheduledReviews');
      return pendingRequests[requestId];
    } else if (forceRefresh && pendingRequests[requestId]) {
      // Clean up any pending requests when force refresh is requested
      delete pendingRequests[requestId];
      console.log('Forcing new request for getAllScheduledReviews, ignoring pending request');
    }
    
    // If forceRefresh is true, add it to the query parameters with timestamp to bust cache
    const forceParam = forceRefresh ? `&forceRefresh=true&nocache=${Date.now()}` : '';
    
    // Create a new request that fetches both due reviews and the revision schedule
    const requestPromise = axios.get(`/api/proxy?url=${encodeURIComponent(scriptUrl)}&action=getAllScheduledReviews${forceParam}`, {
      timeout: 30000,
      headers: forceRefresh ? {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      } : {}
    })
    .then(response => {
      if (response.status === 200 && response.data) {
        console.log("Received scheduled reviews data:", response.data);
        
        // Check if we got both due reviews and upcoming reviews
        const dueReviews = response.data.dueReviews || [];
        const upcomingReviews = response.data.upcomingReviews || [];
        
        // Process the dates to ensure they're valid Date objects
        const processedDueReviews = dueReviews.map(review => ({
          ...review,
          nextReviewDate: review.nextReviewDate ? new Date(review.nextReviewDate) : null
        }));
        
        const processedUpcomingReviews = upcomingReviews.map(review => {
          // Handle different property naming formats from the server
          const nextReviewDate = review.nextReviewDate || review['Next Review Date'];
          return {
            ...review,
            // Convert ID/Title properties to consistent format
            id: review.id || review.ID || review.Id,
            title: review.title || review.Title,
            // Ensure we have a valid Date object
            nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null
          };
        });
        
        // Return the combined list
        return [...processedDueReviews, ...processedUpcomingReviews];
      }
      
      // As a fallback, try the old approach of combining due reviews with problems data
      return fallbackFetchAllScheduled(scriptUrl, forceParam);
    })
    .catch(error => {
      console.error("Error in direct scheduled reviews fetch:", error);
      // Fallback to original approach
      return fallbackFetchAllScheduled(scriptUrl, forceParam);
    })
    .finally(() => {
      delete pendingRequests[requestId];
    });
    
    pendingRequests[requestId] = requestPromise;
    return requestPromise;
  } catch (error) {
    console.error('Error fetching all scheduled reviews:', error);
    return [];
  }
}

// Fallback method that combines due reviews and problems data
async function fallbackFetchAllScheduled(scriptUrl, forceParam) {
  // Create unique request IDs
  const dueRequestId = `getDueReviews`;
  const problemsRequestId = `getProblems`;
  
  // Check if we can reuse existing promises
  let duePromise;
  if (pendingRequests[dueRequestId] && !forceParam) {
    console.log('Reusing existing promise for getDueReviews in fallback approach');
    duePromise = pendingRequests[dueRequestId];
  } else {
    // Create a new request for due reviews
    duePromise = axios.get(`/api/proxy?url=${encodeURIComponent(scriptUrl)}&action=getDueReviews${forceParam}`, {
      timeout: 30000
    })
    .finally(() => {
      delete pendingRequests[dueRequestId];
    });
    
    pendingRequests[dueRequestId] = duePromise;
  }
  
  // Similar for problems request
  let problemsPromise;
  if (pendingRequests[problemsRequestId] && !forceParam) {
    console.log('Reusing existing promise for getProblems in fallback approach');
    problemsPromise = pendingRequests[problemsRequestId];
  } else {
    // Create a new request for problems
    problemsPromise = axios.get(`/api/proxy?url=${encodeURIComponent(scriptUrl)}&action=getProblems${forceParam}`, {
      timeout: 30000
    })
    .finally(() => {
      delete pendingRequests[problemsRequestId];
    });
    
    pendingRequests[problemsRequestId] = problemsPromise;
  }
  
  // Wait for both requests to complete
  const [dueResponse, problemsResponse] = await Promise.all([duePromise, problemsPromise]);
  
  // Extract the due reviews
  const dueReviews = (dueResponse.status === 200 && dueResponse.data && dueResponse.data.dueReviews) 
    ? dueResponse.data.dueReviews 
    : [];
  
  console.log("Due reviews:", dueReviews.length);
  
  if (problemsResponse.status === 200) {
    let allProblems = [];
    
    // Extract problems depending on response format
    if (problemsResponse.data && problemsResponse.data.problems) {
      allProblems = problemsResponse.data.problems;
    } else if (Array.isArray(problemsResponse.data)) {
      allProblems = problemsResponse.data;
    }
    
    console.log("All problems count:", allProblems.length);
    
    // Look for problems with review dates in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all due review IDs to avoid duplicates
    const dueReviewIds = new Set(dueReviews.map(r => r.id || r.ID || r.Id));
    
    const upcomingReviews = allProblems.filter(problem => {
      // Skip if already in due reviews
      const problemId = problem.id || problem.ID || problem.Id;
      if (dueReviewIds.has(problemId)) return false;
      
      // Check all possible property names for next review date
      const reviewDate = problem['Next Review Date'] || problem['nextReviewDate'];
      
      if (!reviewDate) return false;
      
      try {
        // Convert to Date object and ensure it's valid
        const nextReview = reviewDate instanceof Date ? reviewDate : new Date(reviewDate);
        if (isNaN(nextReview.getTime())) {
          console.error("Invalid date for problem:", problem);
          return false;
        }
        
        // Reset hours for accurate date comparison
        nextReview.setHours(0, 0, 0, 0);
        
        // Only include problems with future review dates
        // and that have a title and ID
        return (
          nextReview > today && 
          (problem['Title'] || problem['title']) &&
          (problem['ID'] || problem['Id'] || problem['id'])
        );
      } catch (e) {
        console.error("Error parsing date:", reviewDate, e);
        return false;
      }
    }).sort((a, b) => {
      // Sort by review date ascending
      const dateA = new Date(a['Next Review Date'] || a.nextReviewDate);
      const dateB = new Date(b['Next Review Date'] || b.nextReviewDate);
      return dateA - dateB;
    });
    
    console.log("Found upcoming reviews:", upcomingReviews.length);
    
    // Return the combination of both current and upcoming reviews
    return [...dueReviews, ...upcomingReviews];
  }
  
  return dueReviews; // Fallback to just the due reviews
}