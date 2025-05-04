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
 * If action=getDueReviews is passed, returns problems due for review
 */
function doGet(e) {
  // Check if the request is for all problems
  if (e && e.parameter && e.parameter.action === 'getProblems') {
    return getAllProblems();
  }
  
  // Check if the request is for due reviews
  if (e && e.parameter && e.parameter.action === 'getDueReviews') {
    return getDueReviews();
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
 * Gets problems due for review
 */
function getDueReviews() {
  try {
    // Use the centralized spreadsheet ID variable
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const revisionSheet = ss.getSheetByName("Revision Schedule");
    
    if (!revisionSheet) {
      return createJsonResponse({
        "success": false,
        "error": "Revision Schedule sheet not found. SRS system may not be set up."
      });
    }
    
    // Get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all data from the revision sheet
    const data = revisionSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse({
        "success": true,
        "dueReviews": []
      });
    }
    
    const headerRow = data[0];
    
    // Find indices for key columns
    const idIndex = headerRow.findIndex(col => col === "Problem ID");
    const titleIndex = headerRow.findIndex(col => col === "Title");
    const nextReviewIndex = headerRow.findIndex(col => col === "Next Review Date");
    const reviewCountIndex = headerRow.findIndex(col => col === "Review Count");
    const statusIndex = headerRow.findIndex(col => col === "Status");
    
    if (idIndex === -1 || nextReviewIndex === -1 || statusIndex === -1) {
      return createJsonResponse({
        "success": false,
        "error": "Required columns not found in Revision Schedule sheet"
      });
    }
    
    // Find problems due today or earlier
    const dueReviews = [];
    for (let i = 1; i < data.length; i++) {
      const nextReviewDate = new Date(data[i][nextReviewIndex]);
      nextReviewDate.setHours(0, 0, 0, 0);
      
      if (nextReviewDate <= today && data[i][statusIndex] === "Pending") {
        // Get main sheet data for this problem ID
        const problemDetails = getProblemDetails(data[i][idIndex]);
        
        dueReviews.push({
          id: data[i][idIndex],
          title: data[i][titleIndex] || "",
          reviewCount: data[i][reviewCountIndex] || 0,
          nextReviewDate: nextReviewDate.toISOString(),
          details: problemDetails // Additional details from main sheet
        });
      }
    }
    
    return createJsonResponse({
      "success": true,
      "dueReviews": dueReviews
    });
  } catch (error) {
    return createJsonResponse({
      "success": false,
      "error": error.toString()
    });
  }
}

/**
 * Handles POST requests from the userscript
 * Adds the problem data to a Google Sheet
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Handle review completion
    if (data.action === 'completeReview') {
      return completeReview(data);
    }
    
    // Use the centralized spreadsheet ID variable
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
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
 * Updates a problem's review status
 */
function completeReview(data) {
  try {
    // Use the centralized spreadsheet ID variable
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const revisionSheet = ss.getSheetByName("Revision Schedule");
    
    if (!revisionSheet) {
      return createJsonResponse({
        "success": false,
        "error": "Revision Schedule sheet not found"
      });
    }
    
    // Validate required fields
    if (!data.id) {
      return createJsonResponse({
        "success": false,
        "error": "Problem ID is required"
      });
    }
    
    // Find the problem row
    const sheetData = revisionSheet.getDataRange().getValues();
    let problemRow = -1;
    
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] == data.id) {
        problemRow = i + 1; // Convert to 1-indexed row number
        break;
      }
    }
    
    if (problemRow === -1) {
      return createJsonResponse({
        "success": false,
        "error": `Problem ID ${data.id} not found in revision schedule`
      });
    }
    
    // Get current data for the problem
    const rowData = sheetData[problemRow - 1];
    const reviewCount = rowData[4];
    
    // Process based on difficulty rating
    let nextInterval = 1; // Default: review tomorrow
    
    if (data.difficulty === "easy") {
      nextInterval = Math.min(30, reviewCount * 2 + 1); // Exponential growth, max 30 days
    } else if (data.difficulty === "medium") {
      nextInterval = Math.min(14, reviewCount + 2); // Linear growth, max 14 days
    } else if (data.difficulty === "hard") {
      nextInterval = 1; // Always tomorrow for hard problems
    } else if (data.nextInterval) {
      // Use provided interval if difficulty not specified
      nextInterval = parseInt(data.nextInterval);
      if (isNaN(nextInterval) || nextInterval < 1) nextInterval = 1;
    }
    
    // Calculate next review date
    const nextReviewDate = new Date();
    if (data.complete === false) {
      // If marked as not complete, schedule for tomorrow
      nextReviewDate.setDate(nextReviewDate.getDate() + 1);
      nextInterval = 1;
    } else {
      // Normal schedule based on difficulty
      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
    }
    
    // Update the problem row
    revisionSheet.getRange(problemRow, 3, 1, 5).setValues([[
      new Date(),        // Last Review Date (today)
      nextReviewDate,    // Next Review Date 
      reviewCount + 1,   // Review Count
      nextInterval,      // Interval (days)
      "Pending"          // Status
    ]]);
    
    // Log the review in history if we have a history sheet
    const historySheet = ss.getSheetByName("Review History");
    if (historySheet) {
      const nextRow = historySheet.getLastRow() + 1;
      historySheet.getRange(nextRow, 1, 1, 4).setValues([[
        data.id,
        new Date(),
        data.difficulty || "medium",
        nextInterval
      ]]);
    }
    
    return createJsonResponse({
      "success": true,
      "message": `Review completed for problem ${data.id}. Next review scheduled in ${nextInterval} days.`,
      "nextReviewDate": nextReviewDate.toISOString(),
      "nextInterval": nextInterval
    });
  } catch (error) {
    return createJsonResponse({
      "success": false,
      "error": error.toString()
    });
  }
}

/**
 * Utility to get problem details from main sheet
 */
function getProblemDetails(problemId) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return null;
    
    const headers = data[0];
    const idIndex = headers.findIndex(col => col === "ID");
    
    if (idIndex === -1) return null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] == problemId) {
        const problem = {};
        for (let j = 0; j < headers.length; j++) {
          problem[headers[j]] = data[i][j];
        }
        return problem;
      }
    }
    
    return null;
  } catch (error) {
    Logger.log("Error getting problem details: " + error.toString());
    return null;
  }
}

/**
 * Helper for creating JSON responses with CORS headers
 */
function createJsonResponse(obj) {
  // Add CORS headers to the response object
  obj.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    'Access-Control-Max-Age': '3600'
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
