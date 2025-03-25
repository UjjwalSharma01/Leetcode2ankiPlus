/**
 * Google Apps Script to implement a spaced repetition system for LeetCode problems
 * This complements the existing tracking in the main spreadsheet

This will only work if you gave column names like 

Timestamp |	ID | Title |	Difficulty |	Tags |	URL | Status |	Remarks |	Solve Time |	Solve Time (sec) |	First Attempt |	Confidence
 */

/**
 * Creates the necessary sheets and structure for spaced repetition tracking
 */
function setupSpacedRepetitionSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Revision Schedule sheet if it doesn't exist
  let revisionSheet = ss.getSheetByName("Revision Schedule");
  if (!revisionSheet) {
    revisionSheet = ss.insertSheet("Revision Schedule");
    
    // Setup headers
    revisionSheet.getRange("A1:G1").setValues([["Problem ID", "Title", "Last Review Date", 
                                              "Next Review Date", "Review Count", "Interval", "Status"]]);
    
    // Format headers
    revisionSheet.getRange("A1:G1").setFontWeight("bold");
    revisionSheet.getRange("C1:D1").setNumberFormat("yyyy-mm-dd");
    
    // Freeze header row
    revisionSheet.setFrozenRows(1);
  }
  
  // Create Dashboard sheet if it doesn't exist
  let dashboardSheet = ss.getSheetByName("Dashboard");
  if (!dashboardSheet) {
    dashboardSheet = ss.insertSheet("Dashboard");
    setupDashboard(dashboardSheet);
  }
  
  // Create a menu for spaced repetition functions
  createMenu();
}

/**
 * Creates a menu in the spreadsheet for SRS functions
 */
function createMenu() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('LeetCode SRS')
    .addItem('Setup System', 'setupSpacedRepetitionSystem')
    .addSeparator()
    .addItem('Add Problems to Review', 'addProblemsToReview')
    .addItem('Add Today\'s Problems', 'addTodaysProblems')
    .addSeparator()
    .addItem('Complete Today\'s Review', 'completeReview')
    .addItem('Batch Complete Reviews', 'batchCompleteReviews') // New option
    .addItem('Reschedule Pending Reviews', 'reschedulePendingReviews')
    .addSeparator()
    .addItem('Add Problem by ID', 'manuallyAddProblem')
    .addItem('Update Revision Date', 'manuallyUpdateRevisionDate')
    .addItem('Remove Problem from Review', 'removeProblemFromReview')
    .addSeparator()
    .addItem('Import Problems from CSV', 'importProblemsFromCSV') // Added to main menu
    .addItem('Export Revision Schedule', 'exportRevisionSchedule'); // New option
  
  menu.addToUi();
}

/**
 * Sets up the dashboard layout
 */
function setupDashboard(sheet) {
  sheet.getRange("A1").setValue("🧠 LeetCode Spaced Repetition Dashboard");
  sheet.getRange("A1").setFontSize(16).setFontWeight("bold");
  
  sheet.getRange("A3").setValue("Today's Date:");
  sheet.getRange("B3").setFormula("=TODAY()").setNumberFormat("yyyy-mm-dd");
  
  sheet.getRange("A5").setValue("Problems Due for Review Today:");
  
  // Create a dynamic range that shows problems due today with action buttons
  sheet.getRange("A6:H6").setValues([["ID", "Title", "Last Review", "Review #", "Easy", "Medium", "Hard", "Skip"]]);
  sheet.getRange("A6:H6").setFontWeight("bold");
  
  // Add formula to show problems due today
  sheet.getRange("A7").setFormula(
    "=QUERY('Revision Schedule'!A2:G, \"SELECT A, B, C, E WHERE D <= date '\" & TEXT(TODAY(), \"yyyy-mm-dd\") & \"' AND G = 'Pending' ORDER BY D ASC\", 0)"
  );
  
  // Add buttons to the dashboard (will be populated with script)
  sheet.getRange("E7:H100").setBackground("#f3f3f3");
  
  // Add statistics section
  sheet.getRange("A15").setValue("Revision Statistics");
  sheet.getRange("A15").setFontWeight("bold");
  
  sheet.getRange("A16").setValue("Total Problems in Review:");
  sheet.getRange("B16").setFormula("=COUNTA('Revision Schedule'!A2:A)");
  
  sheet.getRange("A17").setValue("Problems Due Today:");
  sheet.getRange("B17").setFormula("=COUNTIFS('Revision Schedule'!D2:D, \"<=\"&TODAY(), 'Revision Schedule'!G2:G, \"Pending\")");
  
  sheet.getRange("A18").setValue("Problems Overdue:");
  sheet.getRange("B18").setFormula("=COUNTIFS('Revision Schedule'!D2:D, \"<\"&TODAY(), 'Revision Schedule'!G2:G, \"Pending\")");
  
  // Add new statistics for completed problems
  sheet.getRange("A19").setValue("Problems Completed:");
  sheet.getRange("B19").setFormula("=COUNTIFS('Revision Schedule'!G2:G, \"Completed\")");
  
  // Add review history section
  sheet.getRange("A20").setValue("Review History");
  sheet.getRange("A20").setFontWeight("bold");
  
  sheet.getRange("A21").setValue("Last 7 Days:");
  sheet.getRange("B21").setFormula("=COUNTIFS('Revision Schedule'!C2:C, \">=\"&TODAY()-7, 'Revision Schedule'!C2:C, \"<=\"&TODAY())");
  
  sheet.getRange("A22").setValue("This Month:");
  sheet.getRange("B22").setFormula("=COUNTIFS('Revision Schedule'!C2:C, \">=\"&DATE(YEAR(TODAY()), MONTH(TODAY()), 1), 'Revision Schedule'!C2:C, \"<=\"&TODAY())");
  
  // Set column widths
  sheet.setColumnWidth(1, 70);  // ID
  sheet.setColumnWidth(2, 250); // Title
  sheet.setColumnWidth(3, 100); // Last Review
  sheet.setColumnWidth(4, 80);  // Review Count
  sheet.setColumnWidth(5, 70);  // Easy button
  sheet.setColumnWidth(6, 70);  // Medium button
  sheet.setColumnWidth(7, 70);  // Hard button
  sheet.setColumnWidth(8, 70);  // Skip button
  
  // Create OnEdit trigger for button actions
  createDashboardTriggers();
}

