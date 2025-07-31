// Initialize the app after all scripts are loaded
window.addEventListener('load', async function() {
    const loadStartTime = performance.now();
    
    console.log('Window load event fired');
    console.log('%cKanye Ranker', 'font-size: 24px; font-weight: bold; color: #D4AF37;');
    console.log('%cCreated by Abishek Ganesh', 'font-size: 14px; color: #666;');
    console.log('%chttps://www.linkedin.com/in/abishek-ganesh', 'font-size: 12px; color: #0066CC;');
    
    // Wait for lyrics and videos to load first
    const loadPromises = [];
    
    if (window.lyricsLoaderPromise) {
        console.log('Waiting for lyrics to load...');
        loadPromises.push(window.lyricsLoaderPromise);
    } else {
        console.warn('⚠️ No lyricsLoaderPromise found - lyrics may not be available');
    }
    
    if (window.videoLoaderPromise) {
        console.log('Waiting for videos to load...');
        loadPromises.push(window.videoLoaderPromise);
    } else {
        console.warn('⚠️ No videoLoaderPromise found - video previews may not be available');
    }
    
    try {
        await Promise.all(loadPromises);
        console.log('✓ All data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading data:', error);
    }
    
    // Wait a bit more to ensure all scripts are parsed
    setTimeout(function() {
        console.log('Checking for required classes...');
        console.log('EloRating available:', typeof EloRating !== 'undefined');
        console.log('UI available:', typeof UI !== 'undefined');
        console.log('KanyeRankerExport available:', typeof KanyeRankerExport !== 'undefined');
        console.log('KanyeRankerApp available:', typeof KanyeRankerApp !== 'undefined');
        console.log('Lyrics available:', !!window.lyricsLinks, 
            window.lyricsLinks ? `(${Object.keys(window.lyricsLinks).length} songs)` : '');
        
        // Only initialize if all classes are available
        if (typeof KanyeRankerApp !== 'undefined' && 
            typeof EloRating !== 'undefined' && 
            typeof UI !== 'undefined' && 
            typeof KanyeRankerExport !== 'undefined') {
            
            try {
                window.kanyeApp = new KanyeRankerApp();
                console.log('App initialized successfully!');
                
                // Track app load performance
                const loadEndTime = performance.now();
                const loadTime = loadEndTime - loadStartTime;
                console.log(`App loaded in ${loadTime.toFixed(2)}ms`);
                
                if (window.analytics) {
                    window.analytics.trackPerformanceMetric('app_load_time', loadTime);
                }
                
                // Add a global click handler for debugging
                document.addEventListener('click', function(e) {
                    console.log('Click detected on:', e.target.tagName, 'with ID:', e.target.id, 'and classes:', e.target.className);
                });
                
            } catch (error) {
                console.error('Error initializing app:', error);
                console.error('Stack:', error.stack);
            }
        } else {
            console.error('Required classes not found. Please refresh the page.');
            // Don't show alert, just log the error
        }
    }, 500);
});