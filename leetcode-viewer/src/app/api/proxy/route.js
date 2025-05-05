import { NextResponse } from 'next/server';

// In-memory cache object - stores responses keyed by request URL + action
const cache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds 

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
    const action = searchParams.get('action');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    if (!scriptUrl) {
      return NextResponse.json(
        { error: 'No script URL provided' },
        { status: 400 }
      );
    }
    
    // Create a cache key from the URL and action
    const cacheKey = `${scriptUrl}-${action || 'default'}`;
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      // Ensure cache is still valid
      if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
        console.log(`Returning cached response for ${action || 'default'}`);
        return NextResponse.json(cachedData.data, {
          headers: { 'X-Cache': 'HIT' }
        });
      }
      // Cache is expired, remove it
      cache.delete(cacheKey);
    }
    
    // Copy query parameters from the request to forward to the script
    const targetUrl = new URL(scriptUrl);
    searchParams.forEach((value, key) => {
      if (key !== 'url' && key !== 'forceRefresh') {
        targetUrl.searchParams.append(key, value);
      }
    });
    
    console.log(`Making actual API request for ${action || 'default'}`);
    
    // Make the request to Google Apps Script
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Adding a cache: 'no-store' to ensure the fetch doesn't use browser cache
      cache: 'no-store'
    });
    
    // Check if the response is OK
    if (!response.ok) {
      console.error('Error response from Google Apps Script:', await response.text());
      return NextResponse.json(
        { error: `Google Apps Script returned ${response.status}` },
        { status: response.status }
      );
    }
    
    // Parse the response
    const data = await response.json();
    
    // Cache the successful response
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    // Return the response
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' }
    });
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
    const { scriptUrl, ...data } = await request.json();
    
    if (!scriptUrl) {
      return NextResponse.json(
        { error: 'No script URL provided' },
        { status: 400 }
      );
    }
    
    // POST requests are never cached because they modify data
    
    // Make the request to Google Apps Script
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    });
    
    // Check if the response is OK
    if (!response.ok) {
      console.error('Error response from Google Apps Script:', await response.text());
      return NextResponse.json(
        { error: `Google Apps Script returned ${response.status}` },
        { status: response.status }
      );
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
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in proxy API route:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}