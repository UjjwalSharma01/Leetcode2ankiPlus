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
    // Use a generic sheet ID placeholder - replace with your own sheet ID
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
