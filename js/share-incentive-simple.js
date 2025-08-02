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
    let eraPreference = null;
    let kanyeTimeline = null;
    let hiddenAlbumGem = null;
    let albumJustMissed = null;
    
    // Initialize
    function init() {
        checkShareStatus();
        
        // Listen for results screen display
        const observer = new MutationObserver(function(mutations) {
            for (let mutation of mutations) {
                if (mutation.target.id === 'results-screen' && 
                    mutation.target.classList.contains('active')) {
                    setTimeout(injectInsights, 300);
                    setTimeout(injectAlbumInsights, 800); // Increased delay to ensure albums are rendered
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
                setTimeout(injectAlbumInsights, 800); // Increased delay to ensure albums are rendered
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
        
        // Calculate era preference
        if (topSongs.length >= 10) {
            const eraCounts = {
                college: 0,    // 2004-2007: CD, LR, Graduation
                experimental: 0, // 2008-2013: 808s, MBDTF, WTT, Yeezus
                modern: 0,     // 2016-2019: TLOP, ye, KSG, JIK
                new: 0         // 2021-2024: Donda, Donda 2, Vultures
            };
            
            topSongs.slice(0, 10).forEach(song => {
                const album = window.kanyeApp.albums.get(song.albumId);
                if (album) {
                    const year = album.year;
                    if (year >= 2004 && year <= 2007) eraCounts.college++;
                    else if (year >= 2008 && year <= 2013) eraCounts.experimental++;
                    else if (year >= 2016 && year <= 2019) eraCounts.modern++;
                    else if (year >= 2021) eraCounts.new++;
                }
            });
            
            // Find dominant era
            const maxCount = Math.max(...Object.values(eraCounts));
            if (maxCount >= 4) { // At least 40% from one era
                const dominantEra = Object.entries(eraCounts).find(([_, count]) => count === maxCount)[0];
                const percentage = maxCount * 10; // Convert to percentage
                
                const eraNames = {
                    college: 'College Trilogy',
                    experimental: 'Experimental Era',
                    modern: 'Modern Ye',
                    new: 'New Chapter'
                };
                
                const eraDescriptions = {
                    college: 'Soul samples and backpack rap forever',
                    experimental: 'When Kanye broke all the rules',
                    modern: 'Pablo season through gospel',
                    new: 'The Donda and beyond experience'
                };
                
                eraPreference = {
                    era: eraNames[dominantEra],
                    percentage: percentage,
                    description: eraDescriptions[dominantEra]
                };
            }
        }
        
        // Always show insights if we have data
        if (underratedPick || justMissedPick || eraPreference) {
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
        
        // Era preference
        if (eraPreference) {
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Your Era:</span>
                    <span class="insight-value">${eraPreference.percentage}% ${eraPreference.era}</span>
                    <span class="insight-detail">- ${eraPreference.description}</span>
                </div>
            `;
        }
        
        // Most underrated pick from top 10
        if (underratedPick) {
            const songsData = window.kanyeApp.songs;
            const rawSong = songsData.find(s => s.id === underratedPick.id);
            const spotifyRank = rawSong ? rawSong.spotifyRank : null;
            
            // Calculate rarity with creative descriptions
            let rarityText = '';
            if (spotifyRank) {
                if (spotifyRank > 250) {
                    rarityText = '- Only the realest Ye stans know this one 💎';
                } else if (spotifyRank > 200) {
                    rarityText = '- You found the secret sauce in Kanye\'s discography';
                } else if (spotifyRank > 150) {
                    rarityText = '- A track that separates tourists from residents';
                } else if (spotifyRank > 100) {
                    rarityText = '- Criminally underrated by the mainstream';
                } else if (spotifyRank > 75) {
                    rarityText = '- The type of song that makes you a Kanye defender';
                } else if (spotifyRank > 50) {
                    rarityText = '- Deserves way more love than it gets';
                } else if (spotifyRank > 25) {
                    rarityText = '- A sleeper hit waiting to blow up';
                } else {
                    rarityText = '- Low-key everyone\'s guilty pleasure';
                }
            }
            
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Most Underrated Pick:</span>
                    <span class="insight-value">${underratedPick.title}</span>
                    <span class="insight-detail">${rarityText}</span>
                </div>
            `;
        }
        
        // Song that just missed the cut
        if (justMissedPick) {
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Just Missed the Cut:</span>
                    <span class="insight-value">${justMissedPick.title}</span>
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
    
    // Inject album insights
    function injectAlbumInsights() {
        if (!window.kanyeApp) return;
        
        const topAlbums = window.kanyeApp.getTopAlbums();
        const topSongs = window.kanyeApp.getTopSongs(20);
        
        // Get album that just missed the cut
        if (topAlbums.length > 5) {
            albumJustMissed = topAlbums[5].album;
        }
        
        // Calculate Kanye Timeline
        if (topAlbums.length >= 5) {
            const timelineCounts = {
                college: 0,      // 2004-2007
                experimental: 0, // 2008-2013
                modern: 0,       // 2016-2019
                new: 0          // 2021-2024
            };
            
            topAlbums.slice(0, 5).forEach(albumStats => {
                const album = albumStats.album;
                if (album) {
                    const year = album.year;
                    if (year >= 2004 && year <= 2007) timelineCounts.college++;
                    else if (year >= 2008 && year <= 2013) timelineCounts.experimental++;
                    else if (year >= 2016 && year <= 2019) timelineCounts.modern++;
                    else if (year >= 2021) timelineCounts.new++;
                }
            });
            
            // Create timeline description based on dominant preferences
            const total = Object.values(timelineCounts).reduce((a, b) => a + b, 0);
            const percentages = {};
            Object.entries(timelineCounts).forEach(([era, count]) => {
                percentages[era] = Math.round((count / total) * 100);
            });
            
            // Find the dominant era(s)
            const maxPercent = Math.max(...Object.values(percentages));
            
            // Create descriptive timeline
            if (maxPercent >= 60) {
                // One era dominates
                const dominantEra = Object.entries(percentages).find(([_, p]) => p === maxPercent)[0];
                const descriptions = {
                    college: 'Soul samples and backpack rap define your taste',
                    experimental: '808s to Yeezus - you love when Ye pushes boundaries',
                    modern: 'Pablo through Wyoming sessions speak to your soul',
                    new: 'Donda era forward - you understand the vision'
                };
                kanyeTimeline = descriptions[dominantEra];
            } else if (timelineCounts.college >= 2 && timelineCounts.experimental >= 2) {
                kanyeTimeline = 'From Chi-town soul to autotune crooner - classic Ye journey';
            } else if (timelineCounts.modern >= 2 && timelineCounts.new >= 2) {
                kanyeTimeline = 'Post-2016 Ye hits different for you - from Pablo to present';
            } else if (timelineCounts.experimental >= 2 && timelineCounts.modern >= 2) {
                kanyeTimeline = 'MBDTF maximalist to TLOP chaos - peak artistic Kanye';
            } else {
                // Diverse taste
                kanyeTimeline = 'The full 20+ year journey - every era has gems';
            }
        }
        
        // Find hidden album gem
        if (topAlbums.length >= 6 && topSongs.length >= 20) {
            // Look at albums ranked 6-10
            const lowerAlbums = topAlbums.slice(5, 10);
            
            // Count how many top 20 songs each lower album contributed
            const albumContributions = new Map();
            
            topSongs.forEach(song => {
                const albumId = song.albumId;
                const isLowerAlbum = lowerAlbums.some(a => a.album.id === albumId);
                
                if (isLowerAlbum) {
                    const count = albumContributions.get(albumId) || 0;
                    albumContributions.set(albumId, count + 1);
                }
            });
            
            // Find album with most contributions
            let maxContributions = 0;
            let gemAlbumId = null;
            
            albumContributions.forEach((count, albumId) => {
                if (count > maxContributions && count >= 2) {
                    maxContributions = count;
                    gemAlbumId = albumId;
                }
            });
            
            if (gemAlbumId) {
                const album = window.kanyeApp.albums.get(gemAlbumId);
                if (album) {
                    hiddenAlbumGem = {
                        name: album.name,
                        songCount: maxContributions
                    };
                }
            }
        }
        
        // Show album insights
        if (kanyeTimeline || hiddenAlbumGem || albumJustMissed) {
            showAlbumInsights(false);
        }
    }
    
    // Show album insights section
    function showAlbumInsights(animate = true) {
        const topAlbumsDiv = document.getElementById('top-albums');
        if (!topAlbumsDiv) return;
        
        // Check if already exists
        if (document.getElementById('album-insights')) return;
        
        // Create insights section
        const insights = document.createElement('div');
        insights.id = 'album-insights';
        insights.className = 'ranking-insights-compact';
        if (animate) {
            insights.classList.add('reveal-animation');
        }
        
        let insightsHTML = '';
        
        // Kanye Timeline
        if (kanyeTimeline) {
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Your Kanye Timeline:</span>
                    <span class="insight-value">${kanyeTimeline}</span>
                </div>
            `;
        }
        
        // Album that just missed the cut
        if (albumJustMissed) {
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Just Missed the Cut:</span>
                    <span class="insight-value">${albumJustMissed.name}</span>
                </div>
            `;
        }
        
        // Hidden album gem
        if (hiddenAlbumGem) {
            insightsHTML += `
                <div class="insight-compact">
                    <span class="insight-label">Hidden Album Gem:</span>
                    <span class="insight-value">${hiddenAlbumGem.name}</span>
                </div>
            `;
        }
        
        insights.innerHTML = insightsHTML;
        
        // Insert after top albums
        topAlbumsDiv.parentElement.insertBefore(insights, topAlbumsDiv.nextSibling);
    }
    
    // Export for debugging
    window.ShareIncentive = {
        hasShared: () => hasShared,
        trackShare: trackShare,
        showInsights: () => showInsights(true),
        showAlbumInsights: () => {
            injectAlbumInsights();
        },
        reset: () => {
            localStorage.removeItem(SHARE_STORAGE_KEY);
            hasShared = false;
            location.reload();
        }
    };
})();