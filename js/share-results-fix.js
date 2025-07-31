// Fix for share buttons on results screen
document.addEventListener('DOMContentLoaded', () => {
    console.log('Share results fix loaded');
    
    // Watch for results screen becoming active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const resultsScreen = document.getElementById('results-screen');
                if (resultsScreen && resultsScreen.classList.contains('active')) {
                    console.log('Results screen is now active!');
                    
                    // Give it a moment for DOM to settle
                    setTimeout(() => {
                        const shareContainer = document.getElementById('share-buttons');
                        if (shareContainer) {
                            console.log('Share container found, children:', shareContainer.children.length);
                            
                            // Force render if empty
                            if (shareContainer.children.length === 0 && window.kanyeApp?.shareManager) {
                                console.log('Container empty, forcing render...');
                                window.kanyeApp.shareManager.renderShareButtons();
                            }
                            
                            // Debug container styles
                            const styles = window.getComputedStyle(shareContainer);
                            console.log('Container styles:', {
                                display: styles.display,
                                visibility: styles.visibility,
                                opacity: styles.opacity,
                                height: styles.height,
                                overflow: styles.overflow
                            });
                        }
                    }, 200);
                }
            }
        });
    });
    
    // Observe the results screen
    const resultsScreen = document.getElementById('results-screen');
    if (resultsScreen) {
        observer.observe(resultsScreen, { attributes: true });
        console.log('Observing results screen for changes');
    }
});

// Global helper to debug share buttons
window.debugShareButtons = function() {
    const container = document.getElementById('share-buttons');
    if (!container) {
        console.error('Share buttons container not found!');
        return;
    }
    
    console.log('=== Share Button Debug ===');
    console.log('Container:', container);
    console.log('Children count:', container.children.length);
    console.log('Container HTML:', container.innerHTML);
    
    const containerStyles = window.getComputedStyle(container);
    console.log('Container computed styles:', {
        display: containerStyles.display,
        visibility: containerStyles.visibility,
        opacity: containerStyles.opacity,
        width: containerStyles.width,
        height: containerStyles.height,
        position: containerStyles.position,
        zIndex: containerStyles.zIndex
    });
    
    // Check each button
    Array.from(container.children).forEach((btn, index) => {
        const btnStyles = window.getComputedStyle(btn);
        console.log(`Button ${index + 1}:`, {
            tag: btn.tagName,
            class: btn.className,
            platform: btn.getAttribute('data-platform'),
            display: btnStyles.display,
            visibility: btnStyles.visibility,
            backgroundColor: btnStyles.backgroundColor
        });
    });
    
    console.log('=== End Debug ===');
};