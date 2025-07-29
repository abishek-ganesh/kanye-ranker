// Load video links from JSON file
window.videoLoaderPromise = (async function() {
    try {
        console.log('[Video Loader] Starting to load video links...');
        const response = await fetch('data/video-links.json');
        const data = await response.json();
        
        // Make video data globally available
        window.videoLinks = data;
        
        console.log(`[Video Loader] ✓ Successfully loaded ${Object.keys(data.videoIds).length} video links`);
        
        // Debug: Show some video links to confirm they're loaded
        const sampleVideos = Object.entries(data.videoIds).slice(0, 5);
        console.log(`[Video Loader] Sample video links:`, sampleVideos);
        
        return data;
    } catch (error) {
        console.error('[Video Loader] ❌ Failed to load video links:', error);
        // Fallback to empty object if loading fails
        window.videoLinks = { videoIds: {}, brokenVideoIds: [] };
        return window.videoLinks;
    }
})();