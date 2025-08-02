// Integrated share functionality that generates images and shares with actual rankings
(function() {
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        // Load styles immediately to prevent flash
        addGridStyles();
        
        // Try to reorganize immediately if results screen is active
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen && resultsScreen.classList.contains('active')) {
            const container = resultsScreen.querySelector('.download-buttons');
            const shareContainer = document.getElementById('share-sections-container');
            
            if (container) {
                reorganizeButtons();
            } else if (shareContainer) {
                createShareSections();
            }
        }
        
        // Watch for results screen changes
        const observer = new MutationObserver(function(mutations) {
            for (let mutation of mutations) {
                if (mutation.target.id === 'results-screen' && 
                    mutation.target.classList.contains('active')) {
                    
                    // Check if we haven't already reorganized
                    const container = mutation.target.querySelector('.download-buttons');
                    const shareContainer = document.getElementById('share-sections-container');
                    
                    if (container && !container.classList.contains('action-container')) {
                        setTimeout(reorganizeButtons, 200);
                    } else if (!container && shareContainer) {
                        // No download buttons but share container exists
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
        if (buttonsContainer.classList.contains('reorganized')) {
            return;
        }
        
        // Mark as reorganized immediately
        buttonsContainer.classList.add('reorganized');
        
        // Get existing buttons
        const continueBtn = document.getElementById('continue-ranking');
        const restartBtn = document.getElementById('restart');
        
        // Clear container
        buttonsContainer.innerHTML = '';
        buttonsContainer.className = 'action-container reorganized';
        
        // Create main grid layout
        const actionGrid = document.createElement('div');
        actionGrid.className = 'action-grid';
        
        // Simple button container without section title
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex !important;
            gap: 15px !important;
            justify-content: center !important;
            padding: 20px !important;
            max-width: 600px !important;
            margin: 0 auto !important;
        `;
        
        // Style the buttons to match
        if (continueBtn) {
            continueBtn.style.flex = '1';
        }
        if (restartBtn) {
            restartBtn.style.flex = '1';
        }
        
        buttonContainer.appendChild(continueBtn);
        buttonContainer.appendChild(restartBtn);
        
        // Export buttons are no longer needed - removed to avoid duplication
        
        
        // Add button container directly
        buttonsContainer.appendChild(buttonContainer);
        
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
            /* Hide download buttons container initially to prevent flash */
            .download-buttons:not(.reorganized) {
                opacity: 0 !important;
                visibility: hidden !important;
            }
            
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
                min-height: 220px !important;
            }
            
            .share-row {
                display: flex !important;
                gap: 20px;
                justify-content: center;
                min-height: 220px !important;
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
                min-height: 180px !important;
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
                min-height: auto;
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
            }
            
            /* Lock SVG colors - they use inline styles */
            #song-share-buttons-container svg,
            #song-share-buttons-container svg path,
            #album-share-buttons-container svg,
            #album-share-buttons-container svg path {
                /* SVG colors are set via inline styles - no CSS overrides */
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
        // Ensure styles are loaded
        addGridStyles();
        
        // Create share songs section after top-songs but before albums header
        createShareSongsSection();
        
        // Create share albums section at the bottom
        createShareAlbumsSection();
    }
    
    function createShareSongsSection() {
        // Find the insertion point - after top-songs, before albums header
        const topSongs = document.getElementById('top-songs');
        const albumsHeader = document.getElementById('albums-header');
        
        if (!topSongs || !albumsHeader) {
            setTimeout(createShareSongsSection, 500);
            return;
        }
        
        // Check if already exists
        let shareSongsContainer = document.getElementById('share-songs-container');
        if (!shareSongsContainer) {
            shareSongsContainer = document.createElement('div');
            shareSongsContainer.id = 'share-songs-container';
            shareSongsContainer.className = 'share-section-single';
            
            // Insert between top-songs and albums-header
            albumsHeader.parentElement.insertBefore(shareSongsContainer, albumsHeader);
        }
        
        // Clear and style container
        shareSongsContainer.innerHTML = '';
        shareSongsContainer.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 3rem auto !important;
            padding: 0 20px !important;
            max-width: 600px !important;
        `;
        
        // Share Songs section with modern styling
        const shareSongsSection = document.createElement('div');
        shareSongsSection.style.cssText = `
            background: var(--accent-white, #f8f8f8) !important;
            border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1)) !important;
            border-radius: 20px !important;
            padding: 30px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            transition: transform 0.3s ease, box-shadow 0.3s ease !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) !important;
            margin: 0 auto !important;
        `;
        
        const songsTitle = document.createElement('h4');
        songsTitle.textContent = 'Share Top Songs';
        songsTitle.style.cssText = `
            font-size: 1.1rem !important;
            font-weight: 800 !important;
            color: var(--text-color, #000) !important;
            text-align: center !important;
            margin: 0 0 10px 0 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            opacity: 0.8 !important;
        `;
        shareSongsSection.appendChild(songsTitle);
        
        // Add helpful subtitle based on device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const hasWebShare = navigator.canShare && navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] });
        const hasClipboard = navigator.clipboard && typeof ClipboardItem !== 'undefined';
        
        const subtitle = document.createElement('p');
        subtitle.style.cssText = `
            font-size: 0.85rem !important;
            color: var(--text-secondary, #666) !important;
            text-align: center !important;
            margin: 0 0 20px 0 !important;
            line-height: 1.4 !important;
        `;
        
        if (hasWebShare && isMobile) {
            subtitle.textContent = 'Download and let the kids know what G.O.O.D. Music really is';
        } else if (hasWebShare && !isMobile) {
            subtitle.textContent = 'Name one genius that ain\'t crazy... now share yours';
        } else if (hasClipboard && !isMobile) {
            subtitle.textContent = 'Copy that, Yeezy taught me';
        } else {
            subtitle.textContent = 'Download and let the kids know what G.O.O.D. Music really is';
        }
        
        shareSongsSection.appendChild(subtitle);
        
        // No save button needed - share functionality handles it
        
        const songShareButtons = document.createElement('div');
        songShareButtons.id = 'song-share-buttons-container';
        songShareButtons.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            gap: 15px !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        shareSongsSection.appendChild(songShareButtons);
        
        shareSongsContainer.appendChild(shareSongsSection);
        
        // Create share buttons after a small delay
        setTimeout(() => {
            createShareButtons('songs', songShareButtons);
        }, 50);
    }
    
    function createShareAlbumsSection() {
        let shareContainer = document.getElementById('share-sections-container');
        
        // If container doesn't exist, create it after top-albums
        if (!shareContainer) {
            const topAlbums = document.getElementById('top-albums');
            if (topAlbums && topAlbums.parentElement) {
                shareContainer = document.createElement('div');
                shareContainer.id = 'share-sections-container';
                topAlbums.parentElement.insertBefore(shareContainer, topAlbums.nextSibling);
            } else {
                setTimeout(createShareAlbumsSection, 500);
                return;
            }
        }
        
        // Clear any existing content
        shareContainer.innerHTML = '';
        
        // Force container styles for visibility
        shareContainer.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin: 3rem auto 2rem !important;
            padding: 0 20px !important;
            max-width: 600px !important;
        `;
        
        // Share Albums section with modern styling  
        const shareAlbumsSection = document.createElement('div');
        shareAlbumsSection.style.cssText = `
            background: var(--accent-white, #f8f8f8) !important;
            border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1)) !important;
            border-radius: 20px !important;
            padding: 30px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            transition: transform 0.3s ease, box-shadow 0.3s ease !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) !important;
            margin: 0 auto !important;
        `;
        
        const albumsTitle = document.createElement('h4');
        albumsTitle.textContent = 'Share Top Albums';
        albumsTitle.style.cssText = `
            font-size: 1.1rem !important;
            font-weight: 800 !important;
            color: var(--text-color, #000) !important;
            text-align: center !important;
            margin: 0 0 10px 0 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            opacity: 0.8 !important;
        `;
        shareAlbumsSection.appendChild(albumsTitle);
        
        // Add helpful subtitle based on device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const hasWebShare = navigator.canShare && navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] });
        const hasClipboard = navigator.clipboard && typeof ClipboardItem !== 'undefined';
        
        const subtitle = document.createElement('p');
        subtitle.style.cssText = `
            font-size: 0.85rem !important;
            color: var(--text-secondary, #666) !important;
            text-align: center !important;
            margin: 0 0 20px 0 !important;
            line-height: 1.4 !important;
        `;
        
        if (hasWebShare && isMobile) {
            subtitle.textContent = '🌊 Drop the wave on any app you want 🌊';
        } else if (hasWebShare && !isMobile) {
            subtitle.textContent = 'Name one genius that ain\'t crazy... now share yours';
        } else if (hasClipboard && !isMobile) {
            subtitle.textContent = 'Copy that, Yeezy taught me';
        } else {
            subtitle.textContent = 'Download and let the kids know what good music really is';
        }
        
        shareAlbumsSection.appendChild(subtitle);
        
        // No save button needed - share functionality handles it
        
        const albumShareButtons = document.createElement('div');
        albumShareButtons.id = 'album-share-buttons-container';
        albumShareButtons.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            gap: 15px !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        shareAlbumsSection.appendChild(albumShareButtons);
        
        shareContainer.appendChild(shareAlbumsSection);
        
        // Create share buttons after a small delay
        setTimeout(() => {
            createShareButtons('albums', albumShareButtons);
        }, 50);
        
        // Add duplicate action buttons at the bottom
        setTimeout(() => {
            createBottomActionButtons();
        }, 100);
    }
    
    function createBottomActionButtons() {
        // Find the results screen
        const resultsScreen = document.getElementById('results-screen');
        if (!resultsScreen) return;
        
        // Check if bottom buttons already exist
        if (document.getElementById('bottom-action-buttons')) return;
        
        // Create bottom action container
        const bottomContainer = document.createElement('div');
        bottomContainer.id = 'bottom-action-buttons';
        bottomContainer.style.cssText = `
            margin: 4rem auto 2rem !important;
            padding: 0 20px !important;
            max-width: 600px !important;
            display: flex !important;
            gap: 15px !important;
        `;
        
        // Clone the original buttons
        const continueBtn = document.getElementById('continue-ranking');
        const restartBtn = document.getElementById('restart');
        
        if (continueBtn) {
            const continueClone = continueBtn.cloneNode(true);
            continueClone.id = 'continue-ranking-bottom';
            continueClone.style.flex = '1';
            continueClone.addEventListener('click', () => continueBtn.click());
            bottomContainer.appendChild(continueClone);
        }
        
        if (restartBtn) {
            const restartClone = restartBtn.cloneNode(true);
            restartClone.id = 'restart-bottom';
            restartClone.style.flex = '1';
            restartClone.addEventListener('click', () => restartBtn.click());
            bottomContainer.appendChild(restartClone);
        }
        
        // Append to the end of results screen
        resultsScreen.appendChild(bottomContainer);
    }
    
    function createShareButtons(shareType, container) {
        if (!container) {
            return;
        }
        
        // Clear any existing buttons to prevent duplicates
        container.innerHTML = '';
        
        // Check device capabilities
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const hasWebShare = navigator.canShare && navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] });
        const hasClipboard = navigator.clipboard && typeof ClipboardItem !== 'undefined';
        
        console.log('[ShareIntegrated] Device capabilities:', { 
            isMobile, 
            hasWebShare, 
            hasClipboard,
            userAgent: navigator.userAgent,
            shareType
        });
        
        let shareButtons = [];
        
        // Add native share button - always show on mobile, desktop only if Web Share API available
        if (hasWebShare || isMobile) {
            console.log('[ShareIntegrated] Adding Share with Friends button');
            shareButtons.push({
                id: `share-${shareType}-native`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" style="fill: currentColor;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`,
                label: 'Share with Friends',
                platform: 'native',
                color: 'var(--text-color, #007AFF)',
                hoverColor: 'var(--primary-color, #0055CC)',
                isPrimary: true,
                useThemeColors: true
            });
        }
        
        // Add mobile-only "Screenshot for Stories" button AFTER "Share with Friends"
        if (isMobile) {
            shareButtons.push({
                id: `share-${shareType}-stories`,
                icon: '📱',
                label: 'Screenshot for Stories',
                platform: 'stories',
                color: 'var(--text-color, #9C27B0)',
                hoverColor: 'var(--primary-color, #7B1FA2)',
                isPrimary: true,
                useThemeColors: true
            });
        }
        
        // Add separator marker if we have native share or copy
        if (shareButtons.length > 0) {
            shareButtons.push({ isSeparator: true });
        }
        
        // Add platform buttons conditionally based on device
        let platformButtons = [];
        
        // X/Twitter - desktop only
        if (!isMobile) {
            console.log('[ShareIntegrated] Adding X/Twitter button for desktop');
            platformButtons.push({
                id: `share-${shareType}-twitter`,
                icon: '𝕏',
                label: 'X',
                platform: 'twitter',
                color: '#000000',
                hoverColor: '#333333'
            });
        } else {
            console.log('[ShareIntegrated] Skipping X/Twitter button on mobile');
        }
        
        // Facebook - always show
        platformButtons.push({
            id: `share-${shareType}-facebook`,
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" style="fill: #1877F2 !important;"><path style="fill: #1877F2 !important;" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
            label: 'Facebook',
            platform: 'facebook',
            color: '#1877F2',
            hoverColor: '#166FE5'
        });
        
        // Instagram - mobile only
        if (isMobile) {
            console.log('[ShareIntegrated] Adding Instagram button for mobile');
            platformButtons.push({
                id: `share-${shareType}-instagram`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" style="fill: #E4405F !important;"><path style="fill: #E4405F !important;" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/></svg>`,
                label: 'Instagram',
                platform: 'instagram',
                color: '#E4405F',
                hoverColor: '#C13584'
            });
        }
        
        // Reddit - always show
        platformButtons.push({
            id: `share-${shareType}-reddit`,
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" style="fill: #FF4500 !important;"><path style="fill: #FF4500 !important;" d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>`,
            label: 'Reddit',
            platform: 'reddit', 
            color: '#FF4500',
            hoverColor: '#CC3700'
        });
        
        // Copy Text button - fills the 4th spot in the grid
        platformButtons.push({
            id: `share-${shareType}-copy-text`,
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" style="fill: #6B46C1 !important;"><path style="fill: #6B46C1 !important;" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
            label: 'Copy Text',
            platform: 'copy-text',
            color: '#6B46C1',
            hoverColor: '#553C9A'
        });
        
        shareButtons = shareButtons.concat(platformButtons);
        
        console.log('[ShareIntegrated] Total buttons for', shareType + ':', shareButtons.filter(b => !b.isSeparator).map(b => b.label).join(', '));
        
        // Define social platforms for use in styles
        const socialPlatforms = ['twitter', 'facebook', 'instagram', 'reddit', 'copy-text'];
        
        shareButtons.forEach((btn, index) => {
            // Handle separator
            if (btn.isSeparator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 15px !important;
                    margin: 20px 0 !important;
                    font-size: 0.8rem !important;
                    color: var(--text-secondary, #666) !important;
                    text-transform: uppercase !important;
                    letter-spacing: 1px !important;
                    opacity: 0.6 !important;
                `;
                
                const line1 = document.createElement('div');
                line1.style.cssText = `
                    flex: 1 !important;
                    height: 1px !important;
                    background: var(--border-color, rgba(0, 0, 0, 0.1)) !important;
                `;
                
                const text = document.createElement('span');
                text.textContent = 'or share directly to';
                
                const line2 = document.createElement('div');
                line2.style.cssText = line1.style.cssText;
                
                separator.appendChild(line1);
                separator.appendChild(text);
                separator.appendChild(line2);
                container.appendChild(separator);
                return;
            }
            
            const button = document.createElement('button');
            button.id = btn.id;
            
            // Different styling for primary vs secondary buttons
            const isPrimary = btn.isPrimary || false;
            const baseHeight = isPrimary ? '70px' : '60px';
            const fontSize = isPrimary ? '1.05rem' : '0.95rem';
            
            // Special handling for X/Twitter button in dark mode
            const isTwitter = btn.platform === 'twitter';
            const useTheme = btn.useThemeColors;
            const borderColor = useTheme ? btn.color : (isTwitter ? 'var(--text-color, #000000)' : btn.color);
            const textColor = isPrimary && !useTheme ? '#ffffff' : (isTwitter ? 'var(--text-color, #000000)' : btn.color);
            
            button.style.cssText = `
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 12px !important;
                width: 100% !important;
                height: ${baseHeight} !important;
                padding: 0 20px !important;
                background: ${isPrimary && !useTheme ? btn.color : 'transparent'} !important;
                border: 2px solid ${borderColor} !important;
                border-radius: 12px !important;
                color: ${textColor} !important;
                font-size: ${fontSize} !important;
                font-weight: 600 !important;
                font-family: inherit !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: relative !important;
                overflow: hidden !important;
                text-transform: none !important;
                letter-spacing: 0 !important;
                margin-bottom: ${!socialPlatforms.includes(btn.platform) ? '15px' : '0'} !important;
            `;
            
            // Create icon element
            const iconElement = document.createElement('span');
            const iconColor = isPrimary && !useTheme ? '#ffffff' : (isTwitter ? 'var(--text-color, #000000)' : btn.color);
            iconElement.style.cssText = `
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: ${btn.platform === 'twitter' ? '18px' : '20px'} !important;
                font-weight: ${btn.platform === 'twitter' ? 'bold' : 'normal'} !important;
                line-height: 1 !important;
                color: ${iconColor} !important;
            `;
            iconElement.innerHTML = btn.icon;
            
            // Create label element
            const labelElement = document.createElement('span');
            labelElement.textContent = btn.label;
            const labelColor = isPrimary && !useTheme ? '#ffffff' : (isTwitter ? 'var(--text-color, #000000)' : btn.color);
            labelElement.style.cssText = `
                font-weight: 600 !important;
                color: ${labelColor} !important;
            `;
            
            button.appendChild(iconElement);
            button.appendChild(labelElement);
            
            // Platform button container for social media buttons only
            // Count the social media platform buttons (X, Facebook, Instagram, Reddit)
            const isSocialButton = socialPlatforms.includes(btn.platform);
            
            console.log(`[ShareIntegrated] Rendering button: ${btn.label}, platform: ${btn.platform}, isSocial: ${isSocialButton}`);
            
            if (isSocialButton) {
                if (!container.querySelector('.platform-buttons')) {
                    const platformContainer = document.createElement('div');
                    platformContainer.className = 'platform-buttons';
                    platformContainer.style.cssText = `
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 10px !important;
                        margin-top: 10px !important;
                    `;
                    container.appendChild(platformContainer);
                    console.log('[ShareIntegrated] Created platform-buttons container');
                }
                const platformContainer = container.querySelector('.platform-buttons');
                button.style.width = '100% !important';
                button.style.marginBottom = '0 !important';
                platformContainer.appendChild(button);
                console.log(`[ShareIntegrated] Added ${btn.label} to platform grid`);
            } else {
                // Native share and Screenshot buttons go above the grid
                container.appendChild(button);
                console.log(`[ShareIntegrated] Added ${btn.label} directly to container`);
            }
            
            // Hover effects
            button.addEventListener('mouseenter', () => {
                if (isPrimary && !useTheme) {
                    button.style.background = btn.hoverColor + ' !important';
                    button.style.borderColor = btn.hoverColor + ' !important';
                } else {
                    button.style.transform = 'translateY(-2px)';
                    button.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (isPrimary && !useTheme) {
                    button.style.background = btn.color + ' !important';
                    button.style.borderColor = btn.color + ' !important';
                } else {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = 'none';
                }
            });
            
            button.addEventListener('click', () => handleShare(btn.platform, shareType));
        });
        
        // Final check - log what buttons actually exist in the container
        setTimeout(() => {
            const allButtons = container.querySelectorAll('button');
            console.log(`[ShareIntegrated] Final button count in ${shareType} container:`, allButtons.length);
            allButtons.forEach(btn => {
                console.log(`  - ${btn.id}: ${btn.textContent.trim()}`);
            });
        }, 100);
    }
    
    async function handleShare(platform, shareType) {
        // Check if we have the app instance
        if (!window.kanyeApp) {
            alert('App not ready. Please try again.');
            return;
        }
        
        // Handle stories screenshot mode
        if (platform === 'stories') {
            showStoryPreview(shareType);
            return;
        }
        
        // Handle copy text without generating image
        if (platform === 'copy-text') {
            const topSongs = window.kanyeApp.getTopSongs();
            const topAlbums = window.kanyeApp.getTopAlbums();
            
            let shareText = '';
            if (shareType === 'songs') {
                const top10 = topSongs.slice(0, 10);
                shareText = `My Top 10 Kanye songs are:\n${top10.map((s, i) => {
                    // Censor the title if needed
                    const displayTitle = s.title === "Niggas in Paris" ? "N****s in Paris" : s.title;
                    return `${i+1}. ${displayTitle}`;
                }).join('\n')}\n\n`;
                
                shareText += `What are yours? Find out for free at kanyeranker.com`;
            } else {
                const top5 = topAlbums.slice(0, 5);
                shareText = `My Top 5 Kanye albums are:\n${top5.map((a, i) => `${i+1}. ${a.album.name}`).join('\n')}\n\nWhat's your Kanye era? Find out for free at kanyeranker.com`;
            }
            
            try {
                await navigator.clipboard.writeText(shareText);
                alert('✅ Copied to clipboard!\n\nYour ranking text is ready to paste anywhere.');
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareText;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert('✅ Copied to clipboard!\n\nYour ranking text is ready to paste anywhere.');
                } catch (err) {
                    alert('Failed to copy text. Please try again.');
                }
                document.body.removeChild(textArea);
            }
            return;
        }
        
        // Open window immediately for social platforms to avoid popup blockers on mobile
        let shareWindow = null;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isMobileBrowser = isMobile; // Use same variable
        if (isMobileBrowser && (platform === 'x' || platform === 'twitter' || platform === 'reddit' || platform === 'facebook')) {
            shareWindow = window.open('', '_blank');
            if (shareWindow) {
                shareWindow.document.write('<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:20px;font-family:system-ui,sans-serif;text-align:center;padding-top:50px;"><h2>Preparing your share...</h2><p>Please wait while we generate your ranking image.</p><p style="color:#666;font-size:14px;">This window will redirect automatically.</p></body></html>');
            } else {
                // If popup was blocked, warn the user
                alert('Please allow popups for this site to share on social media.');
                return;
            }
        }
        
        try {
            // Get overlay elements
            const overlay = document.getElementById('overlay');
            const message = document.getElementById('overlay-message');
            
            // Check if this is a native share on mobile - if so, don't show loading overlay
            const isNativeShare = platform === 'native' || (navigator.canShare && navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] }));
            
            // Only show loading for non-native shares (downloads)
            if (!isNativeShare && overlay && message) {
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
            
            // Generate personalized share text with top 5 and hype message
            let shareText = '';
            if (shareType === 'songs') {
                const top10 = topSongs.slice(0, 10);
                shareText = `My Top 10 Kanye songs are:\n${top10.map((s, i) => {
                    // Censor the title if needed
                    const displayTitle = s.title === "Niggas in Paris" ? "N****s in Paris" : s.title;
                    return `${i+1}. ${displayTitle}`;
                }).join('\n')}\n\n`;
                
                shareText += `What are yours? Find out for free at kanyeranker.com`;
            } else {
                const top5 = topAlbums.slice(0, 5);
                shareText = `My Top 5 Kanye albums are:\n${top5.map((a, i) => `${i+1}. ${a.album.name}`).join('\n')}\n\nWhat's your Kanye era? Find out for free at kanyeranker.com`;
            }
            
            // Check if Web Share API is available (mobile)
            const file = new File([blob], `kanye-ranking-${shareType}.png`, { type: 'image/png' });
            const shareUrl = 'https://kanyeranker.com';
            
            // Handle native share button
            if (platform === 'native') {
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    // Try Web Share API
                    const shareData = {
                        text: shareText,
                        files: [file]
                    };
                    
                    try {
                        await navigator.share(shareData);
                        // Successfully shared - hide overlay before returning
                        if (overlay) {
                            overlay.style.display = 'none';
                        }
                        return;
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            // User cancelled share - hide overlay before returning
                            if (overlay) {
                                overlay.style.display = 'none';
                            }
                            return;
                        }
                        // Fall back to download
                        console.log('Web Share failed, falling back to download');
                    }
                } else if (isMobile) {
                    // Mobile without Web Share API - download and show instructions
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `kanye-ranking-${shareType}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    if (overlay) {
                        overlay.style.display = 'none';
                    }
                    
                    alert('Image downloaded! 📸\n\nFind it in your Downloads/Photos and share it to your favorite app.');
                    return;
                }
            }
            
            // Desktop or fallback: Platform-specific handling
            if (platform === 'copy') {
                // Copy to clipboard (desktop only)
                if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                    try {
                        const item = new ClipboardItem({ 'image/png': blob });
                        await navigator.clipboard.write([item]);
                        // Show success message
                        if (window.kanyeApp.ui && window.kanyeApp.ui.showSuccess) {
                            window.kanyeApp.ui.showSuccess('Image copied to clipboard! Paste it into your favorite social app.');
                        } else {
                            alert('Image copied to clipboard! Paste it into your favorite social app.');
                        }
                        // Hide overlay before returning
                        if (overlay) {
                            overlay.style.display = 'none';
                        }
                        return;
                    } catch (err) {
                        console.error('Clipboard copy failed:', err);
                        // Fall back to download
                    }
                }
            }
            
            // Fallback: Download the image
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kanye-ranking-${shareType}.png`;
            a.click();
            URL.revokeObjectURL(url);
            
            // Open share URL based on platform
            let targetUrl = '';
            
            switch(platform) {
                case 'x':
                case 'twitter':
                    // Always use twitter.com since we only show this on desktop
                    targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                    break;
                case 'facebook':
                    targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
                    break;
                case 'reddit':
                    const redditTitle = shareType === 'songs' ? 'My Top 10 Kanye Songs' : 'My Top 5 Kanye Albums';
                    // Use www.reddit.com for better mobile compatibility
                    // Reddit doesn't support 'text' parameter, combine title and text
                    const redditFullText = `${redditTitle}\n\n${shareText}`;
                    targetUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(redditFullText)}`;
                    break;
                case 'instagram':
                    // Instagram doesn't have a web share URL, so we'll just show instructions
                    alert('Image downloaded! 📸\n\nOpen Instagram and share from your gallery.\n\nSuggested caption:\n\n' + shareText);
                    break;
                case 'native':
                    // Native share already handled above
                    break;
            }
            
            if (targetUrl) {
                // For mobile with pre-opened window, navigate immediately
                if (shareWindow) {
                    shareWindow.location.href = targetUrl;
                } else {
                    // Desktop or fallback: Small delay to ensure download completes
                    setTimeout(() => {
                        window.open(targetUrl, '_blank');
                    }, 500);
                }
            }
            
            // Show success message with platform-specific instructions
            // Only show alerts on desktop or if mobile share window wasn't pre-opened
            if (!shareWindow) {
                setTimeout(() => {
                    if (platform === 'x' || platform === 'twitter') {
                        alert(`Image downloaded! 📸\n\nA new X/Twitter tab is opening. Please attach the downloaded image to your post.\n\nThe text has been pre-filled for you!`);
                    } else if (platform === 'facebook') {
                        alert(`Image downloaded! 📸\n\nA new Facebook tab is opening. Please:\n1. Attach the downloaded image\n2. Copy and paste this text:\n\n${shareText}`);
                    } else if (platform === 'reddit') {
                        alert(`Image downloaded! 📸\n\nA new Reddit tab is opening. Please:\n1. Attach the downloaded image\n2. Copy and paste this text:\n\n${shareText}`);
                    }
                }, 800);
            }
            
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
    
    // Export handleShare for share incentive system
    window.handleShare = handleShare;
    
    // Story preview functionality
    async function showStoryPreview(shareType) {
        try {
            // Show loading overlay
            const overlay = document.getElementById('overlay');
            const message = document.getElementById('overlay-message');
            
            if (overlay && message) {
                message.textContent = 'Preparing your story image...';
                overlay.style.display = 'flex';
            }
            
            // Get the data
            const topSongs = window.kanyeApp.getTopSongs();
            const topAlbums = window.kanyeApp.getTopAlbums();
            
            // Generate the story image (portrait 9:16)
            const canvas = document.getElementById('export-canvas') || document.createElement('canvas');
            const exporter = new window.KanyeRankerExport();
            
            // Use story-specific portrait export (9:16 ratio)
            if (shareType === 'songs') {
                await exporter.generateStoryImage(topSongs, window.kanyeApp.albums, canvas);
            } else {
                await exporter.generateStoryAlbumsImage(topAlbums, canvas);
            }
            
            // Hide loading overlay
            if (overlay) {
                overlay.style.display = 'none';
            }
            
            // Create full-screen preview overlay
            const previewOverlay = document.createElement('div');
            previewOverlay.id = 'story-preview-overlay';
            previewOverlay.className = 'story-preview-overlay';
            
            // Create image element
            const img = new Image();
            img.src = canvas.toDataURL('image/png');
            img.className = 'story-preview-image';
            
            // Remove instruction banner - we don't want any text over the screenshot
            // const instruction = document.createElement('div');
            // instruction.className = 'story-preview-instruction';
            // instruction.innerHTML = '📸 Take a screenshot now';
            
            // Create close hint
            const closeHint = document.createElement('div');
            closeHint.className = 'story-preview-close-hint';
            closeHint.textContent = 'Tap anywhere to close';
            
            // Create platform shortcuts container (hidden initially)
            const platformShortcuts = document.createElement('div');
            platformShortcuts.className = 'platform-shortcuts';
            platformShortcuts.style.display = 'none';
            
            // Platform buttons
            const platforms = [
                { name: 'Instagram', icon: '📷', url: 'instagram://story-camera', color: '#E4405F' },
                { name: 'Snapchat', icon: '👻', url: 'snapchat://', color: '#FFFC00' },
                { name: 'TikTok', icon: '🎵', url: 'tiktok://', color: '#000000' }
            ];
            
            platforms.forEach(platform => {
                const btn = document.createElement('button');
                btn.className = 'platform-shortcut-btn';
                btn.innerHTML = `${platform.icon} ${platform.name}`;
                btn.style.backgroundColor = platform.color;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = platform.url;
                });
                platformShortcuts.appendChild(btn);
            });
            
            // Assemble overlay (without instruction banner)
            // previewOverlay.appendChild(instruction); // Removed
            previewOverlay.appendChild(img);
            previewOverlay.appendChild(closeHint);
            previewOverlay.appendChild(platformShortcuts);
            
            // Add to body
            document.body.appendChild(previewOverlay);
            
            // Detect screenshot taken via Page Visibility API
            let screenshotTaken = false;
            let hideTimeout = null;
            
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    // User likely taking screenshot - immediately hide text
                    // instruction.style.opacity = '0'; // Removed
                    closeHint.style.opacity = '0';
                    screenshotTaken = true;
                } else if (!document.hidden && screenshotTaken) {
                    // User returned after taking screenshot
                    // instruction.style.opacity = '1'; // Removed
                    closeHint.style.opacity = '1';
                    // instruction.innerHTML = '✅ Screenshot taken! Open your favorite app'; // Removed
                    platformShortcuts.style.display = 'flex';
                    closeHint.textContent = 'Tap anywhere to close';
                    
                    // Auto-close after 10 seconds
                    setTimeout(() => {
                        if (document.body.contains(previewOverlay)) {
                            previewOverlay.remove();
                        }
                    }, 10000);
                }
            };
            
            // Also hide on blur (when user switches apps)
            const handleBlur = () => {
                instruction.style.opacity = '0';
                closeHint.style.opacity = '0';
            };
            
            const handleFocus = () => {
                if (!screenshotTaken) {
                    // instruction.style.opacity = '1'; // Removed
                    closeHint.style.opacity = '1';
                }
            };
            
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleBlur);
            window.addEventListener('focus', handleFocus);
            
            // Close on tap/click
            previewOverlay.addEventListener('click', () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('blur', handleBlur);
                window.removeEventListener('focus', handleFocus);
                previewOverlay.remove();
            });
            
            // Track analytics
            if (window.analytics) {
                window.analytics.trackShare('stories', shareType);
            }
            
        } catch (error) {
            console.error('[StoryPreview] Error:', error);
            // Don't show alert - the preview likely still worked
            
            // Hide loading overlay
            const overlay = document.getElementById('overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }
    
})();