import axios from 'axios';
import { getScriptUrlFromStorage } from './scriptUrlManager';

/**
 * Fetches problems due for review
 */
export async function fetchDueReviews() {
  try {
    const scriptUrl = getScriptUrlFromStorage();
    if (!scriptUrl) {
      throw new Error('Google Script URL is not configured');
    }
    
    const response = await axios.get(`${scriptUrl}?action=getDueReviews`, {
      timeout: 30000
    });
    
    if (response.status === 200 && response.data && response.data.dueReviews) {
      return response.data.dueReviews;
    }
    
    return [];
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
    
    const response = await axios.post(scriptUrl, {
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