/**
 * Creates triggers for dashboard buttons
 */
function createDashboardTriggers() {
  // Delete any existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // Create new trigger
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
}

/**
 * Handles edit events for button clicks on dashboard
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'Dashboard') return;
  
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  
  // Check if click is in the button area (columns E-H, rows 7+)
  if (row >= 7 && col >= 5 && col <= 8) {
    // Get problem ID from the row
    const problemId = sheet.getRange(row, 1).getValue();
    if (!problemId) return;
    
    if (col === 5) {
      // Easy button clicked
      completeReviewWithDifficulty(problemId, 'easy');
    } else if (col === 6) {
      // Medium button clicked
      completeReviewWithDifficulty(problemId, 'medium');
    } else if (col === 7) {
      // Hard button clicked
      completeReviewWithDifficulty(problemId, 'hard');
    } else if (col === 8) {
      // Skip/Reschedule button clicked
      rescheduleSpecificProblem(problemId, 1); // Reschedule by 1 day
    }
    
    // Clear the cell content
    range.clearContent();
    
    // Refresh the dashboard query - modified to include Pending status filter
    sheet.getRange("A7").setFormula(
      "=QUERY('Revision Schedule'!A2:G, \"SELECT A, B, C, E WHERE D <= date '\" & TEXT(TODAY(), \"yyyy-mm-dd\") & \"' AND G = 'Pending' ORDER BY D ASC\", 0)"
    );
  }
}

/**
 * Marks a problem review as completed with difficulty rating
 * Asks if user wants to schedule next review rather than doing it automatically
 */
function completeReviewWithDifficulty(problemId, difficulty) {
  if (!problemId) {
    // If called from menu, prompt for problem ID
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt("Complete Review", "Enter the Problem ID:", ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() === ui.Button.CANCEL) {
      return;
    }
    
    problemId = response.getResponseText().trim();
    
    // Prompt for difficulty
    const difficultyResponse = ui.alert(
      "Rate Problem Difficulty",
      "How difficult was this problem for you?",
      ui.ButtonSet.YES_NO_CANCEL
    );
    
    // Map button to difficulty level
    if (difficultyResponse === ui.Button.YES) difficulty = "easy";
    else if (difficultyResponse === ui.Button.NO) difficulty = "medium";
    else difficulty = "hard";
  }
  
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  // Find the problem row
  const data = revisionSheet.getDataRange().getValues();
  let problemRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      problemRow = i + 1; // Convert to 1-indexed row number
      break;
    }
  }
  
  if (problemRow === -1) {
    ui.alert(`Problem ID ${problemId} not found in revision schedule!`);
    return;
  }
  
  // Get current data for the problem
  const rowData = data[problemRow - 1];
  const reviewCount = rowData[4];
  
  // Ask if user wants to schedule next review
  const scheduleNextReview = ui.alert(
    "Schedule Next Review?", 
    `Would you like to schedule another review for problem ${problemId}?`, 
    ui.ButtonSet.YES_NO
  );
  
  // Mark as completed today
  if (scheduleNextReview === ui.Button.NO) {
    // Update the problem row - mark as completed with no next review
    revisionSheet.getRange(problemRow, 3, 1, 5).setValues([[
      new Date(),        // Last Review Date (today)
      null,              // No Next Review Date
      reviewCount + 1,   // Review Count
      0,                 // No Interval
      "Completed"        // Status changed to Completed (not pending)
    ]]);
    
    // Log review history
    logReviewHistory(problemId, difficulty, 0);
    
    return {
      success: true,
      message: `Review completed for problem ${problemId}. No further reviews scheduled.`
    };
  }
  
  // User wants to schedule next review - ask for days
  const daysResponse = ui.prompt(
    "Schedule Next Review",
    "Enter number of days until next review:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (daysResponse.getSelectedButton() !== ui.Button.OK) {
    return {
      success: false,
      message: "Review scheduling canceled."
    };
  }
  
  const nextInterval = parseInt(daysResponse.getResponseText().trim());
  if (isNaN(nextInterval) || nextInterval < 1) {
    ui.alert("Please enter a valid number of days (must be 1 or greater).");
    return {
      success: false,
      message: "Invalid interval entered."
    };
  }
  
  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  
  // Update the problem row
  revisionSheet.getRange(problemRow, 3, 1, 5).setValues([[
    new Date(),        // Last Review Date (today)
    nextReviewDate,    // Next Review Date 
    reviewCount + 1,   // Review Count
    nextInterval,      // Interval (days)
    "Pending"          // Status (still pending future review)
  ]]);
  
  // Log review history
  logReviewHistory(problemId, difficulty, nextInterval);
  
  return {
    success: true,
    message: `Review completed for problem ${problemId}. Next review scheduled in ${nextInterval} days.`
  };
}

/**
 * Marks a problem review as completed and optionally schedules the next review
 */
