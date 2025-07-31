// Integrated share functionality that generates images and shares with actual rankings
console.log('[ShareIntegrated] Script file loaded - v2');

(function() {
    console.log('[ShareIntegrated] IIFE executing - v2');
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        console.log('[ShareIntegrated] Initializing...');
        
        // Try to reorganize immediately if results screen is active
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen && resultsScreen.classList.contains('active')) {
            console.log('[ShareIntegrated] Results screen is active on init');
            
            const container = resultsScreen.querySelector('.download-buttons');
            const shareContainer = document.getElementById('share-sections-container');
            
            if (container) {
                console.log('[ShareIntegrated] Found download buttons, reorganizing...');
                setTimeout(reorganizeButtons, 100);
            } else if (shareContainer) {
                console.log('[ShareIntegrated] No download buttons, creating share sections...');
                setTimeout(createShareSections, 100);
            }
        }
        
        // Watch for results screen changes
        const observer = new MutationObserver(function(mutations) {
            for (let mutation of mutations) {
                if (mutation.target.id === 'results-screen' && 
                    mutation.target.classList.contains('active')) {
                    console.log('[ShareIntegrated] Results screen activated');
                    
                    // Check if we haven't already reorganized
                    const container = mutation.target.querySelector('.download-buttons');
                    const shareContainer = document.getElementById('share-sections-container');
                    
                    if (container && !container.classList.contains('action-container')) {
                        console.log('[ShareIntegrated] Found download-buttons, reorganizing...');
                        setTimeout(reorganizeButtons, 200);
                    } else if (!container && shareContainer) {
                        // No download buttons but share container exists
                        console.log('[ShareIntegrated] No download-buttons, creating share sections only...');
                        setTimeout(createShareSections, 200);
                    }
                    break;
                }
            }
        });
        
        if (resultsScreen) {
            observer.observe(resultsScreen, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
        }
    }
    
    function reorganizeButtons() {
        // Try multiple selectors to find the container
        let buttonsContainer = document.querySelector('#results-screen .download-buttons');
        if (!buttonsContainer) {
            buttonsContainer = document.querySelector('.download-buttons');
        }
        
        if (!buttonsContainer) {
            // Schedule another attempt
            setTimeout(() => {
                const container = document.querySelector('#results-screen .download-buttons') || 
                                document.querySelector('.download-buttons');
                if (container && !container.classList.contains('action-container')) {
                    reorganizeButtonsInContainer(container);
                }
            }, 500);
            return;
        }
        
        // Check if already reorganized
        if (buttonsContainer.classList.contains('action-container')) {
            return;
        }
        
        reorganizeButtonsInContainer(buttonsContainer);
    }
    
    function reorganizeButtonsInContainer(buttonsContainer) {
        // Check if we already reorganized
        if (buttonsContainer.querySelector('.action-grid') || buttonsContainer.classList.contains('action-container')) {
            return;
        }
        
        // Get existing buttons
        const exportSongsBtn = document.getElementById('export-songs-image');
        const exportAlbumsBtn = document.getElementById('export-albums-image');
        const continueBtn = document.getElementById('continue-ranking');
        const restartBtn = document.getElementById('restart');
        
        // Clear container
        buttonsContainer.innerHTML = '';
        buttonsContainer.className = 'action-container';
        
        // Create main grid layout
        const actionGrid = document.createElement('div');
        actionGrid.className = 'action-grid';
        
        // Row 1: Save actions and What's Next side by side
        const topRow = document.createElement('div');
        topRow.className = 'action-row top-row';
        
        // Save section
        const saveSection = document.createElement('div');
        saveSection.className = 'action-section save-section';
        saveSection.innerHTML = '<h4 class="section-title">Save Rankings</h4>';
        const saveButtons = document.createElement('div');
        saveButtons.className = 'section-buttons';
        saveButtons.appendChild(exportSongsBtn);
        saveButtons.appendChild(exportAlbumsBtn);
        saveSection.appendChild(saveButtons);
        
        // What's Next section
        const actionsSection = document.createElement('div');
        actionsSection.className = 'action-section actions-section';
        actionsSection.innerHTML = '<h4 class="section-title">What\'s Next?</h4>';
        const actionButtons = document.createElement('div');
        actionButtons.className = 'section-buttons';
        actionButtons.appendChild(continueBtn);
        actionButtons.appendChild(restartBtn);
        actionsSection.appendChild(actionButtons);
        
        topRow.appendChild(saveSection);
        topRow.appendChild(actionsSection);
        
        
        // Add only the top row to grid (save and what's next)
        actionGrid.appendChild(topRow);
        
        // Add grid to container
        buttonsContainer.appendChild(actionGrid);
        
        // Add styles
        addGridStyles();
        
        // Create share sections at the bottom
        createShareSections();
    }
    
    function addGridStyles() {
        if (document.getElementById('share-grid-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'share-grid-styles';
        style.textContent = `
            .action-container {
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
                display: block !important;
            }
            
            .action-grid {
                display: flex;
                flex-direction: column;
                gap: 25px;
            }
            
            /* Share sections container at bottom */
            .share-sections-container,
            #share-sections-container {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                margin-top: 3rem;
                padding: 20px;
                max-width: 1200px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .action-row {
                display: flex !important;
                gap: 20px;
                justify-content: center;
                min-height: 300px !important;
            }
            
            .share-row {
                display: flex !important;
                gap: 20px;
                justify-content: center;
                min-height: 300px !important;
            }
            
            .top-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                max-width: 100%;
                width: 100%;
            }
            
            .share-row {
                display: flex !important;
                flex-direction: row !important;
                gap: 20px;
                max-width: 100%;
                width: 100%;
                justify-content: center;
            }
            
            .action-section {
                background: var(--card-bg, rgba(0, 0, 0, 0.03));
                border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
                border-radius: 16px;
                padding: 25px;
                flex: 1;
                transition: all 0.3s ease;
                min-height: 250px !important;
                display: block !important;
            }
            
            .action-section:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
            }
            
            .section-title {
                font-size: 1rem;
                font-weight: 700;
                color: var(--text-color, #000);
                text-align: center;
                margin: 0 0 20px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.7;
            }
            
            .section-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                justify-content: center;
            }
            
            .share-buttons {
                flex-direction: column;
                min-height: 200px;
            }
            
            .share-buttons .btn-large {
                width: 100%;
            }
            
            .section-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                justify-content: center;
            }
            
            /* Button style updates - uniform sizing */
            .btn-large {
                min-width: 200px;
                min-height: 60px;
                height: 60px;
                transition: all 0.2s ease;
                display: flex !important;
                align-items: center;
                justify-content: center;
                padding: 0 20px;
            }
            
            .btn-large .btn-icon {
                margin-right: 8px;
            }
            
            /* Share button specific styles */
            .share-btn {
                display: inline-flex !important;
                align-items: center;
                gap: 8px;
                background: transparent !important;
                border: 2px solid var(--text-color, #000) !important;
                color: var(--text-color, #000) !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100%;
                min-height: 60px;
                height: 60px;
            }
            
            .share-btn .btn-icon {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .share-btn svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .action-section {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.1);
                }
                
                .action-section:hover {
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                }
            }
            
            body.dark-mode .action-section {
                background: rgba(255, 255, 255, 0.03);
                border-color: rgba(255, 255, 255, 0.1);
            }
            
            body.dark-mode .action-section:hover {
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            }
            
            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .action-container {
                    padding: 15px;
                }
                
                .action-grid {
                    gap: 15px;
                }
                
                .action-row,
                .top-row,
                .share-row {
                    flex-direction: column;
                    grid-template-columns: 1fr;
                }
                
                .action-section {
                    padding: 20px;
                }
                
                .section-title {
                    font-size: 0.9rem;
                    margin-bottom: 15px;
                }
                
                .btn-large {
                    width: 100%;
                    min-width: unset;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    function createShareSections() {
        console.log('[ShareIntegrated] Creating share sections...');
        
        // Ensure styles are loaded
        addGridStyles();
        
        let shareContainer = document.getElementById('share-sections-container');
        
        // If container doesn't exist, create it after top-albums
        if (!shareContainer) {
            console.log('[ShareIntegrated] Container not found, creating after top-albums...');
            const topAlbums = document.getElementById('top-albums');
            if (topAlbums && topAlbums.parentElement) {
                shareContainer = document.createElement('div');
                shareContainer.id = 'share-sections-container';
                shareContainer.className = 'share-sections-container';
                topAlbums.parentElement.insertBefore(shareContainer, topAlbums.nextSibling);
                console.log('[ShareIntegrated] Created share container after albums');
            } else {
                console.error('[ShareIntegrated] Could not find insertion point');
                return;
            }
        }
        
        // Clear any existing content
        shareContainer.innerHTML = '';
        
        // Create share row
        const shareRow = document.createElement('div');
        shareRow.className = 'action-row share-row';
        shareRow.style.cssText = 'display: flex !important; flex-direction: row !important; gap: 20px !important; min-height: 300px !important; justify-content: center !important; width: 100% !important;';
        
        // Share Songs
        const shareSongsSection = document.createElement('div');
        shareSongsSection.className = 'action-section share-section';
        shareSongsSection.style.cssText = 'min-height: 250px !important; display: block !important; visibility: visible !important; opacity: 1 !important;';
        shareSongsSection.innerHTML = '<h4 class="section-title">Share Top Songs</h4>';
        const songShareButtons = document.createElement('div');
        songShareButtons.id = 'song-share-buttons-container';
        songShareButtons.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 12px !important; visibility: visible !important; opacity: 1 !important; min-height: 200px !important;';
        shareSongsSection.appendChild(songShareButtons);
        
        // Share Albums
        const shareAlbumsSection = document.createElement('div');
        shareAlbumsSection.className = 'action-section share-section';
        shareAlbumsSection.style.cssText = 'min-height: 250px !important; display: block !important; visibility: visible !important; opacity: 1 !important;';
        shareAlbumsSection.innerHTML = '<h4 class="section-title">Share Top Albums</h4>';
        const albumShareButtons = document.createElement('div');
        albumShareButtons.id = 'album-share-buttons-container';
        albumShareButtons.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 12px !important; visibility: visible !important; opacity: 1 !important; min-height: 200px !important;';
        shareAlbumsSection.appendChild(albumShareButtons);
        
        shareRow.appendChild(shareSongsSection);
        shareRow.appendChild(shareAlbumsSection);
        
        // Add to container
        shareContainer.appendChild(shareRow);
        
        // Force container to be visible with proper height
        shareContainer.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 350px !important; padding: 20px !important; margin-top: 3rem !important;';
        
        // Create share buttons after a small delay
        setTimeout(() => {
            createShareButtons('songs', songShareButtons);
            createShareButtons('albums', albumShareButtons);
            
            // Debug: Check final state
            console.log('[ShareIntegrated] Share sections created. Checking visibility...');
            console.log('Share container display:', getComputedStyle(shareContainer).display);
            console.log('Share row display:', getComputedStyle(shareRow).display);
            console.log('Songs section display:', getComputedStyle(shareSongsSection).display);
            console.log('Albums section display:', getComputedStyle(shareAlbumsSection).display);
        }, 50);
    }
    
    function createShareButtons(shareType, container) {
        if (!container) {
            return;
        }
        
        // Clear any existing buttons to prevent duplicates
        container.innerHTML = '';
        
        const shareButtons = [
            {
                id: `share-${shareType}-twitter`,
                icon: '<span style="font-weight: bold; font-size: 18px;">𝕏</span>',
                label: 'SHARE ON X',
                platform: 'twitter',
                customStyles: true
            },
            {
                id: `share-${shareType}-instagram`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/></svg>`,
                label: 'SHARE ON INSTAGRAM',
                platform: 'instagram'
            },
            {
                id: `share-${shareType}-facebook`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
                label: 'SHARE ON FACEBOOK',
                platform: 'facebook'
            }
        ];
        
        shareButtons.forEach(btn => {
            const button = document.createElement('button');
            button.id = btn.id;
            // NO CLASSES - pure inline styles only
            
            // Nuclear option - strip all CSS dependencies
            button.style.cssText = `
                display: inline-flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 300px !important;
                height: 60px !important;
                min-height: 60px !important;
                min-width: 300px !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 5px 0 !important;
                padding: 15px 20px !important;
                background: white !important;
                border: 2px solid #000 !important;
                color: #000 !important;
                font-size: 14px !important;
                font-weight: bold !important;
                cursor: pointer !important;
                border-radius: 8px !important;
                text-align: center !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 999 !important;
            `;
            
            // Simple text content instead of spans
            button.textContent = `${btn.label}`;
            
            button.addEventListener('click', () => handleShare(btn.platform, shareType));
            container.appendChild(button);
            
            // Debug: Check if button was actually added
            console.log(`[ShareIntegrated] Added button ${btn.id} to container, innerHTML: "${button.textContent}"`);
        });
    }
    
    async function handleShare(platform, shareType) {
        // Check if we have the app instance
        if (!window.kanyeApp) {
            alert('App not ready. Please try again.');
            return;
        }
        
        try {
            // Show loading
            const overlay = document.getElementById('overlay');
            const message = document.getElementById('overlay-message');
            if (overlay && message) {
                message.textContent = 'Generating your ranking image...';
                overlay.style.display = 'flex';
            }
            
            // Get the data
            const topSongs = window.kanyeApp.getTopSongs();
            const topAlbums = window.kanyeApp.getTopAlbums();
            
            // Generate the image
            const canvas = document.getElementById('export-canvas') || document.createElement('canvas');
            const exporter = new window.KanyeRankerExport();
            
            if (shareType === 'songs') {
                // Use square format for social media
                await exporter.generateSquareImage(topSongs, window.kanyeApp.albums, canvas);
            } else {
                await exporter.generateSquareAlbumsImage(topAlbums, canvas);
            }
            
            // Convert to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            // Download the image
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kanye-ranking-${shareType}.png`;
            a.click();
            URL.revokeObjectURL(url);
            
            // Generate personalized share text
            let shareText = '';
            if (shareType === 'songs') {
                const top3 = topSongs.slice(0, 3);
                shareText = `My top Kanye songs:\n${top3.map((s, i) => `${i+1}. ${s.title}`).join('\n')}\n\nRank yours at kanyeranker.com`;
            } else {
                const top3 = topAlbums.slice(0, 3);
                shareText = `My top Kanye albums:\n${top3.map((a, i) => `${i+1}. ${a.album.name}`).join('\n')}\n\nRank yours at kanyeranker.com`;
            }
            
            // Open share URL based on platform
            const shareUrl = 'https://kanyeranker.com';
            let targetUrl = '';
            
            switch(platform) {
                case 'twitter':
                    targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                    break;
                case 'facebook':
                    targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
                    break;
                case 'instagram':
                    // Instagram doesn't have a web share URL, so we'll just show instructions
                    alert('Image downloaded! Open Instagram and share from your gallery.\n\nSuggested caption:\n\n' + shareText);
                    break;
            }
            
            if (targetUrl) {
                // Small delay to ensure download completes
                setTimeout(() => {
                    window.open(targetUrl, '_blank');
                }, 500);
            }
            
            // Show success message
            setTimeout(() => {
                if (platform !== 'instagram') {
                    alert('Image downloaded! You can now attach it to your post.');
                }
            }, 1000);
            
        } catch (error) {
            console.error('[ShareIntegrated] Error:', error);
            alert('Failed to generate share image. Please try again.');
        } finally {
            // Hide loading
            const overlay = document.getElementById('overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }
    
    // Expose debug function globally
    window.debugShareInit = function() {
        console.log('Manually triggering share initialization...');
        
        // Check all relevant elements
        const resultsScreen = document.getElementById('results-screen');
        const container = document.querySelector('.download-buttons');
        const shareContainer = document.getElementById('share-sections-container');
        
        console.log('Results screen:', resultsScreen);
        console.log('Results screen active:', resultsScreen?.classList.contains('active'));
        console.log('Download buttons container:', container);
        console.log('Share sections container:', shareContainer);
        
        // Check if buttons exist in results screen
        const buttonsInResults = resultsScreen?.querySelector('.download-buttons');
        console.log('Buttons in results screen:', buttonsInResults);
        
        if (container) {
            reorganizeButtons();
        } else {
            console.error('No download-buttons container found');
            // Try to create share sections directly
            if (shareContainer) {
                console.log('Creating share sections directly...');
                createShareSections();
            }
        }
    };
    
    // Also expose the createShareSections function for debugging
    window.forceCreateShareSections = createShareSections;
    
    // Nuclear option - inject raw HTML
    window.injectRawShareButtons = function() {
        const container = document.getElementById('share-sections-container');
        if (!container) {
            console.log('No container found');
            return;
        }
        
        container.innerHTML = `
            <div style="display: flex; gap: 20px; padding: 20px; justify-content: center;">
                <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; min-width: 300px;">
                    <h4 style="text-align: center; margin-bottom: 15px;">Share Top Songs</h4>
                    <button onclick="alert('Twitter clicked')" style="
                        width: 280px;
                        height: 50px;
                        background: white;
                        border: 2px solid black;
                        margin: 5px 0;
                        cursor: pointer;
                        font-size: 14px;
                        display: block;
                    ">SHARE ON X</button>
                    <button onclick="alert('Instagram clicked')" style="
                        width: 280px;
                        height: 50px;
                        background: white;
                        border: 2px solid black;
                        margin: 5px 0;
                        cursor: pointer;
                        font-size: 14px;
                        display: block;
                    ">SHARE ON INSTAGRAM</button>
                    <button onclick="alert('Facebook clicked')" style="
                        width: 280px;
                        height: 50px;
                        background: white;
                        border: 2px solid black;
                        margin: 5px 0;
                        cursor: pointer;
                        font-size: 14px;
                        display: block;
                    ">SHARE ON FACEBOOK</button>
                </div>
                <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; min-width: 300px;">
                    <h4 style="text-align: center; margin-bottom: 15px;">Share Top Albums</h4>
                    <button onclick="alert('Albums Twitter clicked')" style="
                        width: 280px;
                        height: 50px;
                        background: white;
                        border: 2px solid black;
                        margin: 5px 0;
                        cursor: pointer;
                        font-size: 14px;
                        display: block;
                    ">SHARE ON X</button>
                    <button onclick="alert('Albums Instagram clicked')" style="
                        width: 280px;
                        height: 50px;
                        background: white;
                        border: 2px solid black;
                        margin: 5px 0;
                        cursor: pointer;
                        font-size: 14px;
                        display: block;
                    ">SHARE ON INSTAGRAM</button>
                    <button onclick="alert('Albums Facebook clicked')" style="
                        width: 280px;
                        height: 50px;
                        background: white;
                        border: 2px solid black;
                        margin: 5px 0;
                        cursor: pointer;
                        font-size: 14px;
                        display: block;
                    ">SHARE ON FACEBOOK</button>
                </div>
            </div>
        `;
        
        console.log('Raw HTML injected');
    };
    
    // Test button creation
    window.createTestButton = function() {
        const container = document.getElementById('share-sections-container');
        if (!container) {
            console.log('No container found');
            return;
        }
        
        // Create a super simple test button
        const testBtn = document.createElement('button');
        testBtn.id = 'test-button';
        testBtn.style.cssText = `
            width: 200px !important;
            height: 50px !important;
            background: red !important;
            color: white !important;
            border: none !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 10px !important;
            font-size: 16px !important;
            z-index: 9999 !important;
            position: relative !important;
        `;
        testBtn.textContent = 'TEST BUTTON';
        
        container.appendChild(testBtn);
        console.log('Test button created');
        
        // Check its dimensions
        setTimeout(() => {
            const rect = testBtn.getBoundingClientRect();
            console.log('Test button rect:', rect);
        }, 100);
    };
    
    // Simple visibility test
    window.testShareVisibility = function() {
        const container = document.getElementById('share-sections-container');
        if (!container) {
            console.log('❌ No share container found');
            return;
        }
        
        const rect = container.getBoundingClientRect();
        console.log('Share container dimensions:', {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            visible: rect.width > 0 && rect.height > 0
        });
        
        // Check buttons
        const buttons = container.querySelectorAll('button');
        console.log(`Found ${buttons.length} buttons:`);
        buttons.forEach((btn, i) => {
            const btnRect = btn.getBoundingClientRect();
            console.log(`  Button ${i + 1} (${btn.id}):`, {
                width: btnRect.width,
                height: btnRect.height,
                visible: btnRect.width > 0 && btnRect.height > 0
            });
        });
        
        // Scroll to it
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('Scrolled to share container');
    };
    
    // Force all share elements to be visible
    window.forceShareVisible = function() {
        const shareContainer = document.getElementById('share-sections-container');
        if (!shareContainer) {
            console.error('No share container found');
            return;
        }
        
        // Force visibility on container
        shareContainer.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 1000 !important;';
        
        // Force visibility on all child elements
        const allElements = shareContainer.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.classList.contains('share-row') || el.classList.contains('action-row')) {
                el.style.cssText += 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            } else if (el.tagName === 'BUTTON') {
                // Buttons already have inline styles
            } else {
                el.style.cssText += 'visibility: visible !important; opacity: 1 !important;';
            }
        });
        
        console.log('Forced visibility on all share elements');
        
        // Check if results screen is visible
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen) {
            const computed = getComputedStyle(resultsScreen);
            console.log('Results screen display:', computed.display);
            console.log('Results screen visibility:', computed.visibility);
        }
    };
    
    // Debug visibility issues
    window.debugShareVisibility = function() {
        const shareContainer = document.getElementById('share-sections-container');
        if (!shareContainer) {
            console.error('No share container found');
            return;
        }
        
        console.log('=== Checking visibility of share elements ===');
        
        // Check the share container and all parents
        let element = shareContainer;
        let level = 0;
        
        while (element && level < 10) {
            const computed = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            console.log(`Level ${level}: ${element.id || element.className || element.tagName}`);
            console.log(`  Display: ${computed.display}`);
            console.log(`  Visibility: ${computed.visibility}`);
            console.log(`  Opacity: ${computed.opacity}`);
            console.log(`  Position: ${computed.position}`);
            console.log(`  Z-index: ${computed.zIndex}`);
            console.log(`  Height: ${computed.height}`);
            console.log(`  Overflow: ${computed.overflow}`);
            console.log(`  Rect:`, rect);
            console.log(`  Visible on screen: ${rect.width > 0 && rect.height > 0}`);
            console.log('---');
            
            element = element.parentElement;
            level++;
        }
        
        // Check a specific button
        const button = document.getElementById('share-songs-twitter');
        if (button) {
            const buttonRect = button.getBoundingClientRect();
            console.log('Share button rect:', buttonRect);
            console.log('Button visible:', buttonRect.width > 0 && buttonRect.height > 0);
        }
    };
    
})();