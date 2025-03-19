# LeetCode2Anki Plus by Ujjwal Sharma

This userscript enhances your LeetCode experience by allowing you to:
1. Save solved problems to Anki for spaced repetition learning
2. Track your progress by automatically logging problems to Google Sheets

## 🚀 Features

### Core Features
- **Anki Integration**: Save solved LeetCode problems directly to your Anki collection
- **Google Sheets Integration**: Track your LeetCode journey by logging problems to Google Sheets
- **Beautiful Cards**: Well-formatted Anki cards with syntax highlighting
- **Robust Error Handling**: Handles connection failures and retries automatically

### Improvements Over Original leetcode2anki.user.js

| Feature | Original | Enhanced Version |
|---------|----------|------------------|
| Monaco Editor Handling | Basic, fails on some pages | Robust with multiple fallbacks |
| Problem Detection | Single method | Multiple detection strategies |
| Error Handling | Basic | Comprehensive with logging and retries |
| Google Sheets Integration | None | Full integration with tracking |
| LeetCode UI Support | Basic | Compatible with latest UI changes |
| Network Handling | No retries | Automatic retries with backoff |
| Code Extraction | Single method | Multiple fallback methods |

## 📋 Prerequisites

- [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) browser extension
- [Anki](https://apps.ankiweb.net/) with [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on
- A Google account for Google Sheets integration

## ⚙️ Installation

### 1. Install Anki and AnkiConnect

1. Download and install [Anki](https://apps.ankiweb.net/)
2. Open Anki, select `Tools > Add-ons > Get Add-ons...`
3. Enter code `2055492159` to install AnkiConnect
4. Restart Anki

### 2. Set Up Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Replace the default code with the following:
4. Select the `doRequest` function from the drop-down menu as the function to run

```javascript
/**
 * Main entry point for web requests
 * This function delegates to the appropriate handler based on the HTTP method
 */
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

/**
 * Handles OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    'Access-Control-Max-Age': '3600'
  };
  
  return ContentService
    .createTextOutput(JSON.stringify({"status": "success"}))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

/**
 * Handles GET requests - returns a simple status for testing
 */
function doGet(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*'
  };
  
  return ContentService
    .createTextOutput(JSON.stringify({
      "status": "online", 
      "message": "Google Sheets API is running"
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

/**
 * Handles POST requests from the userscript
 * Adds the problem data to a Google Sheet
 */
function doPost(e) {
  // Set CORS headers
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
  };
  
  try {
    // Replace with your sheet ID
    const sheet = SpreadsheetApp.openById("YOUR_SPREADSHEET_ID").getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.id || !data.title) {
      return ContentService
        .createTextOutput(JSON.stringify({
          "error": "Missing required fields",
          "result": "error"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    }
    
    // Process the tags array
    let tagsString = "";
    if (data.tags && Array.isArray(data.tags)) {
      tagsString = data.tags.join(", ");
    }
    
    sheet.appendRow([
      new Date(),
      data.id || "",
      data.title || "",
      data.difficulty || "",
      tagsString,
      data.url || "",
      data.status || "Pending"
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        "result": "success",
        "message": "Data saved successfully"
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        "error": error.toString(),
        "result": "error"
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
  }
}
```

4. Create a Google Sheet
   * Go to [Google Sheets](https://sheets.google.com/)
   * Create a new spreadsheet
   * Name the first 7 columns: `Timestamp`, `ID`, `Title`, `Difficulty`, `Tags`, `URL`, `Status`
   * Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
   * Replace `YOUR_SPREADSHEET_ID` in the Apps Script code with your actual spreadsheet ID

5. Deploy the Apps Script as a web app:
   * Click on `Deploy > New deployment`
   * Select `Web app` as the deployment type
   * Set `Execute as` to `Me`
   * Set `Who has access` to `Anyone, even anonymous`
   * Click `Deploy`
   * Copy the generated web app URL

### 3. Install the Userscript

#### Option 1: One-Click Installation (Recommended)

1. Make sure you have [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) installed
2. **[Click here to install LeetCode2Anki Plus](https://github.com/UjjwalSharma01/Leetcode2ankiPlus/raw/main/leetcode2ankibyUjjwal.user.js)**
3. Tampermonkey/Violentmonkey will automatically detect the script and open an installation page
4. Click "Install" to complete the installation
5. Navigate to your userscript manager's dashboard
6. Edit the LeetCode2Anki Plus script
7. Update the configuration variables:
   ```javascript
   // Configuration - Customize these values
   const deckName = 'LeetCode';  // Your Anki deck name
   const modelName = 'Basic - LeetCode2Anki';  // Your Anki model name
   const language = 'Python';  // Your preferred programming language
   const langShortName = 'py';  // Language code for syntax highlighting
   const googleScriptUrl = 'YOUR_SCRIPT_URL';  // Paste your Google Apps Script URL here
   ```
8. Save the script

#### Option 2: Manual Installation

1. Create a new script in Tampermonkey
2. Copy and paste the script from [leetcode2ankibyUjjwal.user.js](https://github.com/UjjwalSharma01/Leetcode2ankiPlus/blob/main/leetcode2ankibyUjjwal.user.js)
3. Update the configuration variables at the top of the script (same as in Option 1)
4. Save the script

## 🎯 Usage

1. Start Anki and ensure AnkiConnect is running
2. Navigate to any LeetCode problem page
3. Solve the problem until it's accepted
4. Click the "Save to Anki" button to add the problem to your Anki collection
5. Click the "Save to Sheet" button to track the problem in Google Sheets

## 📊 Google Sheets Structure

The script will populate your Google Sheet with the following columns:

| Column | Description |
|--------|-------------|
| Timestamp | Date and time when the problem was saved |
| ID | LeetCode problem ID |
| Title | Problem title |
| Difficulty | Easy, Medium, or Hard |
| Tags | Categories/topics related to the problem |
| URL | Direct link to the problem |
| Status | Current status (defaults to "Pending") |

You can add additional columns for tracking your progress, such as:
- Review dates
- Notes
- Time to solve
- Solution approach

## ⚠️ Troubleshooting

### Anki Issues

- **No response from Anki**: Ensure Anki is running and AnkiConnect is installed
- **Model errors**: The script will attempt to create the model if it doesn't exist
- **Connection errors**: Check that port 8765 is not blocked by your firewall

### Google Sheets Issues

- **HTML response instead of JSON**: Redeploy your Apps Script and ensure CORS settings are correct
- **Permission errors**: Make sure your script is deployed with "Anyone, even anonymous" access
- **Timeout errors**: The script includes retry logic, but very slow connections may still fail

### LeetCode Issues

- **Code not detecting**: The script tries multiple methods to extract your code; if it fails, your code will not be saved
- **Problem not marked as solved**: Ensure your solution is accepted before trying to save

## 🧪 Testing Google Sheets Integration

Use the included direct_submission_node.js script to test your Google Sheets integration:

1. Update the `googleScriptUrl` in the script with your Apps Script web app URL
2. Run `node direct_submission_node.js`
3. Check your Google Sheet for a new test entry

## 🙏 Acknowledgements
- Based on [LeetCode2Anki](https://github.com/krmanik/leetcode2anki) by krmanik
- [AnkiConnect](https://github.com/FooSoft/anki-connect) for enabling Anki integration
- [Speed Highlight](https://github.com/speed-highlight/core) for syntax highlighting
