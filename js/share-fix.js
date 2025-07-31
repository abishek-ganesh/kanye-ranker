// Emergency share button fix
document.addEventListener('DOMContentLoaded', () => {
    // Check every second if we're on results page and buttons are missing
    setInterval(() => {
        const resultsScreen = document.getElementById('results-screen');
        const shareContainer = document.getElementById('share-buttons');
        
        if (resultsScreen && resultsScreen.classList.contains('active') && shareContainer) {
            if (shareContainer.children.length === 0 && window.kanyeApp && window.kanyeApp.shareManager) {
                console.log('Results page detected, rendering share buttons...');
                window.kanyeApp.shareManager.renderShareButtons();
            }
        }
    }, 1000);
});