function completeReview(problemId) {
  if (!problemId) {
    // If called from menu, prompt for problem ID
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt("Complete Review", "Enter the Problem ID:", ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() === ui.Button.CANCEL) {
      return;
    }
    
    problemId = response.getResponseText().trim();
  }
  
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  // Find the problem row
  const data = revisionSheet.getDataRange().getValues();
  let problemRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      problemRow = i + 1; // Convert to 1-indexed row number
      break;
    }
  }
  
  if (problemRow === -1) {
    ui.alert(`Problem ID ${problemId} not found in revision schedule!`);
    return;
  }
  
  // Get current data for the problem
  const rowData = data[problemRow - 1];
  const reviewCount = rowData[4];
  
  // Ask if user wants to schedule next review
  const scheduleNextReview = ui.alert(
    "Schedule Next Review?", 
    `Would you like to schedule another review for problem ${problemId}?`, 
    ui.ButtonSet.YES_NO
  );
  
  // Mark as completed today
  if (scheduleNextReview === ui.Button.NO) {
    // Update the problem row - mark as completed with no next review
    revisionSheet.getRange(problemRow, 3, 1, 5).setValues([[
      new Date(),        // Last Review Date (today)
      null,              // No Next Review Date
      reviewCount + 1,   // Review Count
      0,                 // No Interval
      "Completed"        // Status changed to Completed (not pending)
    ]]);
    
    return {
      success: true,
      message: `Review completed for problem ${problemId}. No further reviews scheduled.`
    };
  }
  
  // User wants to schedule next review - ask for days
  const daysResponse = ui.prompt(
    "Schedule Next Review",
    "Enter number of days until next review:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (daysResponse.getSelectedButton() !== ui.Button.OK) {
    return {
      success: false,
      message: "Review scheduling canceled."
    };
  }
  
  const nextInterval = parseInt(daysResponse.getResponseText().trim());
  if (isNaN(nextInterval) || nextInterval < 1) {
    ui.alert("Please enter a valid number of days (must be 1 or greater).");
    return {
      success: false,
      message: "Invalid interval entered."
    };
  }
  
  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  
  // Update the problem row
  revisionSheet.getRange(problemRow, 3, 1, 5).setValues([[
    new Date(),        // Last Review Date (today)
    nextReviewDate,    // Next Review Date 
    reviewCount + 1,   // Review Count
    nextInterval,      // Interval (days)
    "Pending"          // Status
  ]]);
  
  return {
    success: true,
    message: `Review completed for problem ${problemId}. Next review scheduled in ${nextInterval} days.`
  };
}

/**
 * Logs review history in a separate sheet for analytics
 */
function logReviewHistory(problemId, difficulty, interval) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or get the history sheet
  let historySheet = ss.getSheetByName("Review History");
  if (!historySheet) {
    historySheet = ss.insertSheet("Review History");
    historySheet.getRange("A1:D1").setValues([["Problem ID", "Review Date", "Difficulty", "Next Interval"]]);
    historySheet.getRange("A1:D1").setFontWeight("bold");
    historySheet.setFrozenRows(1);
  }
  
  // Add new history entry
  const nextRow = historySheet.getLastRow() + 1;
  historySheet.getRange(nextRow, 1, 1, 4).setValues([[
    problemId,
    new Date(),
    difficulty,
    interval
  ]]);
}

/**
 * Reschedules a specific problem by a number of days
 */
function rescheduleSpecificProblem(problemId, days) {
  if (!problemId) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      "Reschedule Problem",
      "Enter the Problem ID to reschedule:",
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    problemId = response.getResponseText().trim();
    
    const daysResponse = ui.prompt(
      "Reschedule Problem",
      "Enter number of days to reschedule by:",
      ui.ButtonSet.OK_CANCEL
    );
    
    if (daysResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    days = parseInt(daysResponse.getResponseText().trim());
    if (isNaN(days)) {
      ui.alert("Please enter a valid number of days.");
      return;
    }
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  // Find the problem row
  const data = revisionSheet.getDataRange().getValues();
  let problemRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      problemRow = i + 1; // Convert to 1-indexed row number
      break;
    }
  }
  
  if (problemRow === -1) {
    SpreadsheetApp.getUi().alert(`Problem ID ${problemId} not found in revision schedule!`);
    return;
  }
  
  // Get current next review date
  const currentDate = new Date(data[problemRow - 1][3]);
  
  // Calculate new review date
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() + days);
  
  // Update the next review date
  revisionSheet.getRange(problemRow, 4).setValue(newDate);
  
  return {
    success: true,
    message: `Rescheduled problem ${problemId} by ${days} days.`
  };
}

/**
 * Allows completing multiple reviews at once
 */
