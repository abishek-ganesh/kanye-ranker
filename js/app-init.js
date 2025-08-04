// Initialize the app after all scripts are loaded
window.addEventListener('load', async function() {
    const loadStartTime = performance.now();
    
    // Wait for lyrics and videos to load first
    const loadPromises = [];
    
    if (window.lyricsLoaderPromise) {
        loadPromises.push(window.lyricsLoaderPromise);
    }
    
    if (window.videoLoaderPromise) {
        loadPromises.push(window.videoLoaderPromise);
    }
    
    try {
        await Promise.all(loadPromises);
    } catch (error) {
        console.error('Error loading data:', error);
    }
    
    // Wait a bit more to ensure all scripts are parsed
    setTimeout(function() {
        // Only initialize if all classes are available
        if (typeof KanyeRankerApp !== 'undefined' && 
            typeof EloRating !== 'undefined' && 
            typeof UI !== 'undefined' && 
            typeof KanyeRankerExport !== 'undefined') {
            
            try {
                window.kanyeApp = new KanyeRankerApp();
                
                // Track app load performance
                const loadEndTime = performance.now();
                const loadTime = loadEndTime - loadStartTime;
                
                if (window.analytics) {
                    window.analytics.trackPerformanceMetric('app_load_time', loadTime);
                }
                
            } catch (error) {
                console.error('Error initializing app:', error);
            }
        } else {
            console.error('Required classes not found. Please refresh the page.');
            // Don't show alert, just log the error
        }
    }, 500);
});