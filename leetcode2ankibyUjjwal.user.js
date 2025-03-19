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

    function addButtons() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.right = '10px';
        container.style.zIndex = '1000';
        container.style.display = 'flex';
        container.style.gap = '10px';

        const ankiButton = createButton('Save to Anki', '#007BFF', handleAnkiClick);
        const sheetButton = createButton('Save to Sheet', '#28a745', handleSheetClick);

        container.appendChild(sheetButton);
        container.appendChild(ankiButton);
        document.body.appendChild(container);
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

            // Ensure we have all required data fields
            const payload = {
                id: params.note.fields.Id || "",
                title: params.note.fields.Title || "",
                difficulty: params.note.fields.Difficulty || "",
                tags: Array.isArray(params.note.tags) ? params.note.tags : [],
                url: `https://leetcode.com/problems/${params.note.fields.TitleSlug || ""}`,
                status: 'Pending'
            };

            if (DEBUG) console.log("Sending to Google Sheets:", payload);
            
            // Show loading toast
            const loadingToast = showToast('Saving to Google Sheets...', 60000);
            
            try {
                await sendToGoogleSheetsWithRetry(payload);
                // Remove loading toast
                if (loadingToast && loadingToast.parentNode) {
                    loadingToast.parentNode.removeChild(loadingToast);
                }
                showToast('Saved to Google Sheets!');
            } catch (error) {
                // Remove loading toast
                if (loadingToast && loadingToast.parentNode) {
                    loadingToast.parentNode.removeChild(loadingToast);
                }
                throw error;
            }
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

    // Updated function to handle response more robustly
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
                                resolve();
                                return;
                            }
                            
                            // Try to parse as JSON
                            const jsonResponse = JSON.parse(response.responseText);
                            if (DEBUG) console.log("Parsed response:", jsonResponse);
                            
                            if (jsonResponse.result === "success" || !jsonResponse.error) {
                                resolve();
                            } else {
                                reject(new Error(jsonResponse.error || 'Google Sheets returned unexpected result'));
                            }
                        } catch (e) {
                            if (DEBUG) console.error("Error parsing response:", e);
                            // If JSON parsing fails but status is 200, assume success
                            if (response.status === 200) {
                                if (DEBUG) console.log("Non-JSON 200 response, assuming success");
                                resolve();
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
            return await sendToGoogleSheets(data);
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

            const id = questionData.questionId;
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
        // Method 1: Extract from __NEXT_DATA__ script tag (standard approach)
        try {
            const scriptTag = document.querySelector('script#__NEXT_DATA__');
            if (scriptTag) {
                const jsonData = JSON.parse(scriptTag.textContent);
                if (jsonData.props?.pageProps?.dehydratedState?.queries) {
                    for (const query of jsonData.props.pageProps.dehydratedState.queries) {
                        if (query?.state?.data?.question) {
                            return query.state.data.question;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn("Method 1 (script tag) failed:", error);
        }
        
        // Method 2: Look for window.__INITIAL_DATA__ variable
        try {
            const scripts = document.querySelectorAll('script:not([src])');
            for (const script of scripts) {
                if (script.textContent.includes('window.__INITIAL_DATA__')) {
                    const match = script.textContent.match(/window\.__INITIAL_DATA__\s*=\s*(\{.*\})/);
                    if (match && match[1]) {
                        const data = JSON.parse(match[1]);
                        if (data.question) {
                            return data.question;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn("Method 2 (window.__INITIAL_DATA__) failed:", error);
        }

        // Method 3: Extract from meta tags
        try {
            const titleMeta = document.querySelector('meta[property="og:title"]');
            const urlMeta = document.querySelector('meta[property="og:url"]');
            
            if (titleMeta && urlMeta) {
                const title = titleMeta.getAttribute('content').replace(' - LeetCode', '');
                const url = urlMeta.getAttribute('content');
                const titleSlug = url.split('/').filter(Boolean).pop();
                const content = document.querySelector('.question-content')?.innerHTML || '';
                
                // Build a minimal question object
                return {
                    questionId: titleSlug.replace(/-/g, '_'),
                    title: title,
                    titleSlug: titleSlug,
                    content: content,
                    difficulty: getDifficultyFromDOM(),
                    topicTags: getTagsFromDOM(),
                    codeSnippets: []
                };
            }
        } catch (error) {
            console.warn("Method 3 (meta tags) failed:", error);
        }

        return null;
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

})();