function batchCompleteReviews() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  // Get due problems
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const data = revisionSheet.getDataRange().getValues();
  const dueProblems = [];
  
  for (let i = 1; i < data.length; i++) {
    const nextReviewDate = new Date(data[i][3]);
    nextReviewDate.setHours(0, 0, 0, 0);
    
    if (nextReviewDate <= today && data[i][6] === "Pending") {
      dueProblems.push({
        id: data[i][0],
        title: data[i][1],
        row: i + 1
      });
    }
  }
  
  if (dueProblems.length === 0) {
    ui.alert("No problems are due for review today.");
    return;
  }
  
  // Create a temporary sheet with checkboxes
  let batchSheet = ss.getSheetByName("Batch Review");
  if (batchSheet) {
    ss.deleteSheet(batchSheet);
  }
  batchSheet = ss.insertSheet("Batch Review");
  
  // Setup headers
  batchSheet.getRange("A1:E1").setValues([["✓", "ID", "Title", "Difficulty", "Action"]]);
  batchSheet.getRange("A1:E1").setFontWeight("bold");
  batchSheet.setFrozenRows(1);
  
  // Add due problems
  for (let i = 0; i < dueProblems.length; i++) {
    batchSheet.getRange(i + 2, 1).insertCheckbox();
    batchSheet.getRange(i + 2, 2).setValue(dueProblems[i].id);
    batchSheet.getRange(i + 2, 3).setValue(dueProblems[i].title);
    
    // Create a dropdown for difficulty
    const difficultyRange = batchSheet.getRange(i + 2, 4);
    const difficultyRule = SpreadsheetApp.newDataValidation().requireValueInList(['Easy', 'Medium', 'Hard'], true).build();
    difficultyRange.setDataValidation(difficultyRule);
    difficultyRange.setValue("Medium");
  }
  
  // Add instructions
  batchSheet.getRange(dueProblems.length + 3, 1, 1, 5).merge();
  batchSheet.getRange(dueProblems.length + 3, 1).setValue("Check problems you've completed, select difficulty, and click 'Process Batch Review' below");
  
  // Set column widths
  batchSheet.setColumnWidth(1, 40);   // Checkbox
  batchSheet.setColumnWidth(2, 70);   // ID
  batchSheet.setColumnWidth(3, 250);  // Title
  batchSheet.setColumnWidth(4, 100);  // Difficulty
  
  // Show the batch review sheet
  ss.setActiveSheet(batchSheet);
  
  // Add menu item for processing
  const menu = ui.createMenu('Batch Review')
    .addItem('Process Batch Review', 'processBatchReview')
    .addItem('Cancel Batch Review', 'cancelBatchReview');
  
  menu.addToUi();
}

/**
 * Processes the batch review
 */
function processBatchReview() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const batchSheet = ss.getSheetByName("Batch Review");
  
  if (!batchSheet) {
    ui.alert("Batch Review sheet not found!");
    return;
  }
  
  // Get all the data
  const data = batchSheet.getDataRange().getValues();
  let completedCount = 0;
  
  // Process each checked problem
  for (let i = 1; i < data.length; i++) {
    const isChecked = data[i][0] === true;
    if (isChecked) {
      const problemId = data[i][1];
      const difficulty = data[i][3].toLowerCase();
      
      // Complete the review with the selected difficulty
      // Asking for next review will be handled inside the function
      const result = completeReviewWithDifficulty(problemId, difficulty);
      if (result && result.success) {
        completedCount++;
      }
    }
  }
  
  // Delete the batch sheet
  ss.deleteSheet(batchSheet);
  
  // Show result
  ui.alert(`Completed ${completedCount} problem reviews.`);
  
  // Remove the batch menu
  onOpen();
}

/**
 * Cancels the batch review
 */
function cancelBatchReview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const batchSheet = ss.getSheetByName("Batch Review");
  
  if (batchSheet) {
    ss.deleteSheet(batchSheet);
  }
  
  // Restore regular menu
  onOpen();
}

/**
 * Exports the revision schedule to a separate sheet for backup
 */
function exportRevisionSchedule() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!revisionSheet) {
    ui.alert("Revision Schedule sheet not found!");
    return;
  }
  
  // Create a backup sheet with timestamp
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const exportSheetName = "SRS Backup " + timestamp;
  
  // Check if a sheet with this name already exists
  let exportSheet = ss.getSheetByName(exportSheetName);
  if (exportSheet) {
    ss.deleteSheet(exportSheet);
  }
  exportSheet = ss.insertSheet(exportSheetName);
  
  // Copy data from revision schedule
  const data = revisionSheet.getDataRange().getValues();
  exportSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  // Format the dates
  if (data.length > 1) {
    exportSheet.getRange(2, 3, data.length - 1, 2).setNumberFormat("yyyy-mm-dd");
  }
  
  // Format headers
  exportSheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold");
  
  ui.alert(`Revision schedule exported to sheet "${exportSheetName}"`);
  
  // Create download link (as CSV)
  exportSheet.getRange(data.length + 2, 1).setValue("To download as CSV: File > Download > Comma-separated values (.csv)");
}

/**
 * Adds newly solved problems to the review schedule
 */
function addProblemsToReview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getActiveSheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!revisionSheet) {
    SpreadsheetApp.getUi().alert("Please set up the Spaced Repetition System first!");
    return;
  }
  
  // Get all problems from main sheet
  const problemData = mainSheet.getDataRange().getValues();
  const headers = problemData[0].map(header => String(header).trim().toLowerCase());
  
  // Find the column indices with flexible matching
  const idIndex = findColumnIndex(headers, ["id"]);
  const titleIndex = findColumnIndex(headers, ["title"]);
  
  if (idIndex === -1 || titleIndex === -1) {
    const ui = SpreadsheetApp.getUi();
    ui.alert("Could not find ID or Title columns in the main sheet! " +
             "Please ensure your sheet has columns named 'ID' and 'Title' " +
             "(column names are not case sensitive).");
    
    // Debug info to help identify column names
    const columnInfo = "Found columns: " + problemData[0].join(", ");
    Logger.log(columnInfo);
    return;
  }
  
  // Get existing problem IDs in revision schedule
  const existingProblems = revisionSheet.getRange("A2:A" + revisionSheet.getLastRow()).getValues()
    .flat()
    .filter(id => id !== "");
  
  // Add new problems to revision schedule
  let addedCount = 0;
  
  for (let i = 1; i < problemData.length; i++) {
    const row = problemData[i];
    const id = row[idIndex];
    const title = row[titleIndex];
    
    if (id && !existingProblems.includes(id)) {
      const nextRow = revisionSheet.getLastRow() + 1;
      
      // Add the problem to revision schedule with first review tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      revisionSheet.getRange(nextRow, 1, 1, 7).setValues([[
        id,                     // Problem ID
        title,                  // Title
        new Date(),             // Last Review Date (today)
        tomorrow,               // Next Review Date (tomorrow)
        1,                      // Review Count
        1,                      // Interval (days)
        "Pending"               // Status
      ]]);
      
      addedCount++;
    }
  }
  
  if (addedCount > 0) {
    SpreadsheetApp.getUi().alert(`Added ${addedCount} new problems to the revision schedule!`);
  } else {
    SpreadsheetApp.getUi().alert("No new problems found to add to the revision schedule.");
  }
}

