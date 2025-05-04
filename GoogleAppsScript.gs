/**
 * Main entry point for web requests
 * This function delegates to the appropriate handler based on the HTTP method
 */
/*

****************************************************************************************************************************
Replace SPREADSHEET_ID below with your spreadsheet ID with edit access enabled otherwise, it won't work

*/

// Set your spreadsheet ID here - only need to change in one place
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";

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
  
  // Create a response object compatible with CORS
  const output = ContentService.createTextOutput(JSON.stringify({"status": "success"}));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Add headers to the response manually via advanced service
  const response = { 
    status: "success", 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Access-Control-Max-Age': '3600'
    }
  };
  
  // Return the content and let Apps Script handle the headers properly
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles GET requests - returns a simple status for testing
 * If action=getProblems is passed, returns all problems in the sheet
 */
function doGet(e) {
  // Check if the request is for all problems
  if (e && e.parameter && e.parameter.action === 'getProblems') {
    return getAllProblems();
  }
  
  // Create a response with necessary CORS headers included in the JSON
  const response = {
    "status": "online", 
    "message": "Google Sheets API is running",
    "headers": {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Access-Control-Max-Age': '3600'
    }
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns all problem data as JSON for the web UI
 * This is used by the Next.js application to display problems
 */
function getAllProblems() {
  try {
    // Use the centralized spreadsheet ID variable
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      // No data or only headers
      const response = {
        "success": true,
        "problems": [],
        "headers": {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
          'Access-Control-Max-Age': '3600'
        }
      };
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const headerRow = data[0];
    
    // Convert sheet data to JSON
    const problems = [];
    for (let i = 1; i < data.length; i++) {
      const problem = {};
      for (let j = 0; j < headerRow.length; j++) {
        // Handle date objects for the Timestamp column
        if (j === 0 && data[i][j] instanceof Date) {
          problem[headerRow[j]] = data[i][j].toISOString();
        } else {
          problem[headerRow[j]] = data[i][j];
        }
      }
      problems.push(problem);
    }
    
    // Include CORS headers in the response object
    const response = {
      "success": true,
      "problems": problems,
      "headers": {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Max-Age': '3600'
      }
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    const errorResponse = {
      "success": false,
      "error": error.toString(),
      "headers": {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Max-Age': '3600'
      }
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles POST requests from the userscript
 * Adds the problem data to a Google Sheet
 */
function doPost(e) {
  try {
    // Use the centralized spreadsheet ID variable
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.id || !data.title) {
      const errorResponse = {
        "error": "Missing required fields",
        "result": "error",
        "headers": {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
          'Access-Control-Max-Age': '3600'
        }
      };
      
      return ContentService
        .createTextOutput(JSON.stringify(errorResponse))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if this problem already exists in the sheet
    const existingEntry = findExistingProblem(sheet, data.id);
    let statusMessage = "";
    
    if (existingEntry && existingEntry.rowIndex > 0) {
      // Problem already exists, update the row
      if (data.update !== false) {  // Allow forcing a new entry if update=false
        updateExistingProblem(sheet, existingEntry, data);
        statusMessage = "Entry already found - updated existing record for Problem #" + data.id;
        Logger.log(statusMessage);
      } else {
        // Add as a new entry if the caller explicitly requests it
        addNewProblemRow(sheet, data);
        statusMessage = "Entry found but new entry requested - inserted new record for Problem #" + data.id;
        Logger.log(statusMessage);
      }
    } else {
      // Problem doesn't exist, add a new row
      addNewProblemRow(sheet, data);
      statusMessage = "Entry not found - inserted new record for Problem #" + data.id;
      Logger.log(statusMessage);
    }
    
    const successResponse = {
      "result": "success",
      "message": statusMessage,
      "wasUpdated": !!(existingEntry && data.update !== false),
      "headers": {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Max-Age': '3600'
      }
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(successResponse))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    const errorResponse = {
      "error": error.toString(),
      "result": "error",
      "stack": error.stack,
      "headers": {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Max-Age': '3600'
      }
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Finds an existing problem entry by ID
 * @param {Sheet} sheet The Google Sheet to search
 * @param {string} problemId The problem ID to search for
 * @return {Object|null} The row data and index if found, null otherwise
 */
function findExistingProblem(sheet, problemId) {
  // Get all data from the sheet
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null; // Empty or just headers
  
  // Find the index of the ID column (should be column 1 - the second column)
  const idColIndex = 1;
  
  // Search for the problem ID
  for (let i = 1; i < data.length; i++) { // Start at 1 to skip headers
    if (data[i][idColIndex] == problemId) {
      return {
        rowData: data[i],
        rowIndex: i + 1  // +1 because sheet rows are 1-indexed
      };
    }
  }
  
  return null;
}

/**
 * Updates an existing problem entry with new data
 */
function updateExistingProblem(sheet, existingEntry, newData) {
  // Process the tags array
  let tagsString = "";
  if (newData.tags && Array.isArray(newData.tags)) {
    tagsString = newData.tags.join(", ");
  }
  
  // Format first attempt result as text (if available)
  let firstAttemptText = "Not recorded";
  if (newData.firstAttemptSuccess === true) {
    firstAttemptText = "Success";
  } else if (newData.firstAttemptSuccess === false) {
    firstAttemptText = "Failed";
  }
  
  // Prepare updated row data
  const updatedRow = [
    new Date(),                   // Timestamp (always update)
    newData.id || "",             // Problem ID
    newData.title || "",          // Problem title
    newData.difficulty || "",     // Difficulty
    tagsString,                   // Tags
    newData.url || "",            // URL (not Link)
    newData.status || "Pending",  // Status
    newData.remarks || existingEntry.rowData[7] || ""  // Remarks (not Remark)
  ];
  
  // Add performance metrics
  if (sheet.getLastColumn() >= 12) {  // Check if we have the performance columns
    updatedRow.push(
      newData.solveTime || existingEntry.rowData[8] || "",
      newData.solveTimeSeconds || existingEntry.rowData[9] || "",
      newData.firstAttemptSuccess !== undefined ? firstAttemptText : existingEntry.rowData[10] || "Not recorded",
      newData.confidence || existingEntry.rowData[11] || ""
    );
  }
  
  // Update the row
  sheet.getRange(existingEntry.rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
}

/**
 * Adds a new problem row to the sheet
 */
function addNewProblemRow(sheet, data) {
  // Process the tags array
  let tagsString = "";
  if (data.tags && Array.isArray(data.tags)) {
    tagsString = data.tags.join(", ");
  }
  
  // Format first attempt result as text
  let firstAttemptText = "Not recorded";
  if (data.firstAttemptSuccess === true) {
    firstAttemptText = "Success";
  } else if (data.firstAttemptSuccess === false) {
    firstAttemptText = "Failed";
  }
  
  // Check if the sheet has headers
  let hasHeaders = false;
  let headerRow = [];
  try {
    headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    hasHeaders = headerRow.length > 0;
  } catch (err) {
    hasHeaders = false;
  }
  
  // If sheet is empty or doesn't have headers yet, create them
  if (!hasHeaders || sheet.getLastRow() === 0) {
    // Use the exact column names from user's spreadsheet
    const headers = [
      "Timestamp", "ID", "Title", "Difficulty", "Tags", "URL", "Status", "Remarks", 
      "Solve Time", "Solve Time (sec)", "First Attempt", "Confidence"
    ];
    sheet.appendRow(headers);
  }
  
  // Prepare the data row
  const rowData = [
    new Date(),                 // Timestamp
    data.id || "",              // Problem ID
    data.title || "",           // Problem title
    data.difficulty || "",      // Difficulty
    tagsString,                 // Tags
    data.url || "",             // URL (not Link)
    data.status || "Pending",   // Status
    data.remarks || "",         // Remarks (not Remark)
    data.solveTime || "",       // Solve time (formatted)
    data.solveTimeSeconds || "", // Solve time in seconds
    firstAttemptText,           // First attempt result
    data.confidence || ""       // Confidence rating
  ];
  
  // Append the row once
  sheet.appendRow(rowData);
}

/**
 * Utility function to ensure required columns exist in the sheet
 * This can be used for future expansion
 */
function ensureColumns(sheet, requiredColumns) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    // Add missing columns
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1, 1, missingColumns.length)
      .setValues([missingColumns]);
  }
}
