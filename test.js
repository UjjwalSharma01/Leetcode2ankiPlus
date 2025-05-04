/**
 * Simple test script to verify Google Apps Script connectivity
 * Run this with Node.js to test the connectivity to your Google Apps Script
 * 
 * Usage: 
 * 1. Replace SCRIPT_URL with your actual Google Apps Script URL
 * 2. Run with: node test.js
 */

const https = require('https');
const http = require('http');

// Replace with your actual Google Apps Script URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxcKBQ-ZYneoPRxQHWVC-2RaarGpqlqGMJVe_DfVWkH7Meqk4JPXFKjfAfEj8Xf4hCF/exec';

// Simple fetch function for Node.js that follows redirects
function fetch(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    // Max 5 redirects to prevent infinite loops
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }

    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Fetching URL (redirect ${redirectCount}): ${url}`);
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      // Log response status and headers
      console.log(`Response Status Code: ${res.statusCode}`);
      console.log(`Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`Following redirect to: ${res.headers.location}`);
        // Follow the redirect
        return resolve(fetch(res.headers.location, redirectCount + 1));
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
            console.log('Error parsing JSON:', e.message);
            console.log('Raw response (first 200 chars):', data.substring(0, 200) + '...');
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
    
    req.end();
  });
}

// Test basic connection to Google Apps Script
async function testConnection() {
  try {
    console.log(`Testing connection to: ${SCRIPT_URL}`);
    const response = await fetch(SCRIPT_URL);
    
    if (response.ok) {
      console.log('✅ Connection successful!');
      console.log('Response data:', response.data);
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
    const url = `${SCRIPT_URL}?action=getProblems`;
    console.log(`Testing getProblems endpoint: ${url}`);
    const response = await fetch(url);
    
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
    
    // Build the POST request options
    const url = new URL(SCRIPT_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // Create a promise to handle the request
    const postPromise = new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        let data = '';
        
        console.log(`POST Response Status Code: ${res.statusCode}`);
        console.log(`POST Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
        
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Following POST redirect to: ${res.headers.location}`);
          // For POST redirects, we usually need to do a GET to the redirect location
          fetch(res.headers.location).then(resolve).catch(reject);
          return;
        }
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            // Try to parse as JSON
            try {
              const jsonData = JSON.parse(data);
              console.log('Successfully parsed POST response as JSON');
              resolve({ 
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                data: jsonData,
                headers: res.headers
              });
            } catch (e) {
              console.log('Error parsing POST response JSON:', e.message);
              console.log('Raw POST response (first 200 chars):', data.substring(0, 200) + '...');
              resolve({ 
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                data: data,
                headers: res.headers
              });
            }
          } catch (e) {
            console.error('Error processing POST response:', e);
            reject(e);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Error making POST request:', error.message);
        reject(error);
      });
      
      // Write the POST data
      const postData = JSON.stringify(sampleData);
      req.write(postData);
      req.end();
    });
    
    const response = await postPromise;
    
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

// Run all tests
async function runTests() {
  console.log('======= GOOGLE APPS SCRIPT CONNECTIVITY TEST =======');
  
  if (SCRIPT_URL === 'YOUR_SCRIPT_URL_HERE') {
    console.error('Error: Please replace YOUR_SCRIPT_URL_HERE with your actual Google Apps Script URL');
    return;
  }
  
  console.log('1. Testing basic connectivity...');
  const connectionOk = await testConnection();
  
  console.log('\n2. Testing getProblems endpoint...');
  const getProblemsOk = await testGetProblems();
  
  console.log('\n3. Testing POST endpoint (save problem data)...');
  const postOk = await testPost();
  
  console.log('\n======= TEST RESULTS =======');
  console.log(`Basic connectivity: ${connectionOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`GetProblems endpoint: ${getProblemsOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`POST endpoint: ${postOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('\n======= TEST COMPLETED =======');
}

// Execute all tests
runTests();