/**
 * Adds problems solved today with custom revision schedule
 */
function addTodaysProblems() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getActiveSheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!revisionSheet) {
    ui.alert("Please set up the Spaced Repetition System first!");
    return;
  }
  
  // Ask for days until first review
  const daysResponse = ui.prompt(
    "Add Today's Problems",
    "Enter number of days until you want to review these problems:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (daysResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const daysUntilReview = parseInt(daysResponse.getResponseText().trim());
  if (isNaN(daysUntilReview) || daysUntilReview < 1) {
    ui.alert("Please enter a valid number of days (must be 1 or greater).");
    return;
  }
  
  // Calculate the future review date
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + daysUntilReview);
  
  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get all problems from main sheet
  const problemData = mainSheet.getDataRange().getValues();
  const headers = problemData[0].map(header => String(header).trim().toLowerCase());
  
  // Find the column indices with flexible matching
  const idIndex = findColumnIndex(headers, ["id"]);
  const titleIndex = findColumnIndex(headers, ["title"]);
  const timestampIndex = findColumnIndex(headers, ["timestamp", "date", "time"]);
  
  if (idIndex === -1 || titleIndex === -1) {
    ui.alert("Could not find ID or Title columns in the main sheet! " + 
             "Please ensure your sheet has columns named 'ID' and 'Title' " +
             "(column names are not case sensitive).");
    
    // Debug info to help identify column names
    const columnInfo = "Found columns: " + problemData[0].join(", ");
    Logger.log(columnInfo);
    return;
  }
  
  // Check if timestamp column exists, warn if it doesn't
  if (timestampIndex === -1) {
    ui.alert("Warning: Could not find Timestamp column in the main sheet. All problems will be added instead of just today's problems.");
  }
  
  // Ensure revision sheet has headers
  let revisionHeaders = [];
  try {
    if (revisionSheet.getLastRow() === 0) {
      // Sheet is empty, add headers
      revisionSheet.getRange(1, 1, 1, 7).setValues([[
        "Problem ID", "Title", "Last Review Date", "Next Review Date", "Review Count", "Interval", "Status"
      ]]);
    }
    // Get existing headers
    revisionHeaders = revisionSheet.getRange(1, 1, 1, 7).getValues()[0];
  } catch (e) {
    Logger.log("Error checking revision sheet headers: " + e.toString());
  }
  
  // Get existing problem IDs in revision schedule
  let existingProblems = [];
  try {
    if (revisionSheet.getLastRow() > 1) {
      existingProblems = revisionSheet.getRange(2, 1, revisionSheet.getLastRow() - 1, 1).getValues()
        .flat()
        .filter(id => id !== "");
    }
  } catch (e) {
    Logger.log("Error getting existing problems: " + e.toString());
    existingProblems = [];
  }
  
  // Add today's problems to revision schedule
  let addedCount = 0;
  const problemsAdded = [];
  
  for (let i = 1; i < problemData.length; i++) {
    const row = problemData[i];
    if (!row || row.length <= Math.max(idIndex, titleIndex)) continue; // Skip invalid rows
    
    const id = row[idIndex];
    const title = row[titleIndex];
    
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
          id,                     // Problem ID
          title,                  // Title
          new Date(),             // Last Review Date (today)
          reviewDate,             // Next Review Date (custom date)
          0,                      // Review Count (0 for new problems)
          daysUntilReview,        // Interval (days until review)
          "Pending"               // Status
        ]]);
        
        addedCount++;
        problemsAdded.push(id + " - " + title);
        existingProblems.push(id); // Add to our tracking array to avoid duplicates
      } catch (e) {
        Logger.log(`Error adding problem ${id}: ${e.toString()}`);
      }
    }
  }
  
  if (addedCount > 0) {
    ui.alert(
      `Added ${addedCount} problems to be reviewed in ${daysUntilReview} day(s):\n\n` +
      problemsAdded.join("\n")
    );
  } else {
    ui.alert(timestampIndex === -1 ? 
      "No problems found to add to the revision schedule." :
      "No problems from today found in the main sheet!");
  }
}

/**
 * Marks a problem review as completed and schedules the next review
 */
