// Event listener fix for Kanye Ranker
// This file ensures all event listeners work properly

window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready, setting up event listeners...');
    
    // Use event delegation for dynamic content
    document.addEventListener('click', function(e) {
        // Handle song card clicks (but not action buttons)
        const songCardA = e.target.closest('#song-a');
        const songCardB = e.target.closest('#song-b');
        
        if (songCardA && !e.target.closest('.song-actions') && !e.target.closest('.preview-btn')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Song card A clicked');
            if (window.kanyeApp && window.kanyeApp.chooseSong) {
                window.kanyeApp.chooseSong('a');
            }
        }
        
        if (songCardB && !e.target.closest('.song-actions') && !e.target.closest('.preview-btn')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Song card B clicked');
            if (window.kanyeApp && window.kanyeApp.chooseSong) {
                window.kanyeApp.chooseSong('b');
            }
        }
        
        // Handle skip button
        if (e.target.id === 'skip-comparison') {
            e.preventDefault();
            console.log('Skip button clicked via delegation');
            if (window.kanyeApp && window.kanyeApp.skipComparison) {
                window.kanyeApp.skipComparison();
            }
        }
        
        // Handle show results button
        if (e.target.id === 'show-results') {
            e.preventDefault();
            console.log('Show results clicked via delegation');
            if (window.kanyeApp && window.kanyeApp.showResults) {
                window.kanyeApp.showResults();
            }
        }
        
        // Handle restart button
        if (e.target.id === 'restart') {
            e.preventDefault();
            console.log('Restart clicked via delegation');
            if (window.kanyeApp && window.kanyeApp.restart) {
                window.kanyeApp.restart();
            }
        }
    });
    
    // Update card styles to show they're clickable
    function updateCardStyles() {
        const cards = document.querySelectorAll('.song-card');
        cards.forEach(card => {
            card.style.cursor = 'pointer';
            card.title = 'Click to choose this song';
        });
    }
    
    // Apply styles initially and after any screen changes
    updateCardStyles();
    
    // Watch for screen changes
    const observer = new MutationObserver(function(mutations) {
        updateCardStyles();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    console.log('Event delegation setup complete');
});