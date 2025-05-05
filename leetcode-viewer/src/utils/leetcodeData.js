import axios from 'axios';
import { getScriptUrlFromStorage } from '@/utils/scriptUrlManager';

// Request tracking to prevent duplicate in-flight requests
const pendingRequests = {};

/**
 * Fetches all LeetCode problems from the Google Sheet
 * @param {boolean} skipUrlCheck - If true, won't throw error for missing URL (for initial Firebase sync)
 * @param {boolean} forceRefresh - If true, bypasses cache and forces a fresh request
 */
export async function fetchLeetCodeProblems(skipUrlCheck = false, forceRefresh = false) {
  try {
    // Get script URL from localStorage (which is synced with Firebase on login)
    const scriptUrl = getScriptUrlFromStorage();
    
    if (!scriptUrl) {
      if (skipUrlCheck) {
        console.log('Script URL not found, but skipping error as requested (waiting for Firebase sync)');
        return []; // Return empty array instead of throwing error
      } else {
        // Instead of throwing an error which crashes the app, return a special object
        return { needsScriptUrl: true, message: 'Google Script URL is not configured. Please update it in Settings.' };
      }
    }
    
    // Create a unique request ID
    const requestId = 'getProblems';
    
    // If there's already a request in progress for this action, return that promise
    if (pendingRequests[requestId] && !forceRefresh) {
      console.log('Reusing existing promise for getProblems');
      return pendingRequests[requestId];
    }
    
    // If forceRefresh is true, add it to the query parameters
    const forceParam = forceRefresh ? '&forceRefresh=true' : '';
    
    console.log(`Fetching problems through proxy${forceRefresh ? ' (forced refresh)' : ''}`);
    
    // Create the request promise
    const requestPromise = axios.get(`/api/proxy?url=${encodeURIComponent(scriptUrl)}&action=getProblems${forceParam}`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 30000, // 30 seconds timeout
    })
    .then(response => {
      console.log("Response status:", response.status);
      
      // Process the response
      if (response.status === 200) {
        // Process various response formats
        
        // Case 1: Standard JSON response with problems array
        if (response.data && response.data.problems) {
          console.log(`Found ${response.data.problems.length} problems in response`);
          return response.data.problems;
        }
        
        // Case 2: Direct array in the response
        if (Array.isArray(response.data)) {
          console.log(`Found ${response.data.length} problems in response array`);
          return response.data;
        }
        
        // Case 3: HTML response with embedded JSON
        if (typeof response.data === 'string' && 
            (response.data.includes('<html') || response.data.includes('<!DOCTYPE'))) {
          console.log("Received HTML response from Google Apps Script");
          
          // Try to extract JSON from HTML
          const jsonMatch = response.data.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extracted = JSON.parse(jsonMatch[0]);
              if (extracted.problems) {
                console.log(`Extracted ${extracted.problems.length} problems from HTML response`);
                return extracted.problems;
              }
            } catch (e) {
              console.error("Failed to extract JSON from HTML response", e);
            }
          }
          
          return []; // Empty array if nothing could be extracted
        }
        
        // Case 4: Empty or unrecognized response
        console.error('Unrecognized response format:', response.data);
        return [];
      } 
      
      console.error('Error response status:', response.status);
      return [];
    })
    .catch(error => {
      console.error('Error fetching LeetCode problems:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      return [];
    })
    .finally(() => {
      // Clean up the pending request
      delete pendingRequests[requestId];
    });
    
    // Store the promise for potential reuse
    pendingRequests[requestId] = requestPromise;
    return requestPromise;
  } catch (error) {
    console.error('Error setting up LeetCode problems request:', error);
    return [];
  }
}

/**
 * Gets problem statistics from the data
 */
export function getProblemStats(problems) {
  if (!problems || !problems.length) return {};
  
  const stats = {
    total: problems.length,
    byDifficulty: {
      Easy: 0,
      Medium: 0,
      Hard: 0
    },
    byStatus: {}
  };
  
  // Collect unique tags across all problems
  const allTags = new Set();
  
  problems.forEach(problem => {
    // Count by difficulty
    if (problem.Difficulty) {
      stats.byDifficulty[problem.Difficulty] = (stats.byDifficulty[problem.Difficulty] || 0) + 1;
    }
    
    // Count by status
    if (problem.Status) {
      stats.byStatus[problem.Status] = (stats.byStatus[problem.Status] || 0) + 1;
    }
    
    // Extract tags
    if (problem.Tags) {
      const tagArray = problem.Tags.split(',').map(tag => tag.trim());
      tagArray.forEach(tag => {
        if (tag) allTags.add(tag);
      });
    }
  });
  
  stats.uniqueTags = Array.from(allTags);
  stats.tagsCount = allTags.size;
  
  return stats;
}