function completeReview(problemId) {
  if (!problemId) {
    // If called from menu, prompt for problem ID
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt("Complete Review", "Enter the Problem ID:", ui.ButtonSet.OK_CANCEL);
    
    if (response.getSelectedButton() === ui.Button.CANCEL) {
      return;
    }
    
    problemId = response.getResponseText().trim();
  }
  
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  // Find the problem row
  const data = revisionSheet.getDataRange().getValues();
  let problemRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      problemRow = i + 1; // Convert to 1-indexed row number
      break;
    }
  }
  
  if (problemRow === -1) {
    ui.alert(`Problem ID ${problemId} not found in revision schedule!`);
    return;
  }
  
  // Get current data for the problem
  const rowData = data[problemRow - 1];
  const reviewCount = rowData[4];
  
  // Ask if user wants to schedule next review
  const scheduleNextReview = ui.alert(
    "Schedule Next Review?", 
    `Would you like to schedule another review for problem ${problemId}?`, 
    ui.ButtonSet.YES_NO
  );
  
  // Mark as completed today
  if (scheduleNextReview === ui.Button.NO) {
    // Update the problem row - mark as completed with no next review
    revisionSheet.getRange(problemRow, 3, 1, 5).setValues([[
      new Date(),        // Last Review Date (today)
      null,              // No Next Review Date
      reviewCount + 1,   // Review Count
      0,                 // No Interval
      "Completed"        // Status changed to Completed (not pending)
    ]]);
    
    return {
      success: true,
      message: `Review completed for problem ${problemId}. No further reviews scheduled.`
    };
  }
  
  // User wants to schedule next review - ask for days
  const daysResponse = ui.prompt(
    "Schedule Next Review",
    "Enter number of days until next review:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (daysResponse.getSelectedButton() !== ui.Button.OK) {
    return {
      success: false,
      message: "Review scheduling canceled."
    };
  }
  
  const nextInterval = parseInt(daysResponse.getResponseText().trim());
  if (isNaN(nextInterval) || nextInterval < 1) {
    ui.alert("Please enter a valid number of days (must be 1 or greater).");
    return {
      success: false,
      message: "Invalid interval entered."
    };
  }
  
  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  
  // Update the problem row
  revisionSheet.getRange(problemRow, 3, 1, 5).setValues([[
    new Date(),        // Last Review Date (today)
    nextReviewDate,    // Next Review Date 
    reviewCount + 1,   // Review Count
    nextInterval,      // Interval (days)
    "Pending"          // Status
  ]]);
  
  return {
    success: true,
    message: `Review completed for problem ${problemId}. Next review scheduled in ${nextInterval} days.`
  };
}

/**
 * Reschedules pending reviews
 */
function reschedulePendingReviews() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Reschedule Pending Reviews",
    "Enter number of days to reschedule (positive to push forward, negative to move earlier):",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.CANCEL) {
    return;
  }
  
  const daysToReschedule = parseInt(response.getResponseText().trim());
  if (isNaN(daysToReschedule)) {
    ui.alert("Please enter a valid number of days.");
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  // Find problems due today or earlier that are still pending
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const data = revisionSheet.getDataRange().getValues();
  let rescheduledCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const nextReviewDate = new Date(data[i][3]);
    nextReviewDate.setHours(0, 0, 0, 0);
    
    const status = data[i][6];
    
    // Check if the problem is due today or earlier and still pending
    if (nextReviewDate <= today && status === "Pending") {
      // Calculate new review date
      const newReviewDate = new Date(nextReviewDate);
      newReviewDate.setDate(newReviewDate.getDate() + daysToReschedule);
      
      // Update the review date
      revisionSheet.getRange(i + 1, 4).setValue(newReviewDate);
      rescheduledCount++;
    }
  }
  
  ui.alert(`Rescheduled ${rescheduledCount} pending reviews by ${daysToReschedule} days.`);
}

/**
 * Manually adds a problem to the revision schedule with simplified lookup
 */
