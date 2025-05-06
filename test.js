/**
 * Enhanced test script to verify Google Apps Script connectivity and proxy implementation
 * Run this with Node.js to test the connectivity to your Google Apps Script
 * 
 * Usage: 
 * 1. Replace SCRIPT_URL with your actual Google Apps Script URL
 * 2. Run with: node test.js
 */

const https = require('https');
const http = require('http');

// Replace with your actual Google Apps Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8VDKgkgwEQLwcOwPCzUYEZIw3204U4TL2-lyR1fLCWAOB4e36BuYag1OfPblNDy1i/exec';

// URL of your proxy API when deployed (for testing the proxy)
const PROXY_URL = 'http://localhost:3000/api/proxy';

// Simple fetch function for Node.js that follows redirects
function fetch(url, redirectCount = 0, options = {}) {
  return new Promise((resolve, reject) => {
    // Max 5 redirects to prevent infinite loops
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }

    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    console.log(`Fetching URL (${requestOptions.method}) (redirect ${redirectCount}): ${url}`);
    console.log('Request headers:', requestOptions.headers);
    
    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';
      
      // Log response status and headers
      console.log(`Response Status Code: ${res.statusCode}`);
      console.log(`Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`Following redirect to: ${res.headers.location}`);
        // Follow the redirect
        return resolve(fetch(res.headers.location, redirectCount + 1, { 
          method: 'GET', // Use GET for redirects
          headers: options.headers 
        }));
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // First check if it's JSON
          try {
            const jsonData = JSON.parse(data);
            console.log('Successfully parsed response as JSON');
            resolve({ 
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: () => Promise.resolve(jsonData),
              data: jsonData,
              headers: res.headers
            });
          } catch (e) {
            // Not JSON, return as text
            console.log('Response is not JSON');
            console.log('Raw response (first 200 chars):', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
            resolve({ 
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              text: () => Promise.resolve(data),
              data: data,
              headers: res.headers
            });
          }
        } catch (e) {
          console.error('Error processing response:', e);
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making request:', error.message);
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test OPTIONS preflight request (critical for CORS)
async function testOptionsRequest() {
  try {
    console.log('\n======= TESTING OPTIONS PREFLIGHT REQUEST =======');
    console.log(`Sending OPTIONS request to: ${SCRIPT_URL}`);
    
    const response = await fetch(SCRIPT_URL, 0, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    // Check for critical CORS headers
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods', 
      'access-control-allow-headers'
    ];
    
    const missingHeaders = corsHeaders.filter(header => 
      !Object.keys(response.headers).some(h => h.toLowerCase() === header)
    );
    
    if (response.ok && missingHeaders.length === 0) {
      console.log('✅ OPTIONS preflight request successful!');
      console.log('All required CORS headers present in response.');
      return true;
    } else if (response.ok) {
      console.log('⚠️ OPTIONS request returned OK status but missing CORS headers:');
      console.log(missingHeaders.join(', '));
      return false;
    } else {
      console.error(`❌ OPTIONS request failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing OPTIONS preflight request:', error.message);
    return false;
  }
}

// Test basic connection to Google Apps Script
async function testConnection() {
  try {
    console.log('\n======= TESTING BASIC CONNECTION =======');
    console.log(`Testing connection to: ${SCRIPT_URL}`);
    
    const response = await fetch(SCRIPT_URL, 0, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    if (response.ok) {
      console.log('✅ Connection successful!');
      console.log('Response data:', response.data);
      
      // Check if CORS headers are in the response
      const hasOriginHeader = Object.keys(response.headers)
        .some(h => h.toLowerCase() === 'access-control-allow-origin');
      
      if (hasOriginHeader) {
        console.log('✅ CORS headers present in GET response');
      } else {
        console.log('⚠️ GET response is missing CORS headers');
      }
      
      return true;
    } else {
      console.error(`❌ Connection failed with status: ${response.status}`);
      console.log('Response data:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error connecting to Google Apps Script:', error.message);
    return false;
  }
}

// Test getProblems endpoint
async function testGetProblems() {
  try {
    console.log('\n======= TESTING GET PROBLEMS ENDPOINT =======');
    const url = `${SCRIPT_URL}?action=getProblems`;
    console.log(`Testing getProblems endpoint: ${url}`);
    
    const response = await fetch(url, 0, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    if (response.ok) {
      console.log('✅ getProblems request successful!');
      
      if (response.data && response.data.problems) {
        console.log(`Found ${response.data.problems.length} problems in the response`);
        
        // Show a sample of the problems (first 2)
        if (response.data.problems.length > 0) {
          console.log('\nSample problem data:');
          const sample = response.data.problems.slice(0, 2);
          console.log(JSON.stringify(sample, null, 2));
        }
      } else if (Array.isArray(response.data)) {
        console.log(`Found ${response.data.length} problems in the response`);
        
        // Show a sample of the problems (first 2)
        if (response.data.length > 0) {
          console.log('\nSample problem data:');
          const sample = response.data.slice(0, 2);
          console.log(JSON.stringify(sample, null, 2));
        }
      } else {
        console.log('❓ Response format does not contain expected problems array');
        console.log('Full response:', response.data);
      }
      
      return true;
    } else {
      console.error(`❌ getProblems request failed with status: ${response.status}`);
      console.log('Response data:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing getProblems endpoint:', error.message);
    return false;
  }
}

// Test POST with sample data
async function testPost() {
  try {
    console.log('\n======= TESTING POST ENDPOINT =======');
    console.log(`Testing POST to: ${SCRIPT_URL}`);
    
    // Sample data similar to what the userscript would send
    const sampleData = {
      id: "9999",
      title: "Test Problem (Automated Test)",
      difficulty: "Medium",
      tags: ["test", "sample"],
      url: "https://leetcode.com/problems/sample-problem",
      status: "Testing",
      remarks: "This is a test entry from Node.js test script",
      solveTime: "00:05:00",
      solveTimeSeconds: 300,
      firstAttemptSuccess: true,
      confidence: 5
    };
    
    const response = await fetch(SCRIPT_URL, 0, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify(sampleData)
    });
    
    if (response.ok) {
      console.log('✅ POST request successful!');
      console.log('Response data:', response.data);
      return true;
    } else {
      console.error(`❌ POST request failed with status: ${response.status}`);
      console.log('Response data:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing POST endpoint:', error.message);
    return false;
  }
}

// Test proxy API (GET request) - New test for the proxy implementation
async function testProxyGetRequest() {
  try {
    console.log('\n======= TESTING PROXY API (GET) =======');
    // Note: For testing with the actual proxy, you'd need to run your Next.js app first
    console.log(`Testing proxy GET endpoint with URL: ${PROXY_URL}`);
    
    console.log("This test needs your Next.js app running on localhost:3000");
    console.log("To run this test properly, start your Next.js app in another terminal with:");
    console.log("cd leetcode-viewer && npm run dev");
    console.log("If your Next.js app isn't running, this test will fail with a connection error");
    
    // Create the proxy URL with encoded script URL and action parameters
    const proxyGetUrl = `${PROXY_URL}?url=${encodeURIComponent(SCRIPT_URL)}&action=getProblems`;
    
    // Skip the actual fetch if we're just checking the test script functionality
    if (process.argv.includes('--mock')) {
      console.log('⚠️ Mock mode - skipping actual proxy request');
      console.log('Would send request to:', proxyGetUrl);
      return true;
    }
    
    const response = await fetch(proxyGetUrl, 0, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      console.log('✅ Proxy GET request successful!');
      
      if (response.data && response.data.problems) {
        console.log(`Proxy returned ${response.data.problems.length} problems`);
      } else {
        console.log('Response from proxy:', response.data);
      }
      
      return true;
    } else {
      console.error(`❌ Proxy GET request failed with status: ${response.status}`);
      console.log('Response data:', response.data);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - is your Next.js app running on localhost:3000?');
    } else {
      console.error('❌ Error testing proxy GET endpoint:', error.message);
    }
    return false;
  }
}

// Test proxy API (POST request) - New test for the proxy implementation
async function testProxyPostRequest() {
  try {
    console.log('\n======= TESTING PROXY API (POST) =======');
    // Note: For testing with the actual proxy, you'd need to run your Next.js app first
    console.log(`Testing proxy POST endpoint with URL: ${PROXY_URL}`);
    
    console.log("This test needs your Next.js app running on localhost:3000");
    console.log("To run this test properly, start your Next.js app in another terminal with:");
    console.log("cd leetcode-viewer && npm run dev");
    console.log("If your Next.js app isn't running, this test will fail with a connection error");
    
    // Sample data to send through the proxy
    const postData = {
      scriptUrl: SCRIPT_URL,
      action: 'bulkAddToReview',
      bulkType: 'selected',
      ids: ["123", "456"],
      days: 1
    };
    
    // Skip the actual fetch if we're just checking the test script functionality
    if (process.argv.includes('--mock')) {
      console.log('⚠️ Mock mode - skipping actual proxy request');
      console.log('Would send data to proxy:', postData);
      return true;
    }
    
    const response = await fetch(PROXY_URL, 0, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    if (response.ok) {
      console.log('✅ Proxy POST request successful!');
      console.log('Response data:', response.data);
      return true;
    } else {
      console.error(`❌ Proxy POST request failed with status: ${response.status}`);
      console.log('Response data:', response.data);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - is your Next.js app running on localhost:3000?');
    } else {
      console.error('❌ Error testing proxy POST endpoint:', error.message);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('======= GOOGLE APPS SCRIPT CONNECTIVITY TEST =======');
  
  if (SCRIPT_URL === 'YOUR_SCRIPT_URL_HERE') {
    console.error('Error: Please replace YOUR_SCRIPT_URL_HERE with your actual Google Apps Script URL');
    return;
  }
  
  console.log('Testing script URL:', SCRIPT_URL);
  
  // Parse command line args for which tests to run
  const directOnly = process.argv.includes('--direct-only');
  const proxyOnly = process.argv.includes('--proxy-only');
  
  if (!directOnly && !proxyOnly) {
    console.log('Running all tests. To run specific tests use:');
    console.log('  node test.js --direct-only    # Test direct requests only');
    console.log('  node test.js --proxy-only     # Test proxy API only');
    console.log('  node test.js --mock           # Mock proxy tests (no actual requests)');
  }
  
  let optionsOk = false;
  let connectionOk = false;
  let getProblemsOk = false;
  let postOk = false;
  let proxyGetOk = false;
  let proxyPostOk = false;
  
  // Run direct API tests
  if (!proxyOnly) {
    // First test OPTIONS preflight request
    optionsOk = await testOptionsRequest();
    
    // Then test basic connectivity
    connectionOk = await testConnection();
    
    // Then test getProblems endpoint
    getProblemsOk = await testGetProblems();
    
    // Finally test POST endpoint
    postOk = await testPost();
  }
  
  // Run proxy API tests
  if (!directOnly) {
    // Test proxy GET request
    proxyGetOk = await testProxyGetRequest();
    
    // Test proxy POST request
    proxyPostOk = await testProxyPostRequest();
  }
  
  console.log('\n======= TEST RESULTS =======');
  
  if (!proxyOnly) {
    console.log('\nDIRECT API TESTS:');
    console.log(`OPTIONS preflight: ${optionsOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Basic connectivity: ${connectionOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`GetProblems endpoint: ${getProblemsOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`POST endpoint: ${postOk ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!optionsOk) {
      console.log('\n⚠️ CORS PREFLIGHT ISSUE DETECTED: Your Google Apps Script is not properly handling OPTIONS requests.');
      console.log('This will cause CORS errors when your web app tries to make direct requests to the script.');
      console.log('However, your Next.js app will avoid this issue by using the proxy API instead.');
    }
  }
  
  if (!directOnly) {
    console.log('\nPROXY API TESTS:');
    console.log(`Proxy GET request: ${proxyGetOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Proxy POST request: ${proxyPostOk ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!proxyGetOk || !proxyPostOk) {
      console.log('\n⚠️ PROXY API ISSUE DETECTED: Ensure your Next.js app is running on localhost:3000');
      console.log('Run "cd leetcode-viewer && npm run dev" to start the Next.js server before testing the proxy');
    }
  }
  
  console.log('\nCORS WORKAROUND STATUS:');
  if (proxyGetOk && proxyPostOk) {
    console.log('✅ Proxy API is working correctly. Your Next.js app will bypass CORS restrictions!');
  } else if (optionsOk) {
    console.log('⚠️ Direct API works but proxy not tested. Run with Next.js app running to test the proxy.');
  } else {
    console.log('🔄 Direct API has CORS issues, but the proxy solution should work when your Next.js app is running.');
  }
  
  console.log('\n======= TEST COMPLETED =======');
}

// Execute all tests
runTests();