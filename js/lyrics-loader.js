// Load lyrics links from JSON file
window.lyricsLoaderPromise = (async function() {
    try {
        const response = await fetch('data/lyrics-links.json');
        const data = await response.json();
        
        // Make lyrics data globally available
        window.lyricsLinks = data;
        
        return data;
    } catch (error) {
        console.error('[Lyrics Loader] ❌ Failed to load lyrics links:', error);
        // Fallback to empty object if loading fails
        window.lyricsLinks = {};
        return {};
    }
})();