function manuallyAddProblem() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getActiveSheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!revisionSheet) {
    ui.alert("Please set up the Spaced Repetition System first!");
    return;
  }
  
  // Prompt for problem ID
  const idResponse = ui.prompt(
    "Add Problem to Review",
    "Enter the Problem ID:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (idResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const problemId = idResponse.getResponseText().trim();
  
  // Look up the problem data in the main sheet
  const problemData = mainSheet.getDataRange().getValues();
  const headers = problemData[0].map(header => String(header).trim().toLowerCase());
  
  // Find the column indices with flexible matching
  const idIndex = findColumnIndex(headers, ["id"]);
  const titleIndex = findColumnIndex(headers, ["title"]);
  
  if (idIndex === -1 || titleIndex === -1) {
    ui.alert("Could not find ID or Title columns in the main sheet! " +
             "Please ensure your sheet has columns named 'ID' and 'Title' " +
             "(column names are not case sensitive).");
    
    // Debug info to help identify column names
    const columnInfo = "Found columns: " + problemData[0].join(", ");
    Logger.log(columnInfo);
    return;
  }
  
  // Find problem title
  let title = "";
  for (let i = 1; i < problemData.length; i++) {
    if (problemData[i][idIndex] == problemId) {
      title = problemData[i][titleIndex];
      break;
    }
  }
  
  // If title not found, ask user to enter it
  if (!title) {
    const titleResponse = ui.prompt(
      "Add Problem to Review",
      "Problem not found in main sheet. Please enter the Problem Title:",
      ui.ButtonSet.OK_CANCEL
    );
    
    if (titleResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    title = titleResponse.getResponseText().trim();
  }
  
  // Prompt for days until review (simpler than entering a date)
  const daysResponse = ui.prompt(
    "Add Problem to Review",
    "Enter number of days until review:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (daysResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const daysUntilReview = parseInt(daysResponse.getResponseText().trim());
  if (isNaN(daysUntilReview) || daysUntilReview < 1) {
    ui.alert("Please enter a valid number of days (must be 1 or greater).");
    return;
  }
  
  // Calculate review date
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + daysUntilReview);
  
  // Check if problem already exists in revision schedule - FIX HERE
  let existingProblems = [];
  try {
    // First check if the sheet has any content beyond headers
    const lastRow = revisionSheet.getLastRow();
    if (lastRow > 1) {
      // Safe to get range only if there are data rows
      existingProblems = revisionSheet.getRange(2, 1, lastRow - 1, 1).getValues()
        .flat()
        .filter(id => id !== "");
    }
  } catch (e) {
    Logger.log("Error checking existing problems: " + e.toString());
    existingProblems = []; // Default to empty array on error
  }
  
  // Check if sheet has proper headers - another potential issue point
  if (revisionSheet.getLastRow() === 0) {
    // Sheet is completely empty, add headers
    revisionSheet.getRange(1, 1, 1, 7).setValues([[
      "Problem ID", "Title", "Last Review Date", "Next Review Date", "Review Count", "Interval", "Status"
    ]]);
    revisionSheet.getRange("A1:G1").setFontWeight("bold");
  }
  
  if (existingProblems.includes(problemId)) {
    const response = ui.alert(
      "Problem Already Exists",
      "This problem ID already exists in the revision schedule. Would you like to update its revision date instead?",
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      // Update the existing problem
      updateExistingProblemWithDays(problemId, daysUntilReview);
      return;
    } else {
      return;
    }
  }
  
  // Add the problem to the revision schedule
  const nextRow = revisionSheet.getLastRow() + 1;
  
  revisionSheet.getRange(nextRow, 1, 1, 7).setValues([[
    problemId,           // Problem ID
    title,               // Title
    new Date(),          // Last Review Date (today)
    reviewDate,          // Next Review Date
    0,                   // Review Count
    daysUntilReview,     // Interval (days)
    "Pending"            // Status
  ]]);
  
  ui.alert(`Problem ${problemId} added to the revision schedule for review in ${daysUntilReview} day(s)`);
}

/**
 * Updates an existing problem's review date using days from now
 */
function updateExistingProblemWithDays(problemId, daysFromNow) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  // If no problemId provided, prompt for it
  if (!problemId) {
    const response = ui.prompt(
      "Update Revision Date",
      "Enter the Problem ID:",
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    problemId = response.getResponseText().trim();
  }
  
  // If no days specified, prompt for them
  if (!daysFromNow) {
    const daysResponse = ui.prompt(
      "Update Revision Date",
      "Enter number of days until review:",
      ui.ButtonSet.OK_CANCEL
    );
    
    if (daysResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    daysFromNow = parseInt(daysResponse.getResponseText().trim());
    
    if (isNaN(daysFromNow) || daysFromNow < 1) {
      ui.alert("Please enter a valid number of days (must be 1 or greater).");
      return;
    }
  }
  
  // Calculate the new review date
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + daysFromNow);
  
  // Find the problem row
  const data = revisionSheet.getDataRange().getValues();
  let problemRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      problemRow = i + 1; // Convert to 1-indexed row number
      break;
    }
  }
  
  if (problemRow === -1) {
    ui.alert(`Problem ID ${problemId} not found in revision schedule!`);
    return;
  }
  
  // Update the next review date and interval
  revisionSheet.getRange(problemRow, 4, 1, 2).setValues([[
    reviewDate,      // Next Review Date
    daysFromNow      // Interval (days)
  ]]);
  
  ui.alert(`Updated problem ${problemId} to be reviewed in ${daysFromNow} day(s)`);
}

/**
 * Manually updates the next revision date for a problem
 * This version offers both date-based and days-based options
 */
function manuallyUpdateRevisionDate(problemId, newDate) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!revisionSheet) {
    ui.alert("Please set up the Spaced Repetition System first!");
    return;
  }
  
  // If no problemId provided, prompt for it
  if (!problemId) {
    const response = ui.prompt(
      "Update Revision Date",
      "Enter the Problem ID:",
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    problemId = response.getResponseText().trim();
  }
  
  // Find the problem row to confirm it exists
  const data = revisionSheet.getDataRange().getValues();
  let problemRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      problemRow = i + 1; // Convert to 1-indexed row number
      break;
    }
  }
  
  if (problemRow === -1) {
    ui.alert(`Problem ID ${problemId} not found in revision schedule!`);
    return;
  }
  
  // Ask user if they want to specify days or exact date
  const methodResponse = ui.alert(
    "Update Revision Date",
    "How would you like to set the review date?",
    ui.ButtonSet.YES_NO_CANCEL
  );
  
  // YES = Days from now, NO = Specific date, CANCEL = abort
  if (methodResponse === ui.Button.CANCEL) {
    return;
  } else if (methodResponse === ui.Button.YES) {
    // Use days-based method
    updateExistingProblemWithDays(problemId);
    return;
  }
  
  // If no date provided, prompt for it
  if (!newDate) {
    const dateResponse = ui.prompt(
      "Update Revision Date",
      "Enter the new revision date (YYYY-MM-DD):",
      ui.ButtonSet.OK_CANCEL
    );
    
    if (dateResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    
    const dateStr = dateResponse.getResponseText().trim();
    
    try {
      // Parse the date string
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        newDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        throw new Error("Invalid date format");
      }
      
      if (isNaN(newDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch (e) {
      ui.alert("Invalid date format. Please use YYYY-MM-DD format.");
      return;
    }
  }
  
  // Update the next review date
  revisionSheet.getRange(problemRow, 4).setValue(newDate); // Column D is Next Review Date
  
  // Calculate days interval for consistency
  const today = new Date();
  const diffTime = Math.abs(newDate - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Update interval column
  revisionSheet.getRange(problemRow, 6).setValue(diffDays); // Column F is Interval
  
  // Format the date for display
  const formattedDate = Utilities.formatDate(newDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
  ui.alert(`Updated revision date for problem ${problemId} to ${formattedDate} (${diffDays} days from now)`);
}

/**
 * Removes a problem from the revision schedule
 */
function removeProblemFromReview() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!revisionSheet) {
    ui.alert("Please set up the Spaced Repetition System first!");
    return;
  }
  
  // Prompt for problem ID
  const response = ui.prompt(
    "Remove Problem from Review",
    "Enter the Problem ID to remove from the revision schedule:",
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const problemId = response.getResponseText().trim();
  
  // Find the problem row
  const data = revisionSheet.getDataRange().getValues();
  let problemRow = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == problemId) {
      problemRow = i + 1; // Convert to 1-indexed row number
      break;
    }
  }
  
  if (problemRow === -1) {
    ui.alert(`Problem ID ${problemId} not found in revision schedule!`);
    return;
  }
  
  // Confirm deletion
  const confirmResponse = ui.alert(
    "Confirm Removal",
    `Are you sure you want to remove problem ${problemId} from the revision schedule?`,
    ui.ButtonSet.YES_NO
  );
  
  if (confirmResponse !== ui.Button.YES) {
    return;
  }
  
  // Delete the row
  revisionSheet.deleteRow(problemRow);
  ui.alert(`Problem ${problemId} has been removed from the revision schedule.`);
}

/**
 * Bulk import problems with custom revision dates from a CSV
 */
function importProblemsFromCSV() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!revisionSheet) {
    ui.alert("Please set up the Spaced Repetition System first!");
    return;
  }
  
  // Create a temporary sheet for CSV import
  let importSheet = ss.getSheetByName("CSV Import");
  if (importSheet) {
    ss.deleteSheet(importSheet);
  }
  importSheet = ss.insertSheet("CSV Import");
  
  // Show instructions
  ui.alert(
    "CSV Import Instructions",
    "1. A temporary sheet 'CSV Import' has been created.\n" +
    "2. Paste your CSV data with columns: Problem ID, Title, Next Review Date(YYYY-MM-DD)\n" +
    "3. After pasting, run 'Process CSV Import' from the LeetCode SRS menu.",
    ui.ButtonSet.OK
  );
  
  // Add menu item for processing the import
  const menu = ui.createMenu('LeetCode SRS')
    .addItem('Process CSV Import', 'processCSVImport');
    
  menu.addToUi();
}

