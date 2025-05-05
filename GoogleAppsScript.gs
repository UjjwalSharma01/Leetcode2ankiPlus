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
  // Create a proper CORS response for preflight requests
  // This uses the HtmlService which correctly handles headers
  return HtmlService.createHtmlOutput('')
    .addHeader('Access-Control-Allow-Origin', '*')
    .addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    .addHeader('Access-Control-Max-Age', '3600');
}

/**
 * Main entry point for web requests
 * This function delegates to the appropriate handler based on the HTTP method
 */
function doGet(e) {
  // Handle OPTIONS requests as well - this is needed because Google Apps Script doesn't properly support OPTIONS
  // This workaround detects if X-HTTP-Method-Override is set to OPTIONS
  const headers = {};
  if (e && e.parameter && e.parameter['X-HTTP-Method-Override'] === 'OPTIONS') {
    return handleOptionsRequest();
  }
  
  // Normal GET request handling
  if (e && e.parameter && e.parameter.action === 'getProblems') {
    return getAllProblems();
  }
  
  if (e && e.parameter && e.parameter.action === 'getDueReviews') {
    return getDueReviews();
  }
  
  // Create a response with necessary CORS headers
  const response = {
    "status": "online", 
    "message": "Google Sheets API is running"
  };
  
  return createJsonResponse(response);
}

/**
 * Handle OPTIONS requests (for CORS preflight)
 * This is a workaround for Google Apps Script's limited OPTIONS support
 */
function handleOptionsRequest() {
  const output = ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "CORS preflight handled"
  }));
  
  output.setMimeType(ContentService.MimeType.JSON);
  
  return output;
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
        "problems": []
      };
      return createJsonResponse(response);
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
    
    const response = {
      "success": true,
      "problems": problems
    };
    
    return createJsonResponse(response);
  } catch (error) {
    const errorResponse = {
      "success": false,
      "error": error.toString()
    };
    
    return createJsonResponse(errorResponse);
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
    
    // Handle adding problem to review schedule
    if (data.action === 'addToReview') {
      return addProblemToReview(data);
    }

    // Handle bulk adding problems to review schedule
    if (data.action === 'bulkAddToReview') {
      return bulkAddToReview(data);
    }
    
    // Use the centralized spreadsheet ID variable
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
    // Validate required fields
    if (!data.id || !data.title) {
      const errorResponse = {
        "error": "Missing required fields",
        "result": "error"
      };
      
      return createJsonResponse(errorResponse);
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
      "wasUpdated": !!(existingEntry && data.update !== false)
    };
    
    return createJsonResponse(successResponse);
      
  } catch (error) {
    const errorResponse = {
      "error": error.toString(),
      "result": "error",
      "stack": error.stack
    };
    
    return createJsonResponse(errorResponse);
  }
}

/**
 * Adds a problem to the review schedule
 */
function addProblemToReview(data) {
  try {
    // Validate required data
    if (!data.id) {
      return createJsonResponse({
        "success": false,
        "error": "Problem ID is required"
      });
    }
    
    // Get Revision Schedule sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const revisionSheet = ss.getSheetByName("Revision Schedule");
    
    if (!revisionSheet) {
      return createJsonResponse({
        "success": false,
        "error": "Revision Schedule sheet not found. Please set up SRS system first."
      });
    }
    
    // Calculate next review date
    const daysUntilReview = parseInt(data.days) || 1;
    if (isNaN(daysUntilReview) || daysUntilReview < 1) {
      return createJsonResponse({
        "success": false,
        "error": "Days until review must be a positive number"
      });
    }
    
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + daysUntilReview);
    
    // Get the problem title (from data or lookup in main sheet)
    let title = data.title || "";
    if (!title) {
      title = getProblemTitle(data.id);
    }
    
    // Check if problem already exists in revision schedule
    const existingProblem = findProblemInRevisionSchedule(revisionSheet, data.id);
    
    if (existingProblem) {
      if (data.updateIfExists === true) {
        // Update existing problem's review date
        revisionSheet.getRange(existingProblem.rowIndex, 4, 1, 2).setValues([[
          reviewDate,      // Next Review Date
          daysUntilReview  // Interval (days)
        ]]);
        
        return createJsonResponse({
          "success": true,
          "message": `Problem ${data.id} already exists in revision schedule. Updated review date.`,
          "wasUpdated": true,
          "nextReviewDate": reviewDate.toISOString()
        });
      } else {
        return createJsonResponse({
          "success": false,
          "error": `Problem ${data.id} already exists in revision schedule.`,
          "exists": true
        });
      }
    }
    
    // Ensure revision sheet has headers
    let hasHeaders = true;
    if (revisionSheet.getLastRow() === 0) {
      // Sheet is empty, add headers
      revisionSheet.getRange(1, 1, 1, 7).setValues([[
        "Problem ID", "Title", "Last Review Date", "Next Review Date", "Review Count", "Interval", "Status"
      ]]);
      revisionSheet.getRange("A1:G1").setFontWeight("bold");
    }
    
    // Add new problem to revision schedule
    const nextRow = revisionSheet.getLastRow() + 1;
    revisionSheet.getRange(nextRow, 1, 1, 7).setValues([[
      data.id,              // Problem ID
      title,                // Title
      new Date(),           // Last Review Date (today)
      reviewDate,           // Next Review Date
      0,                    // Review Count
      daysUntilReview,      // Interval (days)
      data.status || "Pending" // Status
    ]]);
    
    return createJsonResponse({
      "success": true,
      "message": `Problem ${data.id} added to revision schedule for review in ${daysUntilReview} day(s).`,
      "id": data.id,
      "nextReviewDate": reviewDate.toISOString()
    });
  } catch (error) {
    return createJsonResponse({
      "success": false,
      "error": error.toString()
    });
  }
}

