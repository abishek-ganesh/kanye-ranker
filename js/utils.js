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

// Export utilities for use in other modules
window.KanyeUtils = {
    applyAlbumButtonColors,
    getCaseInsensitiveValue,
    getCensoredTitle,
    trackAnalytics
};