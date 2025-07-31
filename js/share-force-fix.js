// Force fix for share buttons visibility
(function() {
    console.log('[Share Force Fix] Loading...');
    
    // Function to force show share buttons
    function forceShowButtons() {
        const container = document.getElementById('share-buttons');
        if (!container) {
            console.error('[Share Force Fix] Container not found');
            return;
        }
        
        // Remove any inline styles that might be hiding it
        container.removeAttribute('style');
        
        // Force display with inline styles (highest priority)
        container.style.setProperty('display', 'grid', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        container.style.setProperty('opacity', '1', 'important');
        container.style.setProperty('min-height', '100px', 'important');
        
        console.log('[Share Force Fix] Applied inline styles to container');
        
        // Also check each button
        const buttons = container.querySelectorAll('.share-btn');
        buttons.forEach((btn, index) => {
            btn.style.setProperty('display', 'flex', 'important');
            btn.style.setProperty('visibility', 'visible', 'important');
            btn.style.setProperty('opacity', '1', 'important');
            console.log(`[Share Force Fix] Fixed button ${index + 1}`);
        });
        
        // Log final state
        const finalStyles = window.getComputedStyle(container);
        console.log('[Share Force Fix] Final container styles:', {
            display: finalStyles.display,
            visibility: finalStyles.visibility,
            opacity: finalStyles.opacity,
            height: finalStyles.height
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceShowButtons);
    } else {
        forceShowButtons();
    }
    
    // Also run when results screen is shown
    const observer = new MutationObserver((mutations) => {
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen && resultsScreen.classList.contains('active')) {
            // Small delay to ensure buttons are rendered
            setTimeout(forceShowButtons, 250);
        }
    });
    
    const resultsScreen = document.getElementById('results-screen');
    if (resultsScreen) {
        observer.observe(resultsScreen, { 
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
    
    // Global function for manual testing
    window.forceFixShareButtons = forceShowButtons;
})();