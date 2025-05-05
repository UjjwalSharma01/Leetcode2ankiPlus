import axios from 'axios';
import { getScriptUrlFromStorage } from '@/utils/scriptUrlManager';

// Request tracking to prevent duplicate in-flight requests
const pendingRequests = {};

/**
 * Fetches the user's LeetCode problems data
 */
export async function fetchLeetCodeProblems(skipUrlCheck = false, forceRefresh = false) {
  try {
    // Use the script URL from localStorage
    let scriptUrl = getScriptUrlFromStorage();
    
    // If no script URL is found and we're not skipping the check
    if (!scriptUrl && !skipUrlCheck) {
      console.log('Google Script URL not configured');
      return { needsScriptUrl: true };
    }
    
    // Handle the case where no script URL is available but we're skipping the check
    if (!scriptUrl && skipUrlCheck) {
      return [];
    }

    // Add cache-busting parameter to URL when forcing refresh
    const cacheParam = forceRefresh ? `&nocache=${Date.now()}` : '';
    
    // Make the API request through the proxy
    const response = await axios.get(`/api/proxy?url=${encodeURIComponent(scriptUrl)}&action=getProblems${cacheParam}`, {
      timeout: 30000,
      headers: forceRefresh ? {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      } : {}
    });
    
    // Check if we received valid data
    if (response.status === 200) {
      // Response can be in two formats:
      // 1. { problems: [...] } - new format
      // 2. [...] - old format (direct array)
      
      if (response.data && Array.isArray(response.data.problems)) {
        return response.data.problems;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error('Unexpected data format from API:', response.data);
        return [];
      }
    } else {
      console.error('Failed to fetch LeetCode problems:', response.status, response.statusText);
      return [];
    }
  } catch (error) {
    console.error('Error fetching LeetCode problems:', error);
    
    // Check if it's a 404 error which might indicate missing script URL
    if (error.response && error.response.status === 404) {
      return { needsScriptUrl: true };
    }
    
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