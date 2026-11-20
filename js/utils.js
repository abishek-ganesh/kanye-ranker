// Utility functions to reduce code duplication across the Kanye Ranker app

/**
 * Apply album-specific colors to a button
 * @param {HTMLElement} button - The button element to style
 * @param {string} albumId - The album ID to get colors from
 * @param {string} buttonType - Type of button ('preview' or 'lyrics')
 */
function applyAlbumButtonColors(button, albumId, buttonType = 'preview') {
    if (!button || !albumId) return;
    
    const colors = getAlbumColors(albumId);
    if (!colors) return;
    
    const bgColor = buttonType === 'lyrics' ? colors.secondary : colors.tertiary;
    button.style.backgroundColor = bgColor || colors.primary;
    button.style.color = colors.text;
    button.style.borderColor = colors.primary;
}

/**
 * Get a value from an object using case-insensitive key matching
 * @param {Object} obj - The object to search in
 * @param {string} key - The key to search for
 * @returns {*} The value if found, undefined otherwise
 */
function getCaseInsensitiveValue(obj, key) {
    if (!obj || !key) return undefined;
    
    // Try exact match first
    if (obj[key] !== undefined) return obj[key];
    
    // Try common variations
    const upperKey = key.toUpperCase();
    if (obj[upperKey] !== undefined) return obj[upperKey];
    
    const lowerKey = key.toLowerCase();
    if (obj[lowerKey] !== undefined) return obj[lowerKey];
    
    // Fall back to searching all keys
    const entry = Object.entries(obj).find(([k]) => 
        k.toLowerCase() === key.toLowerCase()
    );
    
    return entry ? entry[1] : undefined;
}

/**
 * Normalize a video-links entry to {id, label}.
 * Accepts either a plain YouTube ID string or {id, label} object.
 * @param {string|{id: string, label?: string}|undefined} entry
 * @returns {{id: string, label: string}|null}
 */
function resolveVideoEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') return { id: entry, label: '' };
    if (typeof entry === 'object' && entry.id) {
        return { id: entry.id, label: entry.label || '' };
    }
    return null;
}

/**
 * Get censored version of song title if needed
 * @param {string} title - The song title
 * @returns {string} The censored title
 */
function getCensoredTitle(title) {
    return title === "Niggas in Paris" ? "N****s in Paris" : title;
}

/**
 * Track analytics event if analytics is available
 * @param {string} methodName - The analytics method to call
 * @param {...any} args - Arguments to pass to the method
 */
function trackAnalytics(methodName, ...args) {
    if (window.analytics && typeof window.analytics[methodName] === 'function') {
        window.analytics[methodName](...args);
    }
}

/**
 * Safely query for a DOM element with fallback
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element to search within (default: document)
 * @returns {Element|null} The element if found, null otherwise
 */
function safeQuerySelector(selector, parent = document) {
    try {
        return parent.querySelector(selector);
    } catch (error) {
        console.error(`Failed to query selector: ${selector}`, error);
        return null;
    }
}

/**
 * Safely query for multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element to search within (default: document)
 * @returns {NodeList|Array} The elements if found, empty array otherwise
 */
function safeQuerySelectorAll(selector, parent = document) {
    try {
        return parent.querySelectorAll(selector);
    } catch (error) {
        console.error(`Failed to query selector: ${selector}`, error);
        return [];
    }
}

/**
 * Validate that required DOM elements exist
 * @param {Object} elements - Object mapping names to elements
 * @param {boolean} throwOnMissing - Whether to throw error on missing elements
 * @returns {Object} Object with validation results
 */
function validateElements(elements, throwOnMissing = false) {
    const missing = [];
    const valid = {};
    
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            missing.push(name);
        } else {
            valid[name] = element;
        }
    }
    
    if (missing.length > 0) {
        const message = `Missing required elements: ${missing.join(', ')}`;
        console.error(message);
        
        if (throwOnMissing) {
            throw new Error(message);
        }
    }
    
    return {
        isValid: missing.length === 0,
        missing,
        valid
    };
}

/**
 * Centralized error handler with user notification
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @param {boolean} showUser - Whether to show error to user
 */
function handleError(error, context, showUser = true) {
    // Log error with context
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly message if needed
    if (showUser && window.ui && typeof window.ui.showError === 'function') {
        const userMessage = getUserFriendlyErrorMessage(error, context);
        window.ui.showError(userMessage);
    }
}

/**
 * Convert error to user-friendly message
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @returns {string} User-friendly error message
 */
function getUserFriendlyErrorMessage(error, context) {
    const contextMessages = {
        'data-loading': 'Failed to load song data. Please refresh the page.',
        'comparison': 'Failed to process comparison. Please try again.',
        'export': 'Failed to export image. Please try again.',
        'share': 'Failed to share. Please try copying the link instead.',
        'preview': 'Failed to load preview. Please try the YouTube link.',
        'save': 'Failed to save progress. Your rankings may not persist.',
        'restore': 'Failed to restore previous session.'
    };
    
    // Check for specific error types
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
    }
    
    // Return context-specific message or generic
    return contextMessages[context] || 'Something went wrong. Please try again.';
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error messages
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, context) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            handleError(error, context);
            throw error; // Re-throw to allow caller to handle if needed
        }
    };
}

// "spotify:track:<id>" -> open.spotify.com link (opens the app on mobile), or null
function spotifyTrackUrl(spotifyUri) {
    const match = /^spotify:track:([A-Za-z0-9]+)$/.exec(spotifyUri || '');
    return match ? `https://open.spotify.com/track/${match[1]}` : null;
}

// One "Kanye West - Title" line per song, in rank order; real titles so import tools match
function formatTracklist(songs) {
    return songs.map(song => `Kanye West - ${song.title}`).join('\n');
}

// Shares a file through the Web Share sheet on mobile, otherwise downloads it.
// Returns 'native', 'download' or 'cancelled'.
async function shareOrDownloadFile(blob, filename, text = '') {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const file = new File([blob], filename, { type: blob.type });
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], text });
            return 'native';
        } catch (err) {
            if (err.name === 'AbortError') return 'cancelled';
            // NotAllowedError etc.: fall through to a download
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'download';
}

// Export utilities for use in other modules
window.KanyeUtils = {
    // Comparisons needed before "I'm Done" unlocks results (index.html hard-codes the 20 milestone label)
    RESULTS_UNLOCK_AT: 20,
    applyAlbumButtonColors,
    getCaseInsensitiveValue,
    resolveVideoEntry,
    getCensoredTitle,
    spotifyTrackUrl,
    formatTracklist,
    shareOrDownloadFile,
    trackAnalytics,
    safeQuerySelector,
    safeQuerySelectorAll,
    validateElements,
    handleError,
    withErrorHandling
};