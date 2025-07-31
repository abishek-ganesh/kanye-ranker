// Diagnostic script to check share button visibility
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for everything to load - but only run once on results page
    let hasRunDiagnostic = false;
    
    const checkResultsScreen = () => {
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen && resultsScreen.classList.contains('active') && !hasRunDiagnostic) {
            hasRunDiagnostic = true;
            console.log('=== Share Button Diagnostic ===');
        
        // Check the container
        const container = document.getElementById('share-buttons');
        if (container) {
            const containerStyles = window.getComputedStyle(container);
            console.log('Container found:', {
                display: containerStyles.display,
                visibility: containerStyles.visibility,
                opacity: containerStyles.opacity,
                width: containerStyles.width,
                height: containerStyles.height,
                position: containerStyles.position,
                zIndex: containerStyles.zIndex,
                overflow: containerStyles.overflow,
                childrenCount: container.children.length
            });
            
            // Check parent elements
            let parent = container.parentElement;
            let level = 1;
            while (parent && level <= 3) {
                const parentStyles = window.getComputedStyle(parent);
                console.log(`Parent level ${level}:`, {
                    tag: parent.tagName,
                    class: parent.className,
                    display: parentStyles.display,
                    visibility: parentStyles.visibility,
                    overflow: parentStyles.overflow,
                    height: parentStyles.height
                });
                parent = parent.parentElement;
                level++;
            }
            
            // Check each button
            const buttons = container.querySelectorAll('.share-btn');
            buttons.forEach((btn, index) => {
                const btnStyles = window.getComputedStyle(btn);
                const rect = btn.getBoundingClientRect();
                console.log(`Button ${index + 1} (${btn.getAttribute('data-platform')}):`, {
                    display: btnStyles.display,
                    visibility: btnStyles.visibility,
                    opacity: btnStyles.opacity,
                    position: btnStyles.position,
                    backgroundColor: btnStyles.backgroundColor,
                    color: btnStyles.color,
                    width: btnStyles.width,
                    height: btnStyles.height,
                    boundingRect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        visible: rect.width > 0 && rect.height > 0
                    }
                });
            });
        } else {
            console.error('Share buttons container not found!');
        }
        
            console.log('=== End Diagnostic ===');
        }
    };
    
    // Check every second until results screen is shown
    const interval = setInterval(() => {
        if (hasRunDiagnostic) {
            clearInterval(interval);
        } else {
            checkResultsScreen();
        }
    }, 1000);
});

// Function to force show buttons
window.forceShowShareButtons = function() {
    const container = document.getElementById('share-buttons');
    if (container) {
        // Make container visible
        container.style.cssText = `
            display: grid !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 9999 !important;
            background: yellow !important;
            padding: 20px !important;
            min-height: 150px !important;
        `;
        
        // Make all buttons visible
        const buttons = container.querySelectorAll('.share-btn');
        buttons.forEach(btn => {
            btn.style.cssText = `
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: relative !important;
                z-index: 9999 !important;
                background: red !important;
                color: white !important;
                padding: 20px !important;
                margin: 5px !important;
                border: 2px solid black !important;
            `;
        });
        
        console.log('Forced visibility on container and', buttons.length, 'buttons');
    }
};