/**
 * Handles bulk adding problems to the review schedule
 * Supports different types of bulk operations:
 * - 'all': Add all problems not already in revision schedule
 * - 'today': Add problems from today
 * - 'selected': Add specific problems by IDs
 */
function bulkAddToReview(data) {
  try {
    // Validate bulk type
    if (!data.bulkType) {
      return createJsonResponse({
        "success": false,
        "error": "Bulk type is required (all, today, or selected)"
      });
    }
    
    // Get the spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      return createJsonResponse({
        "success": false,
        "error": "Could not open spreadsheet. Check if the SPREADSHEET_ID is correct."
      });
    }
    
    // Get main and revision sheets
    const mainSheet = ss.getActiveSheet();
    const revisionSheet = ss.getSheetByName("Revision Schedule");
    
    if (!revisionSheet) {
      return createJsonResponse({
        "success": false,
        "error": "Revision Schedule sheet not found. Please set up SRS system first."
      });
    }
    
    // Ensure days parameter is valid
    const daysUntilReview = parseInt(data.days) || 1;
    if (isNaN(daysUntilReview) || daysUntilReview < 1) {
      return createJsonResponse({
        "success": false,
        "error": "Days until review must be a positive number"
      });
    }
    
    // Calculate next review date
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + daysUntilReview);
    
    // Get all problems from main sheet
    const problemData = mainSheet.getDataRange().getValues();
    
    // Find the ID and title columns
    const headers = problemData[0].map(header => String(header).trim().toLowerCase());
    let idIndex = -1;
    let titleIndex = -1;
    let timestampIndex = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (header === 'id') {
        idIndex = i;
      } else if (header === 'title') {
        titleIndex = i;
      } else if (header === 'timestamp' || header === 'date' || header === 'time') {
        timestampIndex = i;
      }
    }
    
    if (idIndex === -1 || titleIndex === -1) {
      return createJsonResponse({
        "success": false,
        "error": "Could not find ID or Title columns in the main sheet"
      });
    }
    
    // Get existing problem IDs in revision schedule
    let existingProblems = [];
    if (revisionSheet.getLastRow() > 1) {
      const existingData = revisionSheet.getRange(2, 1, Math.max(1, revisionSheet.getLastRow() - 1), 1).getValues();
      existingProblems = existingData.map(row => String(row[0])).filter(id => id !== "");
    }
    
    // Ensure revision sheet has headers
    if (revisionSheet.getLastRow() === 0) {
      // Sheet is empty, add headers
      revisionSheet.getRange(1, 1, 1, 7).setValues([[
        "Problem ID", "Title", "Last Review Date", "Next Review Date", "Review Count", "Interval", "Status"
      ]]);
      revisionSheet.getRange("A1:G1").setFontWeight("bold");
    }
    
    // Variables to track results
    let addedCount = 0;
    const problemsAdded = [];
    let errors = [];
    
    // Handle different bulk types
    switch (data.bulkType) {
      case 'all':
        // Add all problems not already in revision schedule
        for (let i = 1; i < problemData.length; i++) {
          const row = problemData[i];
          const id = String(row[idIndex]);
          const title = String(row[titleIndex] || "");
          
          if (id && !existingProblems.includes(id)) {
            try {
              const nextRow = revisionSheet.getLastRow() + 1;
              
              revisionSheet.getRange(nextRow, 1, 1, 7).setValues([[
                id,                // Problem ID
                title,             // Title
                new Date(),        // Last Review Date (today)
                reviewDate,        // Next Review Date
                0,                 // Review Count
                daysUntilReview,   // Interval (days)
                "Pending"          // Status
              ]]);
              
              addedCount++;
              problemsAdded.push(id);
              existingProblems.push(id); // Update tracking array to avoid duplicates
            } catch (e) {
              errors.push(`Error adding problem ${id}: ${e.toString()}`);
            }
          }
        }
        break;
        
      case 'today':
        // Get today's date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Add today's problems to revision schedule
        for (let i = 1; i < problemData.length; i++) {
          const row = problemData[i];
          if (!row) continue;
          
          const id = String(row[idIndex] || "");
          const title = String(row[titleIndex] || "");
          
          // Skip if ID is missing or already in schedule
          if (!id || existingProblems.includes(id)) continue;
          
          // Should we add this problem? Default depends on if we found timestamp column
          let addProblem = timestampIndex === -1;
          
          // If we have timestamp column, check if problem is from today
          if (timestampIndex !== -1 && row.length > timestampIndex) {
            const timestamp = row[timestampIndex];
            if (timestamp && timestamp instanceof Date) {
              // Check if the problem was added today
              const problemDate = new Date(timestamp);
              problemDate.setHours(0, 0, 0, 0);
              
              if (problemDate.getTime() === today.getTime()) {
                addProblem = true;
              }
            }
          }
          
          if (addProblem) {
            try {
              // Calculate next row safely (1-based index in Sheets)
              const nextRow = revisionSheet.getLastRow() + 1;
              
              // Add the problem to revision schedule
              revisionSheet.getRange(nextRow, 1, 1, 7).setValues([[
                id,              // Problem ID
                title,           // Title
                new Date(),      // Last Review Date (today)
                reviewDate,      // Next Review Date
                0,               // Review Count
                daysUntilReview, // Interval (days)
                "Pending"        // Status
              ]]);
              
              addedCount++;
              problemsAdded.push(id);
              existingProblems.push(id); // Update tracking array to avoid duplicates
            } catch (e) {
              errors.push(`Error adding problem ${id}: ${e.toString()}`);
            }
          }
        }
        break;
        
      case 'selected':
        // Validate selected IDs array
        if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
          return createJsonResponse({
            "success": false,
            "error": "Selected problem IDs array is required"
          });
        }
        
        // Add selected problems to revision schedule
        for (let i = 0; i < data.ids.length; i++) {
          const id = String(data.ids[i]);
          
          // Skip if ID is already in schedule
          if (existingProblems.includes(id)) {
            errors.push(`Problem ${id} already exists in review schedule`);
            continue;
          }
          
          // Find the problem in the main sheet
          let title = '';
          for (let j = 1; j < problemData.length; j++) {
            if (String(problemData[j][idIndex]) === id) {
              title = String(problemData[j][titleIndex] || "");
              break;
            }
          }
          
          if (!title) {
            errors.push(`Problem ${id} not found in main sheet`);
            continue;
          }
          
          try {
            const nextRow = revisionSheet.getLastRow() + 1;
            
            revisionSheet.getRange(nextRow, 1, 1, 7).setValues([[
              id,              // Problem ID
              title,           // Title
              new Date(),      // Last Review Date (today)
              reviewDate,      // Next Review Date
              0,               // Review Count
              daysUntilReview, // Interval (days)
              "Pending"        // Status
            ]]);
            
            addedCount++;
            problemsAdded.push(id);
            existingProblems.push(id); // Update tracking array to avoid duplicates
          } catch (e) {
            errors.push(`Error adding problem ${id}: ${e.toString()}`);
          }
        }
        break;
        
      default:
        return createJsonResponse({
          "success": false,
          "error": `Unknown bulk type: ${data.bulkType}`
        });
    }
    
    return createJsonResponse({
      "success": true,
      "message": `Added ${addedCount} problems to review in ${daysUntilReview} day(s)`,
      "addedCount": addedCount,
      "addedProblems": problemsAdded,
      "errors": errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return createJsonResponse({
      "success": false,
      "error": error.toString()
    });
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
    
    // Process based on difficulty rating or custom interval
    let nextInterval = 1; // Default: review tomorrow
    
    if (data.difficulty === "custom" && data.nextInterval) {
      // Use the user-specified interval
      nextInterval = parseInt(data.nextInterval);
      if (isNaN(nextInterval) || nextInterval < 1) nextInterval = 1;
    } else if (data.difficulty === "easy") {
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
 * Helper function to find a problem in the revision schedule
 */
function findProblemInRevisionSchedule(sheet, problemId) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null; // Empty or just headers
  
  // Search for the problem ID (first column)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      return {
        rowData: data[i],
        rowIndex: i + 1  // +1 because sheet rows are 1-indexed
      };
    }
  }
  
  return null;
}

/**
 * Helper function to get problem title from main sheet
 */
function getProblemTitle(problemId) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const problem = findExistingProblem(sheet, problemId);
    
    if (problem && problem.rowData) {
      // Title is in the third column (index 2) in the main sheet
      return problem.rowData[2] || "";
    }
    
    return "";
  } catch (error) {
    Logger.log("Error getting problem title: " + error.toString());
    return "";
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
  // Since setHeader isn't available in older Google Apps Script versions,
  // we include the CORS headers directly in the JSON response
  
  // Add CORS headers manually to response object
  obj.cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
