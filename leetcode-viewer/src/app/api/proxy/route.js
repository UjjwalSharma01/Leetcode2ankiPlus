import { NextResponse } from 'next/server';

// In-memory cache object - stores responses keyed by request URL + action
const cache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds 

// Active requests tracking to prevent duplicate simultaneous requests
const activeRequests = new Map();

/**
 * Validate a URL and return a URL object if valid
 * @param {string} url - The URL string to validate
 * @param {string} [action='default'] - The action being performed (for logging)
 * @returns {URL|null} - URL object if valid, null if invalid
 */
function validateUrl(url, action = 'default') {
  if (!url) {
    return null;
  }
  
  try {
    const validatedUrl = new URL(url);
    console.log(`Validated URL for ${action}: ${validatedUrl.toString()}`);
    return validatedUrl;
  } catch (urlError) {
    console.error(`Invalid URL format for ${action}:`, urlError);
    return null;
  }
}

/**
 * Creates a unique request key for deduplication
 * @param {string} url - The base URL
 * @param {string} method - HTTP method (GET/POST)
 * @param {object} params - Query parameters or body data
 * @returns {string} A unique key representing this request
 */
function createRequestKey(url, method, params = {}) {
  // For GET requests, include relevant query parameters
  const actionParam = params.action || 'default';
  return `${method}:${url}:${actionParam}`;
}

/**
 * API route that acts as a proxy to bypass CORS restrictions when communicating
 * with Google Apps Script. Includes response caching to minimize external requests.
 * 
 * This route will forward all requests to the Google Apps Script URL
 * and return the response back to the client.
 */
export async function GET(request) {
  try {
    // Get the target URL from the search params
    const { searchParams } = new URL(request.url);
    const scriptUrl = searchParams.get('url');
    const action = searchParams.get('action') || 'default';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    if (!scriptUrl) {
      return NextResponse.json(
        { error: 'No script URL provided' },
        { status: 400 }
      );
    }
    
    // Validate URL format - only once
    const targetUrl = validateUrl(scriptUrl, action);
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Invalid script URL format' },
        { status: 400 }
      );
    }
    
    // Create a cache key from the URL and action
    const cacheKey = `${scriptUrl}-${action}`;
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      // Ensure cache is still valid
      if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
        console.log(`Fulfilling request with cached data for ${action} (age: ${Math.round((Date.now() - cachedData.timestamp)/1000)}s)`);
        return NextResponse.json(cachedData.data, {
          headers: { 'X-Cache': 'HIT' }
        });
      }
      // Cache is expired, remove it
      console.log(`Cache expired for ${action}, will fetch fresh data`);
      cache.delete(cacheKey);
    }
    
    // Generate a request key for deduplication
    const requestKey = createRequestKey(scriptUrl, 'GET', { action });
    
    // Check if an identical request is already in flight
    if (activeRequests.has(requestKey)) {
      console.log(`Identical request in progress for ${action}, piggybacking on existing request`);
      try {
        // Wait for the existing request to complete and use its result
        const result = await activeRequests.get(requestKey);
        return NextResponse.json(result, {
          headers: { 'X-Cache': 'DEDUPLICATED' }
        });
      } catch (error) {
        // If the original request failed, we should still try our own request
        console.log(`Piggybacked request failed, proceeding with new request for ${action}`);
        // Continue with the request below
      }
    }
    
    // Copy query parameters from the request to forward to the script
    searchParams.forEach((value, key) => {
      if (key !== 'url' && key !== 'forceRefresh') {
        targetUrl.searchParams.append(key, value);
      }
    });
    
    console.log(`Making actual API request for ${action}`);
    
    // Create a promise for this request and store it for deduplication
    const requestPromise = (async () => {
      try {
        const response = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          // Adding a cache: 'no-store' to ensure the fetch doesn't use browser cache
          cache: 'no-store'
        });
        
        // Check if the response is OK
        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = 'Could not read error response';
          }
          
          console.error(`Error from script URL (${response.status}):`, errorText);
          throw new Error(`Google Apps Script returned ${response.status}: ${errorText}`);
        }
        
        // Parse the response
        const data = await response.json();
        
        // Cache the successful response
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        // Return the data for other piggybacked requests
        return data;
      } finally {
        // Remove this request from active requests once complete (success or failure)
        setTimeout(() => {
          activeRequests.delete(requestKey);
        }, 100); // Small delay to ensure all pending handlers get the result
      }
    })();
    
    // Store the promise for deduplication
    activeRequests.set(requestKey, requestPromise);
    
    // Await our own request
    try {
      const data = await requestPromise;
      
      // Return the response
      return NextResponse.json(data, {
        headers: { 'X-Cache': 'MISS' }
      });
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in proxy API route:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests to forward to Google Apps Script
 */
export async function POST(request) {
  try {
    // Get the target URL from the request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { scriptUrl, ...data } = requestData;
    
    if (!scriptUrl) {
      return NextResponse.json(
        { error: 'No script URL provided' },
        { status: 400 }
      );
    }
    
    // Validate URL format - only once
    const targetUrl = validateUrl(scriptUrl, 'POST');
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Invalid script URL format' },
        { status: 400 }
      );
    }
    
    // Generate a request key for deduplication (for POST we include the body data hash)
    const requestKey = createRequestKey(scriptUrl, 'POST', data);
    
    // Check if an identical request is already in flight
    if (activeRequests.has(requestKey)) {
      console.log(`Identical POST request in progress, piggybacking on existing request`);
      try {
        // Wait for the existing request to complete and use its result
        const result = await activeRequests.get(requestKey);
        return NextResponse.json(result, {
          headers: { 'X-Cache': 'DEDUPLICATED' }
        });
      } catch (error) {
        // If the original request failed, we should still try our own request
        console.log(`Piggybacked POST request failed, proceeding with new request`);
        // Continue with the request below
      }
    }
    
    // POST requests are never cached because they modify data
    console.log(`Making POST request to: ${targetUrl.toString()}`);
    
    // Create a promise for this request and store it for deduplication
    const requestPromise = (async () => {
      try {
        const response = await fetch(targetUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data),
          cache: 'no-store'
        });
        
        // Check if the response is OK
        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = 'Could not read error response';
          }
          
          console.error(`Error from script URL (${response.status}) during POST:`, errorText);
          throw new Error(`Google Apps Script returned ${response.status}: ${errorText}`);
        }
        
        // Parse and return the response
        const responseData = await response.json();
        
        // Clear any related cached data since data may have changed
        // This ensures that subsequent GET requests will fetch fresh data
        for (const key of cache.keys()) {
          if (key.startsWith(scriptUrl)) {
            cache.delete(key);
          }
        }
        
        // Return the data for other piggybacked requests
        return responseData;
      } finally {
        // Remove this request from active requests once complete
        setTimeout(() => {
          activeRequests.delete(requestKey);
        }, 100); // Small delay to ensure all pending handlers get the result
      }
    })();
    
    // Store the promise for deduplication
    activeRequests.set(requestKey, requestPromise);
    
    // Await our own request
    try {
      const responseData = await requestPromise;
      
      return NextResponse.json(responseData);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in proxy API POST route:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}