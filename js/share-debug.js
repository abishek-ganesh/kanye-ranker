// Debug script to test share functionality
console.log('Share debug script loaded');

// Wait for page to fully load
window.addEventListener('load', () => {
    console.log('Page loaded, checking for ShareManager...');
    
    // Check if app and shareManager exist
    if (window.kanyeApp && window.kanyeApp.shareManager) {
        console.log('ShareManager found on app');
        
        // Try to render buttons manually after a delay
        setTimeout(() => {
            console.log('Attempting to render share buttons...');
            window.kanyeApp.shareManager.renderShareButtons();
        }, 2000);
    } else {
        console.error('ShareManager not found on app');
    }
    
    // Also check if ShareManager class exists
    if (window.ShareManager) {
        console.log('ShareManager class is available globally');
    } else {
        console.error('ShareManager class not found globally');
    }
});

// Add a global function to test share rendering
window.testShareButtons = function() {
    if (window.kanyeApp && window.kanyeApp.shareManager) {
        window.kanyeApp.shareManager.renderShareButtons();
        console.log('Share buttons rendered manually');
        
        // Check if buttons were actually added
        const container = document.getElementById('share-buttons');
        if (container) {
            console.log('Share buttons container found, children:', container.children.length);
            if (container.children.length === 0) {
                console.warn('No buttons in container - trying direct render');
                // Try to render buttons directly
                const platforms = window.kanyeApp.shareManager.platforms;
                Object.entries(platforms).forEach(([key, platform]) => {
                    console.log(`Adding button for ${key}`);
                });
            }
        }
    } else {
        console.error('Cannot render - ShareManager not found');
    }
};

// Add function to test sharing directly
window.testShare = function(platform = 'twitter') {
    if (window.kanyeApp && window.kanyeApp.shareManager) {
        console.log(`Testing share to ${platform}`);
        window.kanyeApp.shareManager.share(platform);
    } else {
        console.error('ShareManager not found');
    }
};