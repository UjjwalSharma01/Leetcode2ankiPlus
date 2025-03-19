# Learning JavaScript Through the LeetCode2Anki Project

This document will help you understand the JavaScript concepts used in this project, starting from the basics and progressing to more advanced topics. By the end, you should be able to understand each line of code and explain it confidently in interviews.

## 🌟 Project Overview

LeetCode2Anki with Google Sheets Integration is a browser extension (userscript) that allows you to:
1. Save LeetCode problems to Anki for spaced repetition learning
2. Track your progress by logging solved problems to Google Sheets

## 📚 JavaScript Fundamentals Used in This Project

### Immediately Invoked Function Expression (IIFE)

The entire userscript is wrapped in an IIFE:

```javascript
(function () {
    'use strict';
    // All code goes here
})();
```

**Why use this?** 
- Creates a private scope to avoid polluting the global namespace
- 'use strict' enables strict mode for better error catching

### Variables and Constants

```javascript
const deckName = 'Revision DSA Concepts';  // Constant (can't be reassigned)
let code = "";                          // Variable that can be reassigned
```

### Asynchronous Programming

#### Promises

Promises represent values that may be available now, in the future, or never:

```javascript
function sendToGoogleSheets(data) {
    return new Promise((resolve, reject) => {
        // Async operation here...
        if (success) {
            resolve();  // Operation succeeded
        } else {
            reject(new Error('Failed'));  // Operation failed
        }
    });
}
```

#### Async/Await

A cleaner way to work with Promises:

```javascript
async function handleSheetClick() {
    try {
        const isAccessible = await checkGoogleSheetAccess();
        // await pauses execution until the Promise resolves
    } catch (error) {
        // Handle errors from any awaited Promise
    }
}
```

### Error Handling

```javascript
try {
    // Code that might throw an error
    const result = JSON.parse(response);
} catch (error) {
    // Handle the error gracefully
    console.error("Error parsing JSON:", error);
}
```

### DOM Manipulation

```javascript
// Creating elements
const button = document.createElement('button');

// Setting attributes and styles
button.innerText = 'Save to Anki';
button.style.position = 'fixed';

// Event listeners
button.addEventListener('click', handleButtonClick);

// Adding to the DOM
document.body.appendChild(button);
```

### HTTP Requests using GM.xmlHttpRequest

```javascript
GM.xmlHttpRequest({
    method: 'POST',
    url: 'http://127.0.0.1:8765',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify(data),
    onload: handleResponse,
    onerror: handleError
});
```

### JSON Handling

```javascript
// Convert JS object to JSON string
const jsonString = JSON.stringify(data);

// Parse JSON string to JS object
try {
    const parsedData = JSON.parse(jsonString);
} catch (e) {
    console.error("Invalid JSON");
}
```

## 🔄 Advanced JavaScript Patterns

### Retry Mechanism

Used to retry failed network requests:

```javascript
async function sendToGoogleSheetsWithRetry(data, retries = 0) {
    try {
        return await sendToGoogleSheets(data);
    } catch (error) {
        if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return sendToGoogleSheetsWithRetry(data, retries + 1);
        }
        throw error;
    }
}
```

**Key concepts:**
- Recursive function calls
- Exponential backoff using setTimeout
- Propagating errors when retries are exhausted

### Multiple Fallback Strategies

Used to extract data when the primary method fails:

```javascript
async function extractQuestionData() {
    // Method 1
    try {
        // First approach
    } catch (error) {
        console.warn("Method 1 failed");
    }
    
    // Method 2
    try {
        // Second approach
    } catch (error) {
        console.warn("Method 2 failed");
    }
    
    // Method 3...
}
```

**Why use this?**
- Makes code resilient to changes in website structure
- Creates a more robust solution

### Toast Notifications

A non-intrusive way to show feedback to the user:

```javascript
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    // Set styles...
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 100);
    
    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
    
    return toast; // Return for potential cancellation
}
```

**Key concepts:**
- DOM manipulation
- CSS transitions
- Nested setTimeout for animations
- Cleanup to prevent memory leaks

## 🌐 UserScript Concepts

### Metadata Block

```javascript
// ==UserScript==
// @name            ujjwal
// @namespace       LeetCode2Anki - Add solved problem to Anki
// @version         1.0.0
// @description     Add solved problem to Anki for reviewing later
// @match           https://leetcode.com/problems/*
// @grant           GM.xmlHttpRequest
// @connect         127.0.0.1
// ...
// ==/UserScript==
```

**What each directive means:**
- `@name` - Name of the script displayed in the extension
- `@match` - URL pattern where the script will run
- `@grant` - Special permissions needed (like xmlHttpRequest)
- `@connect` - Domains the script is allowed to connect to

## 🔄 Google Apps Script Concepts

### What is Google Apps Script?

Google Apps Script is a JavaScript-based scripting platform that lets you extend Google Workspace applications like Sheets, Docs, and Drive.

### Web App Setup

```javascript
function doRequest(request) {
  const method = request.method || 'GET';
  
  if (method === 'POST') {
    return doPost(request);
  } else if (method === 'OPTIONS') {
    return doOptions(request);
  } else {
    return doGet(request);
  }
}
```

This function routes HTTP requests to the appropriate handler based on the method.

### CORS (Cross-Origin Resource Sharing)

```javascript
function doOptions(e) {
  // ...
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    'Access-Control-Max-Age': '3600'
  };
  // ...
}
```

**What is CORS?**
- Security feature that restricts web pages from making requests to different domains
- Pre-flight requests (OPTIONS) check if the server allows actual request
- Headers define who can access the API and how

