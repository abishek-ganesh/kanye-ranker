// Simplified Share Incentive System - Shows insights after sharing
(function() {
    'use strict';
    
    // Constants
    const SHARE_STORAGE_KEY = 'kanye-ranker-has-shared';
    const SHARE_VERSION_KEY = 'kanye-ranker-share-version';
    const CURRENT_VERSION = '2.0';
    
    // State
    let hasShared = false;
    let underratedPick = null;
    let justMissedPick = null;
    
    // Initialize
    function init() {
        checkShareStatus();
        
        // Listen for results screen display
        const observer = new MutationObserver(function(mutations) {
            for (let mutation of mutations) {
                if (mutation.target.id === 'results-screen' && 
                    mutation.target.classList.contains('active')) {
                    setTimeout(injectInsights, 300);
                    break;
                }
            }
        });
        
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen) {
            observer.observe(resultsScreen, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
            
            // Check if already active
            if (resultsScreen.classList.contains('active')) {
                setTimeout(injectInsights, 300);
            }
        }
    }
    
    // Check if user has shared before
    function checkShareStatus() {
        const shared = localStorage.getItem(SHARE_STORAGE_KEY);
        const version = localStorage.getItem(SHARE_VERSION_KEY);
        
        // Reset if version changed
        if (version !== CURRENT_VERSION) {
            localStorage.removeItem(SHARE_STORAGE_KEY);
            localStorage.setItem(SHARE_VERSION_KEY, CURRENT_VERSION);
            hasShared = false;
        } else {
            hasShared = shared === 'true';
        }
    }
    
    // Track share action
    function trackShare() {
        if (!hasShared) {
            hasShared = true;
            localStorage.setItem(SHARE_STORAGE_KEY, 'true');
            showSuccessToast();
        }
    }
    
    // Inject insights section after top songs
    function injectInsights() {
        if (!window.kanyeApp) return;
        
        // Get songs data
        const topSongs = window.kanyeApp.getTopSongs(10);
        const allSongs = window.kanyeApp.getTopSongs(15);
        
        // Find most underrated from top 10 (highest spotify rank = worst)
        if (topSongs.length > 0) {
            // Get the raw song data to access spotifyRank
            const songsData = window.kanyeApp.songs;
            let highestRank = -1;
            let mostUnderrated = null;
            
            topSongs.forEach(song => {
                const rawSong = songsData.find(s => s.id === song.id);
                if (rawSong && rawSong.spotifyRank && rawSong.spotifyRank > highestRank) {
                    highestRank = rawSong.spotifyRank;
                    mostUnderrated = song;
                }
            });
            
            underratedPick = mostUnderrated;
        }
        
        // Get song at position 11 (just missed the cut)
        if (allSongs.length > 10) {
            justMissedPick = allSongs[10];
        }
        
        // Always show insights if we have data
        if (underratedPick || justMissedPick) {
            showInsights(false); // No animation initially
        }
    }
    
    // Show insights section
    function showInsights(animate = true) {
        const topSongsDiv = document.getElementById('top-songs');
        if (!topSongsDiv) return;
        
        // Check if already exists
        if (document.getElementById('ranking-insights')) return;
        
        // Create insights section
        const insights = document.createElement('div');
        insights.id = 'ranking-insights';
        insights.className = 'ranking-insights-compact';
        if (animate) {
            insights.classList.add('reveal-animation');
        }
        
        let insightsHTML = '';
        
        // Most underrated pick from top 10
        if (underratedPick) {
            const songsData = window.kanyeApp.songs;
            const rawSong = songsData.find(s => s.id === underratedPick.id);
            const spotifyRank = rawSong ? rawSong.spotifyRank : 'Unknown';
            const topPosition = window.kanyeApp.getTopSongs(10).findIndex(s => s.id === underratedPick.id) + 1;
            
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Most Underrated Pick:</span>
                    <span class="insight-value">${underratedPick.title}</span>
                    <span class="insight-detail">(Your #${topPosition}, Spotify #${spotifyRank})</span>
                </div>
            `;
        }
        
        // Song that just missed the cut
        if (justMissedPick) {
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Just Missed the Cut:</span>
                    <span class="insight-value">${justMissedPick.title}</span>
                    <span class="insight-detail">(Your #11)</span>
                </div>
            `;
        }
        
        insights.innerHTML = insightsHTML;
        
        // Insert after top songs
        topSongsDiv.parentElement.insertBefore(insights, topSongsDiv.nextSibling);
        
        // Smooth scroll to insights if animated and sharing
        if (animate && hasShared) {
            setTimeout(() => {
                insights.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
    
    // Show success toast
    function showSuccessToast() {
        const toast = document.createElement('div');
        toast.className = 'share-success-toast';
        toast.textContent = 'Thanks for sharing! 🎉';
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Hook into existing share functionality
    function hookShareTracking() {
        const originalHandleShare = window.handleShare;
        if (originalHandleShare) {
            window.handleShare = async function(platform, shareType) {
                const result = await originalHandleShare.call(this, platform, shareType);
                
                // Track share if successful
                trackShare();
                
                return result;
            };
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            setTimeout(hookShareTracking, 1000);
        });
    } else {
        init();
        setTimeout(hookShareTracking, 1000);
    }
    
    // Export for debugging
    window.ShareIncentive = {
        hasShared: () => hasShared,
        trackShare: trackShare,
        showInsights: () => showInsights(true),
        reset: () => {
            localStorage.removeItem(SHARE_STORAGE_KEY);
            hasShared = false;
            location.reload();
        }
    };
})();