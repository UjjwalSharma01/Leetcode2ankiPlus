import axios from 'axios';
import { getScriptUrlFromStorage } from '@/utils/scriptUrlManager';

/**
 * Fetches all LeetCode problems from the Google Sheet
 */
export async function fetchLeetCodeProblems() {
  try {
    // Get script URL from localStorage (which is synced with Firebase on login)
    const scriptUrl = getScriptUrlFromStorage();
    
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured. Please update it in Settings.');
    }
    
    console.log("Fetching problems from:", scriptUrl);
    
    // axios automatically follows redirects unlike fetch API
    const response = await axios.get(`${scriptUrl}?action=getProblems`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 5,  // Follow up to 5 redirects
      withCredentials: false, // Important for CORS
    });
    
    console.log("Response status:", response.status);
    console.log("Response type:", typeof response.data);
    
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
  } catch (error) {
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