/**
 * Node.js version of the direct submission test tool
 * Run with: node direct_submission_node.js
 */

const https = require('https');

// Configuration
const googleScriptUrl = 'YOUR_GOOGLE_SCRIPT_URL'; // Replace with your URL when deploying

// Sample test data
const testData = {
    id: "test-123-node",
    title: "Test Problem (Node.js)",
    difficulty: "Medium",
    tags: ["array", "dynamic-programming", "node-test"],
    url: "https://leetcode.com/problems/test-problem/",
    status: "Testing from Node.js"
};

// Check if the endpoint is accessible
function checkEndpoint() {
    return new Promise((resolve, reject) => {
        console.log("Checking endpoint accessibility...");
        
        const req = https.get(googleScriptUrl, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Headers: ${JSON.stringify(res.headers)}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log("Response data:", data.substring(0, 200) + "...");
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.error("Endpoint check failed:", error);
            reject(new Error(`Could not access the Google Sheets endpoint: ${error.message}`));
        });
        
        req.end();
    });
}

// Send test data to Google Sheets
function sendData(data) {
    return new Promise((resolve, reject) => {
        console.log("Sending data to Google Sheets:", data);
        
        const postData = JSON.stringify(data);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(googleScriptUrl, options, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Headers: ${JSON.stringify(res.headers)}`);
            
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log("Response data:", responseData);
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        // Check if the response is HTML
                        if (responseData.trim().toLowerCase().startsWith('<!doctype') ||
                            responseData.trim().toLowerCase().startsWith('<html')) {
                            console.log("Received HTML response, assuming success");
                            resolve();
                            return;
                        }
                        
                        // Try to parse as JSON
                        const jsonResponse = JSON.parse(responseData);
                        console.log("Parsed response:", jsonResponse);
                        
                        if (jsonResponse.result === "success" || !jsonResponse.error) {
                            resolve(jsonResponse);
                        } else {
                            reject(new Error(jsonResponse.error || "Unknown error"));
                        }
                    } catch (e) {
                        console.error("Error parsing JSON response:", e);
                        // If status is 200, consider it a success even if JSON parsing fails
                        if (res.statusCode === 200) {
                            resolve();
                        } else {
                            reject(new Error("Failed to parse response"));
                        }
                    }
                } else {
                    reject(new Error(`Request failed with status ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error("Request error:", error);
            reject(new Error(`Request failed: ${error.message}`));
        });
        
        req.write(postData);
        req.end();
    });
}

// Main test function
async function testGoogleSheetAPI() {
    console.log("Testing Google Sheets API...");
    
    try {
        // First try a GET request to check if the endpoint is accessible
        await checkEndpoint();
        console.log("Endpoint is accessible. Sending test data...");
        
        // Now try the actual POST
        await sendData(testData);
        console.log("Test successful! Check your Google Sheet for the test entry.");
    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

// Run the test
testGoogleSheetAPI();