/**
 * Processes the CSV import sheet and adds problems to the revision schedule
 */
function processCSVImport() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName("CSV Import");
  const revisionSheet = ss.getSheetByName("Revision Schedule");
  
  if (!importSheet || !revisionSheet) {
    ui.alert("CSV Import sheet or Revision Schedule sheet not found!");
    return;
  }
  
  // Get the import data
  const importData = importSheet.getDataRange().getValues();
  if (importData.length <= 1) {
    ui.alert("No data found in the CSV Import sheet!");
    return;
  }
  
  // Get existing problem IDs
  const existingProblems = revisionSheet.getRange("A2:A" + revisionSheet.getLastRow()).getValues()
    .flat()
    .filter(id => id !== "");
  
  // Process each row
  let addedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < importData.length; i++) {
    const row = importData[i];
    
    // Skip empty rows
    if (!row[0]) continue;
    
    const problemId = row[0].toString().trim();
    const title = row[1] ? row[1].toString().trim() : "Unknown Title";
    let nextReviewDate;
    
    // Parse the date from column 3
    try {
      if (row[2]) {
        if (row[2] instanceof Date) {
          nextReviewDate = row[2];
        } else {
          // Try to parse as YYYY-MM-DD string
          const dateStr = row[2].toString().trim();
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            nextReviewDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            throw new Error(`Invalid date format for row ${i+1}`);
          }
        }
      } else {
        // Default to tomorrow if no date provided
        nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + 1);
      }
      
      if (isNaN(nextReviewDate.getTime())) {
        throw new Error(`Invalid date for row ${i+1}`);
      }
    } catch (e) {
      Logger.log(`Error processing row ${i+1}: ${e.toString()}`);
      errorCount++;
      continue;
    }
    
    // Check if problem already exists
    if (existingProblems.includes(problemId)) {
      // Update existing problem
      const data = revisionSheet.getDataRange().getValues();
      let problemRow = -1;
      
      for (let j = 1; j < data.length; j++) {
        if (data[j][0] == problemId) {
          problemRow = j + 1; // Convert to 1-indexed row number
          break;
        }
      }
      
      if (problemRow !== -1) {
        revisionSheet.getRange(problemRow, 4).setValue(nextReviewDate); // Column D is Next Review Date
        updatedCount++;
      }
    } else {
      // Add new problem
      const nextRow = revisionSheet.getLastRow() + 1;
      
      revisionSheet.getRange(nextRow, 1, 1, 7).setValues([[
        problemId,           // Problem ID
        title,               // Title
        new Date(),          // Last Review Date (today)
        nextReviewDate,      // Next Review Date (custom date)
        0,                   // Review Count (0 for CSV imported)
        0,                   // Interval (0 for CSV imported)
        "Pending"            // Status
      ]]);
      
      addedCount++;
      existingProblems.push(problemId); // Add to tracking array to catch duplicates in CSV
    }
  }
  
  // Delete the import sheet
  ss.deleteSheet(importSheet);
  
  // Show results
  ui.alert(
    "CSV Import Results",
    `Added ${addedCount} new problems\n` +
    `Updated ${updatedCount} existing problems\n` +
    `Errors: ${errorCount}`,
    ui.ButtonSet.OK
  );
}

/**
 * Helper function to find column index with flexible name matching
 * @param {Array} headers - Array of lowercase header names
 * @param {Array} possibleNames - Array of possible lowercase names to match
 * @return {number} The index of the matching column or -1 if not found
 */
function findColumnIndex(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const headerName = headers[i];
    for (const possibleName of possibleNames) {
      if (headerName === possibleName || 
          headerName.includes(possibleName) || 
          possibleName.includes(headerName)) {
        return i;
      }
    }
  }
  return -1;
}

// Run setup when the spreadsheet is opened
function onOpen() {
  createMenu();
}
