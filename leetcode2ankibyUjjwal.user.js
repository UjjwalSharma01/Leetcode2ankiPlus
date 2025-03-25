// ==UserScript==
// @name            LeetCode2Anki Plus By Ujjwal Sharma
// @namespace       https://github.com/UjjwalSharma01
// @version         1.0.0
// @description     Add solved problems to Anki and Google Sheets for tracking progress. Enhanced from LeetCode2Anki.
// @homepageURL     https://github.com/UjjwalSharma01/leetcode2anki-plus
// @supportURL      https://github.com/UjjwalSharma01/leetcode2anki-plus/issues
// @author          Ujjwal Sharma
// @match           https://leetcode.com/problems/*
// @grant           GM.xmlHttpRequest
// @connect         127.0.0.1
// @connect         script.google.com
// @connect         script.googleusercontent.com
// @connect         *
// @license         GPL-2.0
// ==/UserScript==

/*
 * Based on LeetCode2Anki (https://github.com/krmanik/leetcode2anki)
 * Enhanced with Google Sheets integration and improved error handling along with the proper documentation to understand the code
 */

(function () {
    'use strict';

    // Keep these configs the same as your preferences
    const deckName = 'Revision DSA Concepts';
    const modelName = 'Basic - LeetCode2Anki';
    const language = 'C++';
    const langShortName = 'cpp';
    // Update this URL with your latest deployed web app URL if it changed
    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycby3U5afzgs2FZBWXVJHrUX5BtyxEpAN8rSUA4HD18jnRqdcshF_p697b6hwBbje92G4/exec';

    // Debug mode - set to true to see more detailed logging
    const DEBUG = true;

    // Retry configuration for Google Sheets requests
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // milliseconds

    // Performance tracking variables
    let solveTimer = null;
    let startTime = null;
    let elapsedTime = 0;
    let timerInterval = null;
    let firstAttemptSuccess = null; // null = no attempt, true = success, false = failure

    // Add the minimal scriptData variable required for syntax highlighting in Anki cards
    // This is a simplified version to avoid the "scriptData is not defined" error
    const scriptData = `!function(){function e(e,n){var t=document.createElement("div");t.innerHTML=e;var r=t.firstChild;return n&&n.appendChild(r),r}function n(e){var n=document.createElement("style");return n.textContent=e,document.head.appendChild(n),n}var t={},r={js:"javascript",ts:"typescript",jsx:"javascript",tsx:"typescript",html:"html",xml:"xml",svg:"xml",md:"markdown",cpp:"cpp",c:"cpp",h:"cpp",cs:"csharp",py:"python",rb:"ruby",css:"css",scss:"css",less:"css",java:"java",go:"go",php:"php",rs:"rust",kt:"kotlin",dart:"dart"};function a(e){return r[e]||e||"text"}function l(e,n,t){try{var r="";n=a(n);try{if(window.hljs){if(window.hljs.getLanguage&&window.hljs.getLanguage(n))return window.hljs.highlight(e,{language:n}).value;if(window.hljs.highlight)return window.hljs.highlight(n,e).value}}catch(e){}return e}catch(n){return e}}window.shj={highlight:l}}();`;

    function addButtons() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.right = '10px';
        container.style.zIndex = '1000';
        container.style.display = 'flex';
        container.style.gap = '10px';

        const ankiButton = createButton('Save to Anki (Alt+A)', '#007BFF', handleAnkiClick);
        const sheetButton = createButton('Save to Sheet (Alt+S)', '#28a745', handleSheetClick);

        // Add tooltip with keyboard shortcut info
        ankiButton.title = 'Save to Anki (Alt+A)';
        sheetButton.title = 'Save to Google Sheets (Alt+S)';

        container.appendChild(sheetButton);
        container.appendChild(ankiButton);
        document.body.appendChild(container);

        // Add progress indicator container
        const progressIndicator = document.createElement('div');
        progressIndicator.id = 'leetcode-progress-indicator';
        progressIndicator.style.position = 'fixed';
        progressIndicator.style.bottom = '55px';
        progressIndicator.style.right = '10px';
        progressIndicator.style.padding = '6px 12px';
        progressIndicator.style.borderRadius = '4px';
        progressIndicator.style.fontSize = '12px';
        progressIndicator.style.fontWeight = 'bold';
        progressIndicator.style.zIndex = '1000';
        progressIndicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        document.body.appendChild(progressIndicator);

        // Update progress indicator based on stored data
        updateProgressIndicator();

        // Register keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Alt+A for Anki
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                handleAnkiClick();
            }
            // Alt+S for Sheets
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                handleSheetClick();
            }
            // Alt+T for Timer toggle
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                toggleTimer();
            }
            // Alt+R for Timer reset
            if (e.altKey && e.key === 'r') {
                e.preventDefault();
                resetTimer();
            }
        });

        // Add the timer after a short delay to make sure LeetCode UI is fully loaded
        setTimeout(() => {
            addDraggableTimer();
        }, 1000);

        // Start tracking submission results
        trackSubmissionResults();
    }

    // Function to add a draggable timer
    function addDraggableTimer() {
        // Create timer container
        solveTimer = document.createElement('div');
        solveTimer.id = 'leetcode-solve-timer';
        solveTimer.style.position = 'fixed';
        solveTimer.style.top = '100px';
        solveTimer.style.right = '20px'; // Keep initial position at right side
        solveTimer.style.padding = '8px 12px';
        solveTimer.style.backgroundColor = 'rgba(40, 167, 69, 0.9)';
        solveTimer.style.color = '#fff';
        solveTimer.style.borderRadius = '8px';
        solveTimer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        solveTimer.style.zIndex = '9999';
        solveTimer.style.display = 'flex';
        solveTimer.style.flexDirection = 'column';
        solveTimer.style.gap = '8px';
        solveTimer.style.cursor = 'move';
        solveTimer.style.fontSize = '14px';
        solveTimer.style.fontFamily = 'Arial, sans-serif';
        solveTimer.style.userSelect = 'none';

        // Important: Make sure no styles are preventing horizontal movement
        // Don't set any fixed left value here, we'll load it from localStorage if available

        // Time display
        const timeDisplay = document.createElement('div');
        timeDisplay.id = 'leetcode-timer-display';
        timeDisplay.textContent = '00:00:00';
        timeDisplay.style.fontWeight = 'bold';
        timeDisplay.style.fontSize = '16px';
        timeDisplay.style.textAlign = 'center';

        // Timer controls
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.justifyContent = 'center';
        controls.style.gap = '8px';

        // Start/pause button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'leetcode-timer-toggle';
        toggleButton.textContent = 'Start';
        toggleButton.title = 'Start/Pause Timer (Alt+T)';
        toggleButton.style.padding = '3px 8px';
        toggleButton.style.backgroundColor = '#fff';
        toggleButton.style.color = '#28a745';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '4px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontSize = '12px';
        toggleButton.style.fontWeight = 'bold';

        // Reset button
        const resetButton = document.createElement('button');
        resetButton.id = 'leetcode-timer-reset';
        resetButton.textContent = 'Reset';
        resetButton.title = 'Reset Timer (Alt+R)';
        resetButton.style.padding = '3px 8px';
        resetButton.style.backgroundColor = '#fff';
        resetButton.style.color = '#dc3545';
        resetButton.style.border = 'none';
        resetButton.style.borderRadius = '4px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.fontSize = '12px';
        resetButton.style.fontWeight = 'bold';

        // Hide button
        const hideButton = document.createElement('button');
        hideButton.id = 'leetcode-timer-hide';
        hideButton.textContent = 'Hide';
        hideButton.title = 'Hide/Show Timer';
        hideButton.style.padding = '3px 8px';
        hideButton.style.backgroundColor = '#fff';
        hideButton.style.color = '#6c757d';
        hideButton.style.border = 'none';
        hideButton.style.borderRadius = '4px';
        hideButton.style.cursor = 'pointer';
        hideButton.style.fontSize = '12px';
        hideButton.style.fontWeight = 'bold';

        // Add event listeners
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent dragging when clicking buttons
            toggleTimer();
        });

        resetButton.addEventListener('click', (e) => {
            e.stopPropagation();
            resetTimer();
        });

        hideButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTimerVisibility();
        });

        // Add elements to the timer
        controls.appendChild(toggleButton);
        controls.appendChild(resetButton);
        controls.appendChild(hideButton);

        solveTimer.appendChild(timeDisplay);
        solveTimer.appendChild(controls);

        // Add to the document
        document.body.appendChild(solveTimer);

        // Make it draggable
        makeDraggable(solveTimer);

        // Start the timer automatically
        startTimer();

        // Load timer state and position if it was previously running
        loadTimerState();
        loadTimerPosition();
    }

    // Function to make an element draggable
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.addEventListener('mousedown', dragMouseDown);

        function dragMouseDown(e) {
            e.preventDefault();
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
        }

        function elementDrag(e) {
            e.preventDefault();
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Set the element's new position
            const newTop = element.offsetTop - pos2;
            const newLeft = element.offsetLeft - pos1;

            // Make sure it stays within viewport bounds
            const maxTop = window.innerHeight - element.offsetHeight;
            const maxLeft = window.innerWidth - element.offsetWidth;

            // Fix: Ensure we're applying both top and left positions correctly
            element.style.top = Math.max(0, Math.min(newTop, maxTop)) + "px";
            element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + "px";

            // Save the position in localStorage
            saveTimerPosition();
        }

        function closeDragElement() {
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', elementDrag);
        }
    }

    // Function to save timer position with better logging
    function saveTimerPosition() {
        if (!solveTimer) return;

        const position = {
            top: solveTimer.style.top,
            left: solveTimer.style.left
        };

        try {
            localStorage.setItem('leetcode-timer-position', JSON.stringify(position));
            if (DEBUG) console.log("Saved timer position:", position);
        } catch (e) {
            console.error("Error saving timer position:", e);
        }
    }

    // Function to load timer position with better logging
    function loadTimerPosition() {
        if (!solveTimer) return;

        try {
            const positionStr = localStorage.getItem('leetcode-timer-position');
            if (positionStr) {
                const position = JSON.parse(positionStr);
                if (position) {
                    // Apply both top and left positions
                    if (position.top) solveTimer.style.top = position.top;
                    if (position.left) solveTimer.style.left = position.left;
                    // If right was set, we need to remove it to allow left to work
                    solveTimer.style.right = '';

                    if (DEBUG) console.log("Loaded timer position:", position);
                }
            }
        } catch (e) {
            console.error("Error loading timer position:", e);
        }
    }

    // Function to start the timer
    function startTimer() {
        if (timerInterval) {
            // Timer is already running
            return;
        }

        const toggleButton = document.getElementById('leetcode-timer-toggle');
        if (toggleButton) toggleButton.textContent = 'Pause';

        // If timer was previously paused, use the stored elapsed time
        if (!startTime) {
            startTime = Date.now() - elapsedTime;
        }

        timerInterval = setInterval(() => {
            updateTimer();
        }, 1000);

        // Store timer state
        storeTimerState();
    }

    // Function to pause the timer
    function pauseTimer() {
        if (!timerInterval) {
            // Timer is not running
            return;
        }

        const toggleButton = document.getElementById('leetcode-timer-toggle');
        if (toggleButton) toggleButton.textContent = 'Start';

        clearInterval(timerInterval);
        timerInterval = null;

        // Store the elapsed time
        elapsedTime = Date.now() - startTime;
        startTime = null;

        // Store timer state
        storeTimerState();
    }

    // Function to toggle timer state
    function toggleTimer() {
        if (timerInterval) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    // Function to reset the timer
    function resetTimer() {
        pauseTimer();
        elapsedTime = 0;
        startTime = null;

        const display = document.getElementById('leetcode-timer-display');
        if (display) display.textContent = '00:00:00';

        // Reset stored state
        localStorage.removeItem('leetcode-timer-state');
    }

    // Function to update the timer display
    function updateTimer() {
        if (!startTime) return;

        const elapsed = Date.now() - startTime;
        const display = document.getElementById('leetcode-timer-display');

        if (display) {
            display.textContent = formatTime(elapsed);
        }
    }

    // Function to format time as HH:MM:SS
    function formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000) % 60;
        const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }

    // Function to store timer state
    function storeTimerState() {
        try {
            const state = {
                running: !!timerInterval,
                startTime: startTime,
                elapsedTime: elapsedTime,
                timestamp: Date.now()
            };

            localStorage.setItem('leetcode-timer-state', JSON.stringify(state));
        } catch (e) {
            console.error("Error storing timer state:", e);
        }
    }

    // Function to load timer state
    function loadTimerState() {
        try {
            const stateStr = localStorage.getItem('leetcode-timer-state');
            if (!stateStr) return;

            const state = JSON.parse(stateStr);
            const problemSlug = getProblemSlug();

            // Check if the timer state is from the current page and not too old (24 hours)
            if (state && Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
                if (state.running) {
                    // Adjust for time that passed while the page was closed
                    startTime = Date.now() - (state.elapsedTime || 0);
                    elapsedTime = state.elapsedTime || 0;
                    startTimer();
                } else {
                    elapsedTime = state.elapsedTime || 0;
                    updateTimer();
                }
            }

            // Load position
            loadTimerPosition();

        } catch (e) {
            console.error("Error loading timer state:", e);
        }
    }

    // Function to toggle timer visibility
    function toggleTimerVisibility() {
        const timeDisplay = document.getElementById('leetcode-timer-display');
        const controls = solveTimer.querySelector('div[style*="display: flex"]');
        const hideButton = document.getElementById('leetcode-timer-hide');

        if (timeDisplay.style.display === 'none') {
            // Show timer
            timeDisplay.style.display = 'block';
            controls.style.display = 'flex';
            hideButton.textContent = 'Hide';
            solveTimer.style.opacity = '1';
        } else {
            // Hide timer (minimize)
            timeDisplay.style.display = 'none';
            // Keep just the hide button visible
            hideButton.textContent = 'Show';
            solveTimer.style.opacity = '0.6';
        }
    }

    // Function to track submission results
    function trackSubmissionResults() {
        // Use a MutationObserver to watch for submission results
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];

                        // Check if the node contains submission results
                        if (node.nodeType === 1) { // Element node
                            // Check for acceptance indicators
                            if (node.innerText &&
                                (node.innerText.includes("Accepted") ||
                                 node.innerText.includes("Success") ||
                                 node.innerText.includes("Correct"))) {

                                // If this is the first submission result we see, record it
                                if (firstAttemptSuccess === null) {
                                    firstAttemptSuccess = true;
                                    if (DEBUG) console.log("First attempt: Success");
                                    // Store result in localStorage
                                    storeSubmissionResult(true);
                                }
                            }
                            // Check for rejection indicators
                            else if (node.innerText &&
                                    (node.innerText.includes("Wrong Answer") ||
                                     node.innerText.includes("Time Limit Exceeded") ||
                                     node.innerText.includes("Runtime Error") ||
                                     node.innerText.includes("Output Limit Exceeded"))) {

                                // If this is the first submission result we see, record it
                                if (firstAttemptSuccess === null) {
                                    firstAttemptSuccess = false;
                                    if (DEBUG) console.log("First attempt: Failure");
                                    // Store result in localStorage
                                    storeSubmissionResult(false);
                                }
                            }
                        }
                    }
                }
            });
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Function to store submission result
    function storeSubmissionResult(isSuccess) {
        try {
            const problemSlug = getProblemSlug();
            if (!problemSlug) return;

            // Get existing data
            const resultsData = getSubmissionResultsData();

            // Update with new result if not already set
            if (!resultsData[problemSlug]) {
                resultsData[problemSlug] = {
                    success: isSuccess,
                    timestamp: Date.now()
                };

                // Store updated data
                localStorage.setItem('leetcode-submission-results', JSON.stringify(resultsData));
            }
        } catch (e) {
            console.error("Error storing submission result:", e);
        }
    }

    // Function to get submission results data
    function getSubmissionResultsData() {
        try {
            const data = localStorage.getItem('leetcode-submission-results');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Error getting submission results data:", e);
            return {};
        }
    }

    // Helper function to get problem slug from URL
    function getProblemSlug() {
        const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
        return match ? match[1] : null;
    }

    // Function to update progress indicator based on stored data
    function updateProgressIndicator() {
        const currentUrl = window.location.pathname;
        const problemPath = currentUrl.match(/\/problems\/([^\/]+)/);

        if (!problemPath) return;

        const problemSlug = problemPath[1];
        const progressData = getProgressData();
        const problemProgress = progressData[problemSlug];

        const indicator = document.getElementById('leetcode-progress-indicator');
        if (!indicator) return;

        if (problemProgress) {
            if (problemProgress.anki && problemProgress.sheet) {
                indicator.textContent = '✓ Saved to Anki & Sheets';
                indicator.style.backgroundColor = '#28a745';
                indicator.style.color = '#fff';
            } else if (problemProgress.anki) {
                indicator.textContent = '✓ Saved to Anki';
                indicator.style.backgroundColor = '#007BFF';
                indicator.style.color = '#fff';
            } else if (problemProgress.sheet) {
                indicator.textContent = '✓ Saved to Sheets';
                indicator.style.backgroundColor = '#17a2b8';
                indicator.style.color = '#fff';
            }
        } else {
            indicator.textContent = 'Not saved yet';
            indicator.style.backgroundColor = '#6c757d';
            indicator.style.color = '#fff';
        }
    }

    // Store progress data in localStorage
    function getProgressData() {
        try {
            const data = localStorage.getItem('leetcode2anki-progress');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Error getting progress data:", e);
            return {};
        }
    }

    function updateProgressData(type) {
        try {
            const currentUrl = window.location.pathname;
            const problemPath = currentUrl.match(/\/problems\/([^\/]+)/);

            if (!problemPath) return;

            const problemSlug = problemPath[1];
            const progressData = getProgressData();

            if (!progressData[problemSlug]) {
                progressData[problemSlug] = {};
            }

            progressData[problemSlug][type] = true;
            localStorage.setItem('leetcode2anki-progress', JSON.stringify(progressData));

            // Update the visual indicator
            updateProgressIndicator();
        } catch (e) {
            console.error("Error updating progress data:", e);
        }
    }

    function createButton(text, color, handler) {
        const button = document.createElement('button');
        button.innerText = text;
        button.style.padding = '10px 20px';
        button.style.backgroundColor = color;
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.addEventListener('click', handler);
        return button;
    }

    addButtons();

    async function handleSheetClick() {
        try {
            // First check if the Google Sheet endpoint is accessible
            const isAccessible = await checkGoogleSheetAccess();
            if (!isAccessible) {
                alert("Could not access Google Sheets service. Please check your connection and try again.");
                return;
            }

            const params = await getParams();
            if (!params) {
                alert("Please solve this problem before saving");
                return;
            }

            // Show a dialog to get user remarks instead of immediately saving
            showRemarksDialog(params);
        } catch (error) {
            console.error("Error in handleSheetClick:", error);
            alert('Failed to save to Google Sheets: ' + error.message);
        }
    }

    // Check if Google Sheet endpoint is accessible
    function checkGoogleSheetAccess() {
        return new Promise((resolve) => {
            if (DEBUG) console.log("Checking access to Google Sheet endpoint...");

            GM.xmlHttpRequest({
                method: 'GET', // Use GET for verification to avoid modifying data
                url: googleScriptUrl,
                timeout: 10000, // 10-second timeout
                onload: (response) => {
                    if (DEBUG) console.log("Endpoint check response status:", response.status);
                    // Even if we get an error page, the endpoint is accessible
                    resolve(true);
                },
                ontimeout: () => {
                    if (DEBUG) console.log("Endpoint check timed out");
                    resolve(false);
                },
                onerror: () => {
                    if (DEBUG) console.log("Endpoint check failed");
                    resolve(false);
                }
            });
        });
    }

    // Updated function to handle response with better logging
    function sendToGoogleSheets(data) {
        return new Promise((resolve, reject) => {
            if (DEBUG) {
                console.log("Making request to:", googleScriptUrl);
                console.log("With payload:", JSON.stringify(data));
            }

            GM.xmlHttpRequest({
                method: 'POST',
                url: googleScriptUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                data: JSON.stringify(data),
                timeout: 30000, // 30-second timeout
                onload: (response) => {
                    if (DEBUG) {
                        console.log("Response status:", response.status);
                        console.log("Response headers:", response.responseHeaders);
                        console.log("Response text:", response.responseText);
                    }

                    if (response.status >= 200 && response.status < 300) {
                        try {
                            // First check if response looks like HTML
                            if (response.responseText.trim().toLowerCase().startsWith('<!doctype') ||
                                response.responseText.trim().toLowerCase().startsWith('<html')) {
                                if (DEBUG) console.log("Detected HTML response, assuming success");
                                // If it's HTML but status is 200, consider it a success
                                resolve({
                                    message: "Success (HTML response)",
                                    wasUpdated: false
                                });
                                return;
                            }

                            // Try to parse as JSON
                            const jsonResponse = JSON.parse(response.responseText);
                            if (DEBUG) console.log("Parsed response:", jsonResponse);

                            if (jsonResponse.result === "success" || !jsonResponse.error) {
                                if (DEBUG) console.log(jsonResponse.message || "Success");
                                resolve(jsonResponse); // Return the full response object
                            } else {
                                reject(new Error(jsonResponse.error || 'Google Sheets returned unexpected result'));
                            }
                        } catch (e) {
                            if (DEBUG) console.error("Error parsing response:", e);
                            // If JSON parsing fails but status is 200, assume success
                            if (response.status === 200) {
                                if (DEBUG) console.log("Non-JSON 200 response, assuming success");
                                resolve({});
                            } else {
                                reject(new Error('Failed to parse Google Sheets response'));
                            }
                        }
                    } else {
                        if (DEBUG) console.error("Error response:", response.status, response.responseText);
                        reject(new Error(`Google Sheets save failed with status ${response.status}`));
                    }
                },
                ontimeout: () => {
                    if (DEBUG) console.error("Request timed out");
                    reject(new Error('Request to Google Sheets timed out'));
                },
                onerror: (error) => {
                    if (DEBUG) console.error("Request error:", error);
                    reject(new Error('Request to Google Sheets failed'));
                }
            });
        });
    }

    // Enhanced function that adds retry capability
    async function sendToGoogleSheetsWithRetry(data, retries = 0) {
        try {
            const response = await sendToGoogleSheets(data);
            // Check if the problem was updated rather than newly added
            if (response && response.wasUpdated) {
                // Update local tracking with the knowledge that it's in sheets
                updateProgressData('sheet');
            }
            return response;
        } catch (error) {
            if (retries < MAX_RETRIES) {
                if (DEBUG) console.log(`Retry attempt ${retries + 1} after error:`, error.message);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return sendToGoogleSheetsWithRetry(data, retries + 1);
            }
            throw error;
        }
    }

    async function getParams() {
        try {
            // Try multiple methods to get the question data
            const questionData = await extractQuestionData();
            if (!questionData) {
                throw new Error('Could not extract question data');
            }

            // Remember the exact ID we're using for consistency in both Anki and Google Sheets
            // Always prioritize the frontend ID (displayed in the UI) over internal ID
            let id = questionData.questionFrontendId || questionData.questionId;

            // If we still don't have a numeric ID, try one more time with DOM extraction
            // This ensures we get a numeric ID whenever possible
            if (!id || isNaN(parseInt(id))) {
                const frontendId = extractFrontendIdFromDOM();
                if (frontendId) {
                    id = frontendId;
                    // Also set it in questionData for consistency
                    questionData.questionFrontendId = frontendId;
                }
            }

            if (DEBUG) {
                console.log("Final problem ID used:", id, "Title:", questionData.title);
            }

            // Rest of function remains the same
            const title = questionData.title;
            const titleSlug = questionData.titleSlug;
            const topicTags = questionData.topicTags || [];
            const difficulty = questionData.difficulty;
            const description = questionData.content;

            // Get code snippets with error handling
            const qCodeSnippets = questionData.codeSnippets || [];
            let codeSnippets = "";
            for (const c of qCodeSnippets) {
                if (c.lang === language) {
                    codeSnippets = c.code;
                    break;
                }
            }

            // Get user's code with better error handling for Monaco editor
            let code = "";
            try {
                code = await getUserCode();
            } catch (error) {
                console.warn('Could not get user code:', error);
                // Continue without user code if not available
            }

            // Process tags
            const tags = [];
            let tagsData = {};
            for (const tag of topicTags) {
                if (tag.slug) {
                    tags.push(tag.slug);
                    tagsData[tag.slug] = tag.name;
                }
            }
            tagsData = JSON.stringify(tagsData);

            // Determine if the problem is solved with multiple checks
            let solved = await isProblemSolved(questionData);
            if (!solved) {
                return null;
            }

            const params = {
                "note": {
                    "deckName": deckName,
                    "modelName": modelName,
                    "fields": {
                        'Id': id,
                        'Title': title,
                        'TitleSlug': titleSlug,
                        'TopicTags': tagsData,
                        'Difficulty': difficulty,
                        'Description': description,
                        'Notes': "",
                        'CodeSnippets': codeSnippets,
                        'Code': code
                    },
                    "options": {
                        "allowDuplicate": false,
                        "duplicateScope": "deck",
                        "duplicateScopeOptions": {
                            "deckName": "LeetCode",
                            "checkChildren": false,
                            "checkAllModels": false
                        }
                    },
                    "tags": tags,
                    "audio": [],
                    "video": [],
                    "picture": []
                }
            };

            return params;
        } catch (error) {
            console.error("Error in getParams:", error);
            throw error;
        }
    }

    // New function to extract question data with multiple methods
    async function extractQuestionData() {
        let finalQuestion = null;

        // Method 1: Extract from __NEXT_DATA__ script tag (standard approach)
        try {
            const scriptTag = document.querySelector('script#__NEXT_DATA__');
            if (scriptTag) {
                const jsonData = JSON.parse(scriptTag.textContent);
                if (jsonData.props?.pageProps?.dehydratedState?.queries) {
                    for (const query of jsonData.props.pageProps.dehydratedState.queries) {
                        if (query?.state?.data?.question) {
                            finalQuestion = query.state.data.question;
                            if (DEBUG) console.log("Method 1 extracted data:", finalQuestion.questionId);
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn("Method 1 (script tag) failed:", error);
        }

        // Try other methods if method 1 failed
        if (!finalQuestion) {
            // Method 2: Look for window.__INITIAL_DATA__ variable
            try {
                const scripts = document.querySelectorAll('script:not([src])');
                for (const script of scripts) {
                    if (script.textContent.includes('window.__INITIAL_DATA__')) {
                        const match = script.textContent.match(/window\.__INITIAL_DATA__\s*=\s*(\{.*\})/);
                        if (match && match[1]) {
                            const data = JSON.parse(match[1]);
                            if (data.question) {
                                if (DEBUG) console.log("Method 2 extracted data:", data.question.questionId);
                                return data.question;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn("Method 2 (window.__INITIAL_DATA__) failed:", error);
            }

            // Method 3: Try to extract from the page URL itself
            try {
                // Extract from URL: https://leetcode.com/problems/break-a-palindrome/
                const path = window.location.pathname;
                const match = path.match(/\/problems\/([^\/]+)\/?/);

                if (match && match[1]) {
                    const titleSlug = match[1];

                    // Method 3.1: Check if we can find the problem number directly in graphQL data
                    try {
                        // LeetCode often includes a graphql-variables script with problem data
                        const graphqlScripts = Array.from(document.querySelectorAll('script')).filter(
                            script => script.textContent.includes('graphqlVariables') ||
                                   script.textContent.includes('questionData')
                        );

                        for (const script of graphqlScripts) {
                            const idMatch = script.textContent.match(/"questionFrontendId"\s*:\s*"(\d+)"/);
                            if (idMatch && idMatch[1]) {
                                if (DEBUG) console.log("Method 3.1: Found ID in graphQL data:", idMatch[1]);

                                // Get other necessary data from the page
                                const title = document.title.replace(/ - LeetCode$/, '').replace(/^\d+\.\s+/, '');
                                const content = document.querySelector('.question-content')?.innerHTML || '';

                                return {
                                    questionId: idMatch[1],
                                    title: title,
                                    titleSlug: titleSlug,
                                    content: content,
                                    difficulty: getDifficultyFromDOM(),
                                    topicTags: getTagsFromDOM(),
                                    codeSnippets: []
                                };
                            }
                        }
                    } catch (e) {
                        console.warn("Method 3.1 (graphQL) failed:", e);
                    }

                    // Method 3.2: Try to fetch from LeetCode API
                    try {
                        // Make an AJAX request to get the problem data
                        const response = await fetch(`https://leetcode.com/graphql`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                query: `query questionData($titleSlug: String!) {
                                    question(titleSlug: $titleSlug) {
                                        questionId
                                        questionFrontendId
                                        title
                                        difficulty
                                    }
                                }`,
                                variables: { titleSlug }
                            })
                        });

                        const data = await response.json();
                        if (data?.data?.question?.questionFrontendId) {
                            const id = data.data.question.questionFrontendId;
                            if (DEBUG) console.log("Method 3.2: API request returned ID:", id);

                            // Get other necessary data from the page
                            const title = data.data.question.title || document.title.replace(/ - LeetCode$/, '').replace(/^\d+\.\s+/, '');
                            const content = document.querySelector('.question-content')?.innerHTML || '';

                            return {
                                questionId: id,
                                title: title,
                                titleSlug: titleSlug,
                                content: content,
                                difficulty: data.data.question.difficulty || getDifficultyFromDOM(),
                                topicTags: getTagsFromDOM(),
                                codeSnippets: []
                            };
                        }
                    } catch (e) {
                        console.warn("Method 3.2 (API request) failed:", e);
                    }
                }
            } catch (error) {
                console.warn("Method 3 (URL extraction) failed:", error);
            }

            // Method 4: Extract from meta tags
            try {
                const titleMeta = document.querySelector('meta[property="og:title"]');
                const urlMeta = document.querySelector('meta[property="og:url"]');

                if (titleMeta && urlMeta) {
                    const fullTitle = titleMeta.getAttribute('content').replace(' - LeetCode', '');
                    const url = urlMeta.getAttribute('content');
                    const titleSlug = url.split('/').filter(Boolean).pop();
                    const content = document.querySelector('.question-content')?.innerHTML || '';

                    // Extract numeric ID from the title - look for patterns like "1. Two Sum" or "#1 Two Sum"
                    let questionId = null;

                    // Method 4.1: Check for the problem ID in the breadcrumb navigation
                    const breadcrumbs = document.querySelectorAll('.breadcrumb, .css-q9155n, [role="navigation"]');
                    for (const crumb of breadcrumbs) {
                        const text = crumb.textContent || '';
                        const match = text.match(/Problem\s+(\d+)/i);
                        if (match && match[1]) {
                            questionId = match[1];
                            if (DEBUG) console.log("Method 4.1: Found ID in breadcrumb:", questionId);
                            break;
                        }
                    }

                    // Method 4.2: Look for the problem ID in the browser title
                    if (!questionId) {
                        const docTitle = document.title;
                        const match = docTitle.match(/^(\d+)\.\s/);
                        if (match && match[1]) {
                            questionId = match[1];
                            if (DEBUG) console.log("Method 4.2: Found ID in document title:", questionId);
                        }
                    }

                    // Method 4.3: Extract from title with number prefix (e.g., "1. Two Sum")
                    if (!questionId) {
                        const numberPrefixMatch = fullTitle.match(/^(\d+)\.\s/);
                        if (numberPrefixMatch) {
                            questionId = numberPrefixMatch[1];
                            if (DEBUG) console.log("Method 4.3: Found ID in title prefix:", questionId);
                        }
                    }

                    // Method 4.4: Search in the page content for problem number
                    if (!questionId) {
                        const pageContent = document.body.textContent || '';
                        // Look for patterns like "Problem 1328." or "Question 1328:" or "Problem No. 1328"
                        const contentMatches = [
                            ...pageContent.matchAll(/Problem\s+(?:No\.)?\s*(\d+)[.:\s]/gi),
                            ...pageContent.matchAll(/Question\s+(\d+)[.:\s]/gi)
                        ];

                        if (contentMatches.length > 0) {
                            questionId = contentMatches[0][1];
                            if (DEBUG) console.log("Method 4.4: Found ID in page content:", questionId);
                        }
                    }

                    // Method 4.5: Check page for any elements with the problem ID
                    if (!questionId) {
                        // Look for any element containing problem ID
                        const elementsWithNumbers = document.querySelectorAll('[class*="question"], [class*="problem"]');
                        for (const el of elementsWithNumbers) {
                            const match = el.textContent.match(/(\d+)\./);
                            if (match && match[1]) {
                                questionId = match[1];
                                if (DEBUG) console.log("Method 4.5: Found ID in element:", questionId);
                                break;
                            }
                        }
                    }

                    // If we still don't have an ID, use the title slug as a last resort
                    if (!questionId) {
                        console.warn("Could not extract numeric ID, using titleSlug as fallback");
                        questionId = titleSlug.replace(/-/g, '_');
                    }

                    // Parse the title to extract just the problem name (without the ID prefix)
                    let title = fullTitle;
                    const titleMatch = fullTitle.match(/^\d+\.\s+(.+)$/);
                    if (titleMatch) {
                        title = titleMatch[1];
                    }

                    if (DEBUG) {
                        console.log("Final extracted ID:", questionId, "Title:", title, "Slug:", titleSlug);
                    }

                    // Build a minimal question object
                    return {
                        questionId: questionId,
                        title: title,
                        titleSlug: titleSlug,
                        content: content,
                        difficulty: getDifficultyFromDOM(),
                        topicTags: getTagsFromDOM(),
                        codeSnippets: []
                    };
                }
            } catch (error) {
                console.warn("Method 4 (meta tags) failed:", error);
            }
        }

        // Ensure we have a proper frontend ID (the number shown in LeetCode UI)
        if (finalQuestion) {
            // If we don't have a frontend ID, try to extract it from the DOM
            if (!finalQuestion.questionFrontendId) {
                const frontendId = extractFrontendIdFromDOM();
                if (frontendId) {
                    finalQuestion.questionFrontendId = frontendId;
                    if (DEBUG) console.log("Added missing frontendId from DOM:", frontendId);
                }
            }

            // One last sanity check - if the ID doesn't look like a number, try DOM extraction
            const currentId = finalQuestion.questionFrontendId || finalQuestion.questionId;
            if (!currentId || isNaN(parseInt(currentId))) {
                const domId = extractFrontendIdFromDOM();
                if (domId && !isNaN(parseInt(domId))) {
                    finalQuestion.questionFrontendId = domId;
                    if (DEBUG) console.log("Replaced invalid ID with DOM ID:", domId);
                }
            }
        }

        return finalQuestion;
    }

    // Helper function to get difficulty from DOM
    function getDifficultyFromDOM() {
        // Look for difficulty indicators in the DOM
        const difficultySections = document.querySelectorAll('[data-difficulty]');
        for (const section of difficultySections) {
            const difficulty = section.getAttribute('data-difficulty');
            if (difficulty) {
                return difficulty;
            }
        }

        // Try alternative approach for newer LeetCode designs
        const difficultyText = document.querySelector('.difficulty-label')?.textContent || '';
        if (difficultyText.includes('Easy')) return 'Easy';
        if (difficultyText.includes('Medium')) return 'Medium';
        if (difficultyText.includes('Hard')) return 'Hard';

        return 'Medium'; // Default to Medium if we can't determine
    }

    // Helper function to get tags from DOM
    function getTagsFromDOM() {
        const tags = [];
        const tagElements = document.querySelectorAll('.topic-tag');
        for (const tag of tagElements) {
            const tagName = tag.textContent.trim();
            const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            tags.push({
                name: tagName,
                slug: tagSlug
            });
        }
        return tags;
    }

    // New function to get user code reliably
    async function getUserCode() {
        // Try multiple ways to get the user's code

        // Method 1: Try to get code from Monaco editor
        if (typeof monaco !== 'undefined' && monaco.editor) {
            try {
                const editors = monaco.editor.getEditors();
                if (editors && editors.length > 0) {
                    return editors[0].getValue();
                }
            } catch (e) {
                console.warn('Monaco editor access failed:', e);
            }
        }

        // Method 2: Try to get code from CodeMirror editor
        try {
            const codeMirrorElements = document.querySelectorAll('.CodeMirror');
            if (codeMirrorElements && codeMirrorElements.length > 0) {
                for (const element of codeMirrorElements) {
                    if (element.CodeMirror) {
                        return element.CodeMirror.getValue();
                    }
                }
            }
        } catch (e) {
            console.warn('CodeMirror access failed:', e);
        }

        // Method 3: Try to get from the textarea directly
        try {
            const editorTextarea = document.querySelector('textarea[data-cy="code-editor"]');
            if (editorTextarea) {
                return editorTextarea.value;
            }
        } catch (e) {
            console.warn('Editor textarea access failed:', e);
        }

        // Method 4: Try to get from the React component props
        try {
            const reactProps = extractReactProps();
            if (reactProps && reactProps.code) {
                return reactProps.code;
            }
        } catch (e) {
            console.warn('React props extraction failed:', e);
        }

        // If all methods fail, return empty string
        return "";
    }

    // Helper function to extract React component props
    function extractReactProps() {
        try {
            const editorElements = document.querySelectorAll('[data-cy="code-editor"]');
            for (const element of editorElements) {
                for (const key in element) {
                    if (key.startsWith('__reactProps$')) {
                        const props = element[key];
                        if (props && props.value) {
                            return { code: props.value };
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('React props extraction failed:', e);
        }
        return null;
    }

    // Function to determine if problem is solved
    async function isProblemSolved(question) {
        // Method 1: Check for success SVG
        const svgElement = document.querySelector('svg.text-message-success') ||
                           document.querySelector('[data-icon="check-circle"]');
        if (svgElement) {
            return true;
        }

        // Method 2: Check for "Accepted" text in results
        const element = document.querySelector('[data-e2e-locator="console-result"]') ||
                       document.querySelector('.result__23wN');
        if (element && element.innerText.includes("Accepted")) {
            return true;
        }

        // Method 3: Check question status property
        if (question.status === "ac") {
            return true;
        }

        // Method 4: Look for any success indicators in the DOM
        const successElements = document.querySelectorAll('.success');
        for (const el of successElements) {
            if (el.textContent.includes("Success") || el.textContent.includes("Accepted")) {
                return true;
            }
        }

        return false;
    }

    async function ensureLeetCodeModelExists() {
        try {
            const modelResult = await invoke('modelNames', 6);
            if (!modelResult.includes(modelName)) {
                const params = {
                    modelName: modelName,
                    inOrderFields: ['Id', 'Title', 'TitleSlug', 'TopicTags', 'Difficulty', 'Description', 'Notes', 'CodeSnippets', 'Code'],
                    css: styling,
                    isCloze: false,
                    cardTemplates: [
                        {
                            Name: 'Card 1',
                            Front: frontSide,
                            Back: backSide
                        }
                    ]
                };

                await invoke('createModel', 6, params);
            }
        } catch (error) {
            console.error(error);
            alert('Error:', error);
        }
    }

    async function ensureLeetCodeDeckExists() {
        try {
            const result = await invoke('deckNames', 6);
            if (!result.includes(deckName)) {
                await invoke('createDeck', 6, { deck: deckName });
            }
        } catch (error) {
            alert(`Error: ${error}`);
        }
    }

    async function handleAnkiClick() {
        try {
            await ensureLeetCodeDeckExists();
            await ensureLeetCodeModelExists();

            const params = await getParams();
            if (!params) {
                alert("Please solve this problem before adding to Anki");
                return;
            }
            const result = await invoke('addNote', 6, params);
            if (result) {
                showToast('Note added to Anki');
                // Update progress tracking
                updateProgressData('anki');
            }
        } catch (error) {
            console.error("Error in handleAnkiClick:", error);
            alert(`Error: ${error.message || error}`);
        }
    }

    // Modified to be more compatible with different LeetCode page structures
    function invoke(action, version, params = {}) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'POST',
                url: 'http://127.0.0.1:8765',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ action, version, params }),
                onload: (response) => {
                    try {
                        const jsonResponse = JSON.parse(response.responseText);
                        // Support both property name access patterns
                        const propNames = Object.getOwnPropertyNames ?
                            Object.getOwnPropertyNames(jsonResponse) :
                            Object.keys(jsonResponse);

                        if (propNames.length !== 2) {
                            throw 'Response has an unexpected number of fields';
                        }
                        if (!jsonResponse.hasOwnProperty('error')) {
                            throw 'Response is missing required error field';
                        }
                        if (!jsonResponse.hasOwnProperty('result')) {
                            throw 'Response is missing required result field';
                        }
                        if (jsonResponse.error) {
                            throw jsonResponse.error;
                        }
                        resolve(jsonResponse.result);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: () => reject('Failed to issue request'),
            });
        });
    }

    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.innerText = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = '#43A047';
        toast.style.color = '#ffffff';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
        toast.style.fontSize = '16px';
        toast.style.fontFamily = 'Arial, sans-serif';
        toast.style.zIndex = '9999';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);

        // Only set up auto-dismiss if duration is not "infinite"
        if (duration !== Infinity) {
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }

        return toast;
    }

    const frontSide = `<script>
    function expandTags() {
        document.getElementById('hidden-tags').style.display = 'none';
        const tagData = JSON.parse(JSON.stringify({{ TopicTags }}));
    const tagSlugs = Object.keys(tagData);
    const tags = Object.values(tagData);

    const N = tags.length;
    for (let i = 0; i < N; i++) {
        const tag = document.createElement('a');
        tag.setAttribute('class', 'btn tag-btn');
        tag.setAttribute('href', 'https://leetcode.com/tag/' + tagSlugs[i] + '/');
        tag.innerHTML = tags[i];
        document.getElementById('tags').appendChild(tag);
    }
    }
</script>

<!--Problem Title-->
<section class="RankEditor"
    style="margin: 0px auto; text-align: center; width: 100%; opacity: 1; transform: rotateZ(0deg);" data-width="100%"
    data-opacity="1" data-rotate="0">
    <section
        style="color: rgb(228, 130, 16); padding: 3px 10px; margin-bottom: -1em; vertical-align: bottom; font-size: 1.2em;">
        <p class="brush active" style="color: rgb(228, 130, 16); font-size: 19px; min-width: 1px;">
            <a href="https://leetcode.com/problems/{{TitleSlug}}"
                style="text-decoration:none;color:rgb(228, 130, 16);">
                {{Id}}. {{Title}}
            </a>
        </p>
    </section>
    <section style="width: 100%; display: inline-block; vertical-align: top;">
        <section
            style="border-top: 1px solid rgb(228, 130, 16); border-right-color: rgb(228, 130, 16); border-bottom-color: rgb(228, 130, 16); border-left-color: rgb(228, 130, 16); width: 100%;">
        </section>
        <section
            style="width: 6px; height: 6px; margin-top: -3px; background-color: rgb(228, 130, 16); border-radius: 100%;">
        </section>
        <section
            style="width: 6px; height: 6px; margin-top: -6px; float: right; background-color: rgb(228, 130, 16); border-radius: 100%;">
        </section>
    </section>
</section>

{{#Tags}}
<div id="tags"></div>
<a class="btn tag-btn" href="#" onclick="expandTags()" id="hidden-tags">Tags</a>
{{/Tags}}

{{Description}}

<!--Code Snippets-->
<div id="codeSnippets">
    <section class="RankEditor"
         style="margin: 0px auto; text-align: center; width: 100%; opacity: 1; transform: rotateZ(0deg);"
         data-width="100%" data-opacity="1" data-rotate="0">
    <section
            style="color: rgb(228, 130, 16); padding: 3px 10px; margin-bottom: -1em; vertical-align: bottom; font-size: 1.2em;">
        <p class="brush active" style="color: rgb(228, 130, 16); font-size: 19px; min-width: 1px;">
            Code Snippets
        </p>
    </section>
    <section style="width: 100%; display: inline-block; vertical-align: top;">
        <section
                style="border-top: 1px solid rgb(228, 130, 16); border-right-color: rgb(228, 130, 16); border-bottom-color: rgb(228, 130, 16); border-left-color: rgb(228, 130, 16); width: 100%;"></section>
        <section
                style="width: 6px; height: 6px; margin-top: -3px; background-color: rgb(228, 130, 16); border-radius: 100%;"></section>
        <section
                style="width: 6px; height: 6px; margin-top: -6px; float: right; background-color: rgb(228, 130, 16); border-radius: 100%;"></section>
    </section>
    </section>
    <div class='shj-lang-${langShortName}'>{{CodeSnippets}}</div>
</div>

<script>
// https://github.com/speed-highlight/core
${scriptData}
</script>`;

    const backSide = `{{FrontSide}}

{{#Notes}}
<!--Notes-->
<section class="RankEditor"
         style="margin: 0px auto; text-align: center; width: 100%; opacity: 1; transform: rotateZ(0deg);"
         data-width="100%" data-opacity="1" data-rotate="0">
    <section
            style="color: rgb(228, 130, 16); padding: 3px 10px; margin-bottom: -1em; vertical-align: bottom; font-size: 1.2em;">
        <p class="brush active" style="color: rgb(228, 130, 16); font-size: 19px; min-width: 1px;">
            Notes
        </p>
    </section>
    <section style="width: 100%; display: inline-block; vertical-align: top;">
        <section
                style="border-top: 1px solid rgb(228, 130, 16); border-right-color: rgb(228, 130, 16); border-bottom-color: rgb(228, 130, 16); border-left-color: rgb(228, 130, 16); width: 100%;"></section>
        <section
                style="width: 6px; height: 6px; margin-top: -3px; background-color: rgb(228, 130, 16); border-radius: 100%;"></section>
        <section
                style="width: 6px; height: 6px; margin-top: -6px; float: right; background-color: rgb(228, 130, 16); border-radius: 100%;"></section>
    </section>
</section>
{{Notes}}
{{/Notes}}

<div style="display: flex">
	<a href="https://leetcode.com/problems/{{TitleSlug}}/description/"><button>Description</button></a>
	<a href="https://leetcode.com/problems/{{TitleSlug}}/editorial/"><button>Editorial</button></a>
	<a href="https://leetcode.com/problems/{{TitleSlug}}/solutions/"><button>Solution</button></a>
	<a href="https://leetcode.com/problems/{{TitleSlug}}/submissions/"><button>Submissions</button></a>
</div>

<!--Code-->
<section class="RankEditor"
         style="margin: 0px auto; text-align: center; width: 100%; opacity: 1; transform: rotateZ(0deg);"
         data-width="100%" data-opacity="1" data-rotate="0">
    <section
            style="color: rgb(228, 130, 16); padding: 3px 10px; margin-bottom: -1em; vertical-align: bottom; font-size: 1.2em;">
        <p class="brush active" style="color: rgb(228, 130, 16); font-size: 19px; min-width: 1px;">
            Code
        </p>
    </section>
    <section style="width: 100%; display: inline-block; vertical-align: top;">
        <section
                style="border-top: 1px solid rgb(228, 130, 16); border-right-color: rgb(228, 130, 16); border-bottom-color: rgb(228, 130, 16); border-left-color: rgb(228, 130, 16); width: 100%;"></section>
        <section
                style="width: 6px; height: 6px; margin-top: -3px; background-color: rgb(228, 130, 16); border-radius: 100%;"></section>
        <section
                style="width: 6px; height: 6px; margin-top: -6px; float: right; background-color: rgb(228, 130, 16); border-radius: 100%;"></section>
    </section>
    </section>
<div class='shj-lang-${langShortName}'>{{Code}}</div>
<script>
	document.getElementById("codeSnippets").style.display = "none";
</script>
`;

    const styling = `.card {
    font-size: 14px;
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", "Noto Sans", sans-serif;
    color: black;
    background-color: white;
    text-align: left;
}

.card.night_mode {
    background-color: rgba(33, 33, 33, 1);
    color: white;
}

.tag-btn {
    padding: 1px 5px;
    color: #5a5a5a;
    font-size: 13px;
    font-weight: 500;
    margin-right: 3px;
    border: 1px solid #ddd;
}

.Easy {
    background-color: #5cb85c;
}

.Medium {
    background-color: #f0ad4e;
}

.Hard {
    background-color: #d9534f;
}

pre {
    padding: 6px 13px;
    font-size: 13px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', 'Source Code Pro', monospace;
    overflow: auto;
    tab-size: 4;
    background-color: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.night_mode pre {
    background-color: #333333;
    color: white;
}

table {
    font-family: verdana, arial, sans-serif;
    font-size: 11px;
    color: #333333;
    border-width: 1px;
    border-color: #666666;
    border-collapse: collapse;
}

table th {
    border-width: 1px;
    padding: 8px;
    border-style: solid;
    border-color: #666666;
    background-color: #dedede;
}

table td {
    border-width: 1px;
    padding: 8px;
    border-style: solid;
    border-color: #666666;
    background-color: #ffffff;
}

/* https://github.com/speed-highlight/core */
[class*=shj-lang-] {
    white-space: pre;
    color: #112;
    text-shadow: none;
    box-sizing: border-box;
    background: #fff;
    border-radius: 10px;
    max-width: min(100%, 100vw);
    margin: 10px 0;
    font: 18px/24px Consolas, Courier New, Monaco, Andale Mono, Ubuntu Mono, monospace;
    box-shadow: 0 0 5px #0001
}

.shj-inline {
    border-radius: 5px;
    margin: 0;
    padding: 2px 5px;
    display: inline-block
}

[class*=shj-lang-]::selection {
    background: #bdf5
}

[class*=shj-lang-] ::selection {
    background: #bdf5
}

[class*=shj-lang-]>div {
    display: flex;
    overflow: auto;
    padding: 20px 20px 20px 10px;
}

[class*=shj-lang-]>div :last-child {
    outline: none;
    flex: 1
}

.shj-numbers {
    counter-reset: line;
    padding-left: 5px
}

.shj-numbers div {
    padding-right: 5px
}

.shj-numbers div:before {
    color: #999;
    content: counter(line);
    opacity: .5;
    text-align: right;
    counter-increment: line;
    margin-right: 5px;
    display: block
}

.shj-syn-cmnt {
    font-style: italic
}

.shj-syn-err,
.shj-syn-kwd {
    color: #e16
}

.shj-syn-num,
.shj-syn-class {
    color: #f60
}

.shj-syn-insert,
.shj-syn-str {
    color: #7d8
}

.shj-syn-bool {
    color: #3bf
}

.shj-syn-type,
.shj-syn-oper {
    color: #5af
}

.shj-syn-section,
.shj-syn-func {
    color: #84f
}

.shj-syn-deleted,
.shj-syn-var {
    color: #f44
}

.shj-oneline {
    padding: 12px 10px
}

.shj-lang-http.shj-oneline .shj-syn-kwd {
    color: #fff;
    background: #25f;
    border-radius: 5px;
    padding: 5px 7px
}

[class*=shj-lang-] {
    color: #c9d1d9;
    background: #161b22
}

[class*=shj-lang-]:before {
    color: #6f9aff
}

.shj-syn-insert {
    color: #98c379
}

.shj-syn-deleted,
.shj-syn-err,
.shj-syn-kwd {
    color: #ff7b72
}

.shj-syn-class {
    color: #ffa657
}

.shj-numbers,
.shj-syn-cmnt {
    color: #8b949e
}

.shj-syn-type,
.shj-syn-oper,
.shj-syn-num,
.shj-syn-section,
.shj-syn-var,
.shj-syn-bool {
    color: #79c0ff
}

.shj-syn-str {
    color: #a5d6ff
}

.shj-syn-func {
    color: #d2a8ff
}`;

    // Helper function to extract frontendId from DOM
    function extractFrontendIdFromDOM() {
        // Method 1: Look for problem number in page title
        const titleMatch = document.title.match(/^(\d+)\./);
        if (titleMatch && titleMatch[1]) {
            if (DEBUG) console.log("Found ID in page title:", titleMatch[1]);
            return titleMatch[1];
        }

        // Method 2: Look in breadcrumbs or navigation elements
        const navElements = document.querySelectorAll('[role="navigation"], .css-q9155n, .breadcrumb, .h-full');
        for (const el of navElements) {
            const text = el.textContent || '';
            const match = text.match(/Problem\s+(\d+)/i);
            if (match && match[1]) {
                if (DEBUG) console.log("Found ID in navigation:", match[1]);
                return match[1];
            }
        }

        // Method 3: Look for the problem ID in the page heading or title
        const headings = document.querySelectorAll('h1, h2, h3, h4, .mr-2, [data-cy="question-title"]');
        for (const heading of headings) {
            const text = heading.textContent || '';
            const match = text.match(/^(\d+)\./);
            if (match && match[1]) {
                if (DEBUG) console.log("Found ID in heading:", match[1]);
                return match[1];
            }
        }

        // Method 4: Look for LeetCode problem ID in the "Problem List" link
        const problemLinks = document.querySelectorAll('a[href*="/problemset/"]');
        for (const link of problemLinks) {
            const text = link.textContent || '';
            const match = text.match(/Problem\s+List/i);
            if (match) {
                // If we found the Problem List link, look at nearby elements for the ID
                const parent = link.parentElement;
                if (parent) {
                    const siblings = parent.parentElement?.children || [];
                    for (const sibling of siblings) {
                        const siblingText = sibling.textContent || '';
                        const idMatch = siblingText.match(/(\d+)\./);
                        if (idMatch && idMatch[1]) {
                            if (DEBUG) console.log("Found ID near Problem List link:", idMatch[1]);
                            return idMatch[1];
                        }
                    }
                }
            }
        }

        // Method 5: Check URL path components for known problem slugs
        const path = window.location.pathname;
        const slugMatch = path.match(/\/problems\/([^\/]+)/);
        if (slugMatch) {
            const slug = slugMatch[1];

            // LeetCode sometimes has problem number in URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const problemParam = urlParams.get('problemId') || urlParams.get('id');
            if (problemParam && !isNaN(parseInt(problemParam))) {
                if (DEBUG) console.log("Found ID in URL param:", problemParam);
                return problemParam;
            }

            // Check page content for problem number patterns
            const pageContent = document.body.textContent || '';

            // Method 5.1: Look for multiple patterns in page content
            const patterns = [
                new RegExp(`Problem\\s+(\\d+)`, 'i'),
                new RegExp(`#(\\d+)\\s+${slug.replace(/-/g, '\\s+')}`, 'i'),
                new RegExp(`Question\\s+(\\d+)`, 'i'),
                new RegExp(`\\[(\\d+)\\]`),
                new RegExp(`^(\\d+)\\.\\s+${slug.replace(/-/g, '\\s+')}`, 'i')
            ];

            for (const pattern of patterns) {
                const contentMatch = pageContent.match(pattern);
                if (contentMatch && contentMatch[1]) {
                    if (DEBUG) console.log("Found ID with pattern in content:", contentMatch[1]);
                    return contentMatch[1];
                }
            }
        }

        // Method 6: Look for any number followed by a dot in any element with "title" in its class
        const titleElements = document.querySelectorAll('[class*="title"], [class*="Title"]');
        for (const el of titleElements) {
            const text = el.textContent || '';
            const match = text.match(/^(\d+)\./);
            if (match && match[1]) {
                if (DEBUG) console.log("Found ID in title element:", match[1]);
                return match[1];
            }
        }

        if (DEBUG) console.warn("Could not extract problem ID from DOM");
        return null;
    }

    // New function to show a dialog for entering remarks with improved UI
    function showRemarksDialog(params) {
        // Get the performance metrics
        const solveTimeMs = startTime ? (Date.now() - startTime) : elapsedTime;
        const solveTimeFormatted = formatTime(solveTimeMs);

        // Get submission results
        let firstAttemptResult = null;
        try {
            const resultsData = getSubmissionResultsData();
            const problemSlug = getProblemSlug();
            if (problemSlug && resultsData[problemSlug]) {
                firstAttemptResult = resultsData[problemSlug].success;
            }
        } catch (e) {
            console.error("Error getting first attempt result:", e);
        }

        // Detect if LeetCode is in dark mode
        const isDarkMode = document.documentElement.classList.contains('dark') ||
                           document.body.classList.contains('dark') ||
                           window.matchMedia('(prefers-color-scheme: dark)').matches ||
                           document.querySelector('html[data-color-mode="dark"]');

        // Define theme-based colors
        const theme = {
            background: isDarkMode ? '#1a1a1a' : '#ffffff',
            text: isDarkMode ? '#e6e6e6' : '#333333',
            border: isDarkMode ? '#444444' : '#dddddd',
            headerBg: isDarkMode ? '#2d2d2d' : '#f7f7f7',
            accent: '#28a745', // Green accent color for both themes
            buttonText: '#ffffff',
            buttonBg: {
                primary: '#28a745',
                secondary: isDarkMode ? '#444444' : '#f0f0f0',
                hover: {
                    primary: '#218838',
                    secondary: isDarkMode ? '#555555' : '#e0e0e0'
                }
            },
            shadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
            overlayColor: 'rgba(0, 0, 0, 0.7)'
        };

        // Create the modal overlay with improved styling
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = theme.overlayColor;
        overlay.style.backdropFilter = 'blur(2px)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';

        // Create the modal dialog with improved styling
        const dialog = document.createElement('div');
        dialog.style.backgroundColor = theme.background;
        dialog.style.color = theme.text;
        dialog.style.borderRadius = '10px';
        dialog.style.padding = '0';
        dialog.style.width = '600px';
        dialog.style.maxWidth = '90%';
        dialog.style.maxHeight = '80%';
        dialog.style.overflow = 'hidden';
        dialog.style.boxShadow = `0 4px 20px ${theme.shadowColor}`;
        dialog.style.display = 'flex';
        dialog.style.flexDirection = 'column';
        dialog.style.transform = 'translateY(20px)';
        dialog.style.transition = 'transform 0.3s ease';

        // Create dialog header
        const dialogHeader = document.createElement('div');
        dialogHeader.style.padding = '15px 20px';
        dialogHeader.style.borderBottom = `1px solid ${theme.border}`;
        dialogHeader.style.background = theme.headerBg;
        dialogHeader.style.display = 'flex';
        dialogHeader.style.justifyContent = 'space-between';
        dialogHeader.style.alignItems = 'center';

        // Add difficulty badge to title
        const difficultyClass = params.note.fields.Difficulty || 'Medium';
        const difficultyColors = {
            'Easy': '#5cb85c',
            'Medium': '#f0ad4e',
            'Hard': '#d9534f'
        };

        // Problem title with difficulty badge
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.style.gap = '10px';

        const problemTitle = document.createElement('h3');
        problemTitle.style.margin = '0';
        problemTitle.style.color = theme.text;
        problemTitle.style.fontSize = '18px';
        problemTitle.style.fontWeight = '600';
        problemTitle.textContent = `${params.note.fields.Id}. ${params.note.fields.Title}`;

        const difficultyBadge = document.createElement('span');
        difficultyBadge.textContent = difficultyClass;
        difficultyBadge.style.padding = '3px 8px';
        difficultyBadge.style.borderRadius = '12px';
        difficultyBadge.style.fontSize = '12px';
        difficultyBadge.style.fontWeight = 'bold';
        difficultyBadge.style.color = '#fff';
        difficultyBadge.style.backgroundColor = difficultyColors[difficultyClass] || '#f0ad4e';

        titleContainer.appendChild(problemTitle);
        titleContainer.appendChild(difficultyBadge);

        // Close button in the header
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '24px';
        closeButton.style.color = theme.text;
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0';
        closeButton.style.lineHeight = '24px';
        closeButton.style.opacity = '0.7';
        closeButton.style.transition = 'opacity 0.2s';
        closeButton.title = 'Close';

        closeButton.addEventListener('mouseover', () => {
            closeButton.style.opacity = '1';
        });

        closeButton.addEventListener('mouseout', () => {
            closeButton.style.opacity = '0.7';
        });

        closeButton.addEventListener('click', () => {
            closeDialog();
        });

        dialogHeader.appendChild(titleContainer);
        dialogHeader.appendChild(closeButton);

        // Dialog content area
        const dialogContent = document.createElement('div');
        dialogContent.style.padding = '20px';
        dialogContent.style.overflowY = 'auto';

        // Tags display with improved styling
        const tagsContainer = document.createElement('div');
        tagsContainer.style.marginBottom = '15px';
        if (params.note.tags && params.note.tags.length > 0) {
            const tagsHeading = document.createElement('div');
            tagsHeading.textContent = 'Tags:';
            tagsHeading.style.fontSize = '14px';
            tagsHeading.style.color = isDarkMode ? '#aaaaaa' : '#666666';
            tagsHeading.style.marginBottom = '8px';

            const tagsWrapper = document.createElement('div');
            tagsWrapper.style.display = 'flex';
            tagsWrapper.style.flexWrap = 'wrap';
            tagsWrapper.style.gap = '5px';

            params.note.tags.forEach(tag => {
                const tagPill = document.createElement('span');
                tagPill.textContent = tag;
                tagPill.style.padding = '2px 8px';
                tagPill.style.borderRadius = '12px';
                tagPill.style.fontSize = '12px';
                tagPill.style.backgroundColor = isDarkMode ? '#333333' : '#f0f0f0';
                tagPill.style.color = isDarkMode ? '#e0e0e0' : '#666666';
                tagPill.style.border = `1px solid ${isDarkMode ? '#444444' : '#dddddd'}`;
                tagsWrapper.appendChild(tagPill);
            });

            tagsContainer.appendChild(tagsHeading);
            tagsContainer.appendChild(tagsWrapper);
        }

        // Performance metrics section
        const metricsContainer = document.createElement('div');
        metricsContainer.style.marginBottom = '20px';
        metricsContainer.style.padding = '12px';
        metricsContainer.style.backgroundColor = isDarkMode ? '#2a2a2a' : '#f5f5f5';
        metricsContainer.style.borderRadius = '8px';
        metricsContainer.style.border = `1px solid ${theme.border}`;

        const metricsTitle = document.createElement('h4');
        metricsTitle.textContent = 'Performance Metrics';
        metricsTitle.style.margin = '0 0 10px 0';
        metricsTitle.style.fontSize = '15px';
        metricsTitle.style.fontWeight = '600';

        // Create metrics grid
        const metricsGrid = document.createElement('div');
        metricsGrid.style.display = 'grid';
        metricsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        metricsGrid.style.gap = '15px';

        // Solve time display
        const timeDiv = document.createElement('div');
        const timeLabel = document.createElement('div');
        timeLabel.textContent = 'Solve Time:';
        timeLabel.style.fontSize = '13px';
        timeLabel.style.color = isDarkMode ? '#aaaaaa' : '#666666';

        const timeValue = document.createElement('div');
        timeValue.textContent = solveTimeFormatted;
        timeValue.style.fontSize = '16px';
        timeValue.style.fontWeight = 'bold';

        timeDiv.appendChild(timeLabel);
        timeDiv.appendChild(timeValue);

        // First attempt success indicator
        const attemptDiv = document.createElement('div');
        const attemptLabel = document.createElement('div');
        attemptLabel.textContent = 'First Attempt:';
        attemptLabel.style.fontSize = '13px';
        attemptLabel.style.color = isDarkMode ? '#aaaaaa' : '#666666';

        const attemptValue = document.createElement('div');
        if (firstAttemptResult === true) {
            attemptValue.textContent = 'Success ✓';
            attemptValue.style.color = '#5cb85c';
        } else if (firstAttemptResult === false) {
            attemptValue.textContent = 'Failed ✗';
            attemptValue.style.color = '#d9534f';
        } else {
            attemptValue.textContent = 'Not recorded';
            attemptValue.style.color = isDarkMode ? '#aaaaaa' : '#777777';
        }
        attemptValue.style.fontSize = '16px';
        attemptValue.style.fontWeight = 'bold';

        attemptDiv.appendChild(attemptLabel);
        attemptDiv.appendChild(attemptValue);

        // Confidence rating
        const confidenceDiv = document.createElement('div');
        confidenceDiv.style.gridColumn = '1 / -1'; // Span full width

        const confidenceLabel = document.createElement('div');
        confidenceLabel.textContent = 'Confidence (1-5):';
        confidenceLabel.style.fontSize = '13px';
        confidenceLabel.style.color = isDarkMode ? '#aaaaaa' : '#666666';
        confidenceLabel.style.marginBottom = '5px';

        const confidenceRating = document.createElement('div');
        confidenceRating.style.display = 'flex';
        confidenceRating.style.gap = '8px';

        // Create rating stars/numbers
        const ratingValue = document.createElement('input');
        ratingValue.type = 'hidden';
        ratingValue.id = 'confidence-rating-value';
        ratingValue.value = '3'; // Default to medium confidence

        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.textContent = i;
            star.style.cursor = 'pointer';
            star.style.padding = '3px 10px';
            star.style.borderRadius = '4px';
            star.style.fontSize = '16px';
            star.style.fontWeight = 'bold';
            star.style.border = `1px solid ${theme.border}`;

            // Default style for rating 3
            if (i === 3) {
                star.style.backgroundColor = isDarkMode ? '#444' : '#e9e9e9';
            } else {
                star.style.backgroundColor = 'transparent';
            }

            const starColor = getRatingColor(i);
            star.style.color = starColor;

            star.addEventListener('click', () => {
                // Update all stars
                const allStars = confidenceRating.querySelectorAll('span');
                allStars.forEach((s, index) => {
                    if (index + 1 <= i) {
                        s.style.backgroundColor = isDarkMode ? '#444' : '#e9e9e9';
                    } else {
                        s.style.backgroundColor = 'transparent';
                    }
                });

                // Update hidden value
                ratingValue.value = i;
            });

            star.addEventListener('mouseover', () => {
                star.style.borderColor = theme.accent;
            });

            star.addEventListener('mouseout', () => {
                star.style.borderColor = theme.border;
            });

            confidenceRating.appendChild(star);
        }

        confidenceRating.appendChild(ratingValue);

        confidenceDiv.appendChild(confidenceLabel);
        confidenceDiv.appendChild(confidenceRating);

        // Add metrics to container
        metricsGrid.appendChild(timeDiv);
        metricsGrid.appendChild(attemptDiv);
        metricsGrid.appendChild(confidenceDiv);

        metricsContainer.appendChild(metricsTitle);
        metricsContainer.appendChild(metricsGrid);

        // Create textarea for remarks with improved styling
        const remarksLabel = document.createElement('label');
        remarksLabel.textContent = 'Remarks (add what you want to remember about this problem):';
        remarksLabel.htmlFor = 'leetcode-remarks';
        remarksLabel.style.display = 'block';
        remarksLabel.style.marginBottom = '8px';
        remarksLabel.style.fontWeight = '500';
        remarksLabel.style.fontSize = '15px';

        const remarksTextarea = document.createElement('textarea');
        remarksTextarea.id = 'leetcode-remarks';
        remarksTextarea.style.width = '100%';
        remarksTextarea.style.height = '150px';
        remarksTextarea.style.padding = '12px';
        remarksTextarea.style.borderRadius = '6px';
        remarksTextarea.style.resize = 'vertical';
        remarksTextarea.style.fontFamily = 'Arial, sans-serif';
        remarksTextarea.style.fontSize = '14px';
        remarksTextarea.style.lineHeight = '1.5';
        remarksTextarea.style.color = theme.text;
        remarksTextarea.style.backgroundColor = theme.background;
        remarksTextarea.style.border = `1px solid ${theme.border}`;
        remarksTextarea.placeholder = 'Example: "Use two pointers technique. Remember to check for edge cases with empty arrays."';

        // Textarea focus styling
        remarksTextarea.addEventListener('focus', () => {
            remarksTextarea.style.borderColor = theme.accent;
            remarksTextarea.style.boxShadow = `0 0 0 2px ${theme.accent}33`;
            remarksTextarea.style.outline = 'none';
        });

        remarksTextarea.addEventListener('blur', () => {
            remarksTextarea.style.boxShadow = 'none';
            remarksTextarea.style.borderColor = theme.border;
        });

        // Button container with improved styling
        const buttonContainer = document.createElement('div');
        buttonContainer.style.padding = '15px 20px';
        buttonContainer.style.borderTop = `1px solid ${theme.border}`;
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.backgroundColor = theme.headerBg;

        // Cancel button with improved styling
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '5px';
        cancelButton.style.backgroundColor = theme.buttonBg.secondary;
        cancelButton.style.color = theme.text;
        cancelButton.style.fontSize = '14px';
        cancelButton.style.fontWeight = '500';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.transition = 'background-color 0.2s';

        cancelButton.addEventListener('mouseover', () => {
            cancelButton.style.backgroundColor = theme.buttonBg.hover.secondary;
        });

        cancelButton.addEventListener('mouseout', () => {
            cancelButton.style.backgroundColor = theme.buttonBg.secondary;
        });

        // Save button with improved styling
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save to Google Sheets';
        saveButton.style.padding = '8px 16px';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '5px';
        saveButton.style.backgroundColor = theme.buttonBg.primary;
        saveButton.style.color = theme.buttonText;
        saveButton.style.fontSize = '14px';
        saveButton.style.fontWeight = '500';
        saveButton.style.cursor = 'pointer';
        saveButton.style.transition = 'background-color 0.2s';

        saveButton.addEventListener('mouseover', () => {
            saveButton.style.backgroundColor = theme.buttonBg.hover.primary;
        });

        saveButton.addEventListener('mouseout', () => {
            saveButton.style.backgroundColor = theme.buttonBg.primary;
        });

        // Function to close dialog with animation
        function closeDialog() {
            overlay.style.opacity = '0';
            dialog.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }

        // Add keyboard listener for Escape key and Tab navigation
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleKeyDown);
            }

            // Improved tab navigation inside the dialog
            if (e.key === 'Tab') {
                const focusableElements = dialog.querySelectorAll('button, textarea, [tabindex]:not([tabindex="-1"])');
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }

            // Change shortcut: Use Alt+Enter instead of Ctrl+Enter for the save button
            if (e.key === 'Enter' && e.altKey && document.activeElement === remarksTextarea) {
                e.preventDefault();
                saveButton.click();
            }
        }
        document.addEventListener('keydown', handleKeyDown);

        // Update button titles and shortcut indicators
        cancelButton.title = 'Cancel (Esc)';
        saveButton.title = 'Save (Alt+Enter)';
        saveButton.innerHTML = 'Save to Google Sheets <span style="opacity:0.7;font-size:12px;margin-left:5px">(Alt+Enter)</span>';

        // Add event listeners - keep original implementation logic intact
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        saveButton.addEventListener('click', async () => {
            // Get remarks value and confidence from dialog
            const remarks = remarksTextarea.value.trim();
            const confidence = document.getElementById('confidence-rating-value').value;

            // Calculate total solve time in seconds
            const solveTimeSeconds = Math.round(solveTimeMs / 1000);

            // Create payload with remarks and performance metrics
            const payload = {
                id: params.note.fields.Id || "",
                title: params.note.fields.Title || "",
                difficulty: params.note.fields.Difficulty || "",
                tags: Array.isArray(params.note.tags) ? params.note.tags : [],
                url: `https://leetcode.com/problems/${params.note.fields.TitleSlug || ""}`,
                status: 'Pending',
                remarks: remarks,               // User's notes from the dialog
                solveTime: solveTimeFormatted,  // HH:MM:SS format
                solveTimeSeconds: solveTimeSeconds,  // Raw seconds for sorting
                firstAttemptSuccess: firstAttemptResult,  // Whether first submission succeeded
                confidence: confidence          // User's confidence rating (1-5)
            };

            if (DEBUG) console.log("Sending to Google Sheets with metrics:", payload);

            // Show loading toast and close dialog - keep original implementation
            document.body.removeChild(overlay);
            const loadingToast = showToast('Saving to Google Sheets...', 60000);

            try {
                const response = await sendToGoogleSheetsWithRetry(payload);
                // Remove loading toast
                if (loadingToast && loadingToast.parentNode) {
                    loadingToast.parentNode.removeChild(loadingToast);
                }

                // Show appropriate message depending on whether it was an update or new entry
                if (response && response.wasUpdated) {
                    showToast('Updated existing problem in Google Sheets!');
                } else {
                    showToast('Saved to Google Sheets!');
                }

                // Update progress tracking
                updateProgressData('sheet');
            } catch (error) {
                // Remove loading toast
                if (loadingToast && loadingToast.parentNode) {
                    loadingToast.parentNode.removeChild(loadingToast);
                }
                alert('Failed to save to Google Sheets: ' + error.message);
            }
        });

        // Add elements to dialog
        dialogContent.appendChild(tagsContainer);
        dialogContent.appendChild(metricsContainer);
        dialogContent.appendChild(remarksLabel);
        dialogContent.appendChild(remarksTextarea);

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(saveButton);

        dialog.appendChild(dialogHeader);
        dialog.appendChild(dialogContent);
        dialog.appendChild(buttonContainer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Trigger animation after a small delay
        setTimeout(() => {
            overlay.style.opacity = '1';
            dialog.style.transform = 'translateY(0)';
        }, 50);

        // Focus the textarea
        setTimeout(() => remarksTextarea.focus(), 100);
    }

    // Helper function to get color for confidence rating
    function getRatingColor(rating) {
        const colors = {
            1: '#d9534f', // Red - very low confidence
            2: '#f0ad4e', // Orange - low confidence
            3: '#5bc0de', // Blue - medium confidence
            4: '#5cb85c', // Light green - high confidence
            5: '#28a745'  // Green - very high confidence
        };
        return colors[rating] || '#5bc0de';
    }

})();
