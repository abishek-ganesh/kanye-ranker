// Load video links from JSON file
window.videoLoaderPromise = (async function() {
    try {
        const response = await fetch('data/video-links.json');
        const data = await response.json();
        
        // Make video data globally available
        window.videoLinks = data;
        
        return data;
    } catch (error) {
        // Fallback to empty object if loading fails
        window.videoLinks = { videoIds: {} };
        return window.videoLinks;
    }
})();