### Google Sheets Integration

```javascript
function doPost(e) {
  // ...
  const sheet = SpreadsheetApp.openById("YOUR_SPREADSHEET_ID").getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    new Date(),
    data.id,
    // Other fields...
  ]);
  // ...
}
```

**Key concepts:**
- SpreadsheetApp - The main entry point for Google Sheets API
- openById - Opens a specific spreadsheet by ID
- appendRow - Adds a new row with the provided array values

## 🧩 Practical Application: Code Walkthrough

### 1. Adding UI Elements

```javascript
function addButtons() {
    const container = document.createElement('div');
    // Set styles...
    
    const ankiButton = createButton('Save to Anki', '#007BFF', handleAnkiClick);
    const sheetButton = createButton('Save to Sheet', '#28a745', handleSheetClick);

    container.appendChild(sheetButton);
    container.appendChild(ankiButton);
    document.body.appendChild(container);
}
```

**What's happening:**
1. Create a container div
2. Create two buttons using a helper function
3. Append buttons to container
4. Append container to the page body

### 2. Handling Click Events

```javascript
async function handleSheetClick() {
    try {
        // Check if Google Sheets API is accessible
        const isAccessible = await checkGoogleSheetAccess();
        if (!isAccessible) {
            alert("Could not access Google Sheets service.");
            return;
        }

        // Get problem data
        const params = await getParams();
        if (!params) {
            alert("Please solve this problem before saving");
            return;
        }

        // Prepare data for sheet
        const payload = {
            id: params.note.fields.Id || "",
            // Other fields...
        };

        // Show loading toast
        const loadingToast = showToast('Saving to Google Sheets...', 60000);
        
        try {
            // Send data with retry logic
            await sendToGoogleSheetsWithRetry(payload);
            // Remove loading toast and show success
            if (loadingToast && loadingToast.parentNode) {
                loadingToast.parentNode.removeChild(loadingToast);
            }
            showToast('Saved to Google Sheets!');
        } catch (error) {
            // Handle errors and cleanup
            if (loadingToast && loadingToast.parentNode) {
                loadingToast.parentNode.removeChild(loadingToast);
            }
            throw error;
        }
    } catch (error) {
        console.error("Error:", error);
        alert('Failed to save: ' + error.message);
    }
}
```

**What's happening:**
1. Check prerequisites
2. Get and validate problem data
3. Show loading indicator
4. Send data with retry mechanism
5. Handle success or failure
6. Clean up UI elements

### 3. Extracting LeetCode Problem Data

```javascript
async function extractQuestionData() {
    // Multiple methods to extract data with fallbacks
    // Method 1: From NEXT_DATA script tag
    try {
        const scriptTag = document.querySelector('script#__NEXT_DATA__');
        if (scriptTag) {
            // Parse and extract data...
        }
    } catch (error) {
        console.warn("Method 1 failed:", error);
    }
    
    // Method 2, 3, etc.
}
```

**What's happening:**
1. Try multiple methods to extract data
2. Each method is wrapped in try/catch to prevent total failure
3. If all methods fail, return null

## 📝 Interview Questions and Answers

### Q: What is an IIFE and why did you use it in this project?
**A:** IIFE (Immediately Invoked Function Expression) is a function that runs as soon as it's defined. I used it to:
1. Create a private scope to avoid variable name collisions with the page's JavaScript
2. Prevent polluting the global namespace
3. Enable strict mode locally without affecting other scripts

### Q: How does your error handling strategy work?
**A:** My error handling strategy is multi-layered:
1. Each function uses try/catch blocks to handle its own errors
2. For network requests, I implemented a retry mechanism with backoff
3. I provide user feedback through alerts and toasts depending on severity
4. I log detailed errors to console for debugging
5. I use fallback strategies for critical operations like data extraction

### Q: Explain your approach to making the script resilient to website changes.
**A:** I used several techniques:
1. Multiple methods to extract data from different parts of the page
2. Different ways to detect if a problem is solved
3. Various methods to get user's code (Monaco editor, CodeMirror, textarea, React props)
4. Feature detection before using browser APIs
5. Defensive programming with null checks and default values

### Q: How does the Google Sheets integration work?
**A:** The integration works through these components:
1. A Google Apps Script web app that exposes HTTP endpoints
2. CORS headers to allow cross-origin requests
3. GM.xmlHttpRequest to make cross-origin requests from the userscript
4. A retry mechanism to handle network failures
5. Data validation on both client and server side
6. Clear user feedback through toast messages

### Q: What's the benefit of the toast notification system you created?
**A:** The toast notification system provides:
1. Non-intrusive feedback that doesn't block user interaction
2. Visual confirmation of actions completing successfully
3. Temporary visibility that doesn't require user dismissal
4. Smooth animations for better UX
5. Return value that allows cancellation for long operations

## 🔍 Further Learning Resources

1. **JavaScript Promises in Depth**
   - [MDN Web Docs: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
   - [JavaScript.info: Promises, async/await](https://javascript.info/async)

2. **Google Apps Script**
   - [Google Apps Script Documentation](https://developers.google.com/apps-script)
   - [Google Sheets API Reference](https://developers.google.com/sheets/api/reference/rest)

3. **Userscripts**
   - [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)
   - [Greasespot Wiki](https://wiki.greasespot.net/Main_Page)

4. **DOM Manipulation**
   - [MDN Web Docs: Document Object Model](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

5. **Error Handling Patterns**
   - [JavaScript Error Handling Patterns](https://www.patterns.dev/posts/classic-design-patterns/)
   - [Retry Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/retry)
