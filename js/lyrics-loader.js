// Load lyrics links from JSON file
window.lyricsLoaderPromise = (async function() {
    try {
        console.log('[Lyrics Loader] Starting to load lyrics links...');
        const response = await fetch('data/lyrics-links.json');
        const data = await response.json();
        
        // Make lyrics data globally available
        window.lyricsLinks = data;
        
        console.log(`[Lyrics Loader] ✓ Successfully loaded ${Object.keys(data).length} lyrics links`);
        
        // Debug: Show some Vultures songs to confirm they're loaded
        const vulturesSongs = Object.keys(data).filter(k => 
            data[k].includes('vultures') || data[k].includes('carnival')
        );
        console.log(`[Lyrics Loader] Found ${vulturesSongs.length} Vultures songs, including:`, 
            vulturesSongs.slice(0, 5));
        
        return data;
    } catch (error) {
        console.error('[Lyrics Loader] ❌ Failed to load lyrics links:', error);
        // Fallback to empty object if loading fails
        window.lyricsLinks = {};
        return {};
    }
})();