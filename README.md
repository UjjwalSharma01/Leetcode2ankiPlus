# LeetCode2Anki Plus by Ujjwal Sharma

> **🧠 NEW: Want to understand how this project works?** Check out [learning.md](./LearningForYou.md) for a complete breakdown of JavaScript concepts used in this project! Perfect for interviews or learning advanced coding patterns. Unlike other open-source projects, we provide explicit explanations of every technique used and potential interview questions with answers.

This userscript enhances your LeetCode experience by allowing you to:
1. Save solved problems to Anki for spaced repetition learning
2. Track your progress by automatically logging problems to Google Sheets
3. Use our built-in Google Sheets spaced repetition system to systematically review problems

## 🚀 Features

### Core Features
- **Anki Integration**: Save solved LeetCode problems directly to your Anki collection
- **Google Sheets Integration**: Track your LeetCode journey by logging problems to Google Sheets
- **Beautiful Cards**: Well-formatted Anki cards with syntax highlighting
- **Robust Error Handling**: Handles connection failures and retries automatically
- **Performance Metrics**: Tracks solve time and first attempt success/failure
- **Spaced Repetition System**: Advanced Google Sheets-based SRS for tracking your DSA review schedule

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
| First Attempt Tracking | None | Tracks success/failure of first attempts |
| Spaced Repetition | None | Complete Google Sheets SRS system |

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
3. Replace the default code with [this file](https://github.com/UjjwalSharma01/Leetcode2ankiPlus/blob/main/GoogleAppsScript.gs)
4. Do the necessary mentioned changes in the file
5. Select the `doRequest` function from the drop-down menu as the function to run

6. Create a Google Sheet
   * Go to [Google Sheets](https://sheets.google.com/)
   * Create a new spreadsheet
   * Name the first 7 columns: `Timestamp`, `ID`, `Title`, `Difficulty`, `Tags`, `URL`, `Status`
   * Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
   * Replace `YOUR_SPREADSHEET_ID` in the Apps Script code with your actual spreadsheet ID

7. Deploy the Apps Script as a web app:
   * Click on `Deploy > New deployment`
   * Select `Web app` as the deployment type
   * Set `Execute as` to `Me`
   * Set `Who has access` to `Anyone, even anonymous`
   * Click `Deploy`
   * Copy the generated web app URL

### 3. Set Up Spaced Repetition System (SRS)

1. In the same Google Apps Script project, create a new script file
2. Name it `SpacedRepetitionSystem.gs`
3. Copy the code from our [SpacedRepetitionSystem.gs](https://github.com/UjjwalSharma01/Leetcode2ankiPlus/blob/main/SpacedRepetitionSystem.gs) file
4. Save the script
5. Open your spreadsheet and refresh the page
6. You'll see a new menu item `LeetCode SRS` in the top menu
7. Click on `LeetCode SRS > Setup System` to initialize the spaced repetition sheets

### 4. Install the Userscript

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

## 📊 Google Sheets Integration

### Standard Problem Tracking
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
| Solve Time | How long it took to solve the problem |
| First Attempt | Whether you solved it correctly on first try |
| Confidence | Self-rated confidence level (1-5) |

### Spaced Repetition System

Our integrated Spaced Repetition System (SRS) offers a complete solution for reviewing LeetCode problems at optimal intervals:

#### Features
- **Dynamic Review Schedule**: Schedule reviews based on your confidence level with each problem
- **Review Count**: Tracks the number of reviews completed for each problem
- **Review Dashboard**: Shows problems due for review today in an easy-to-use interface
- **Performance Metrics**: Tracks review history and performance over time
- **Batch Reviews**: Complete multiple reviews at once with batch functionality
- **Import/Export**: Easily import or export your review schedule for backup or sharing

#### Using the SRS System
1. From your Google Sheet, click the `LeetCode SRS` menu
2. Select `Add Problems to Review` to add solved problems to the SRS system
3. The system will schedule the first review (typically for the next day)
4. When reviews are due, open the sheet and select `LeetCode SRS > Dashboard`
5. Complete your reviews by rating each problem as Easy, Medium, or Hard
6. The system will automatically reschedule problems based on your ratings
7. Continue this process to maintain optimal review intervals

#### SRS Menu Options
- `Add Problems to Review`: Add new problems to the spaced repetition system
- `Add Today's Problems`: Add problems solved today with custom review dates
- `Complete Today's Review`: Mark reviews as complete and schedule next review
- `Batch Complete Reviews`: Process multiple reviews at once
- `Reschedule Pending Reviews`: Adjust review dates for pending problems
- `Import/Export`: Import problems from CSV or export schedule for backup

## ⚠️ Troubleshooting

### Anki Issues

- **No response from Anki**: Ensure Anki is running and AnkiConnect is installed
- **Model errors**: The script will attempt to create the model if it doesn't exist
- **Connection errors**: Check that port 8765 is not blocked by your firewall

### Google Sheets Issues

- **HTML response instead of JSON**: Redeploy your Apps Script and ensure CORS settings are correct
- **Permission errors**: Make sure your script is deployed with "Anyone, even anonymous" access
- **Timeout errors**: The script includes retry logic, but very slow connections may still fail
- **SRS menu missing**: Refresh the page or check if the SpacedRepetitionSystem.gs script was properly added

### LeetCode Issues

- **Code not detecting**: The script tries multiple methods to extract your code; if it fails, your code will not be saved
- **Problem not marked as solved**: Ensure your solution is accepted before trying to save
- **First attempt tracking issues**: If you're experiencing problems with first attempt tracking, please update to the latest version

### Known Issues

- **First Attempt Detection**: The system sometimes fails to correctly identify whether a submission was successful on the first attempt. This is a complex issue due to LeetCode's dynamic UI updates and various submission result formats. We're working on a more robust solution.
  - **Symptoms**: "First Attempt: Not recorded" appears in the submission dialog even after making submissions
  - **Current Workaround**: You can manually note your first attempt result in the remarks field when saving to Google Sheets
  - **Future Improvements**: We're exploring more reliable methods to detect first attempt success/failure

## 🧪 Testing Google Sheets Integration

Use the included direct_submission_node.js script to test your Google Sheets integration:

1. Update the `googleScriptUrl` in the script with your Apps Script web app URL
2. Run `node direct_submission_node.js`
3. Check your Google Sheet for a new test entry

## 🙏 Acknowledgements
- Based on [LeetCode2Anki](https://github.com/krmanik/leetcode2anki) by krmanik
- [AnkiConnect](https://github.com/FooSoft/anki-connect) for enabling Anki integration
- [Speed Highlight](https://github.com/speed-highlight/core) for syntax highlighting
