// Integrated share functionality that generates images and shares with actual rankings
(function() {
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        // Try to reorganize immediately if results screen is active
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen && resultsScreen.classList.contains('active')) {
            const container = resultsScreen.querySelector('.download-buttons');
            const shareContainer = document.getElementById('share-sections-container');
            
            if (container) {
                setTimeout(reorganizeButtons, 100);
            } else if (shareContainer) {
                setTimeout(createShareSections, 100);
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
            margin: 0 0 25px 0 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            opacity: 0.8 !important;
        `;
        shareSongsSection.appendChild(songsTitle);
        
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
            margin: 0 0 25px 0 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            opacity: 0.8 !important;
        `;
        shareAlbumsSection.appendChild(albumsTitle);
        
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
                icon: '𝕏',
                label: 'Share on X',
                platform: 'twitter',
                color: '#000000',
                hoverColor: '#333333'
            },
            {
                id: `share-${shareType}-instagram`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" style="fill: #E4405F !important;"><path style="fill: #E4405F !important;" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/></svg>`,
                label: 'Share on Instagram',
                platform: 'instagram',
                color: '#E4405F',
                hoverColor: '#C13584'
            },
            {
                id: `share-${shareType}-facebook`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" style="fill: #1877F2 !important;"><path style="fill: #1877F2 !important;" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
                label: 'Share on Facebook',
                platform: 'facebook',
                color: '#1877F2',
                hoverColor: '#166FE5'
            }
        ];
        
        shareButtons.forEach(btn => {
            const button = document.createElement('button');
            button.id = btn.id;
            
            // Simple button styling - no dynamic colors
            button.style.cssText = `
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 12px !important;
                width: 100% !important;
                height: 60px !important;
                padding: 0 20px !important;
                background: var(--background-color) !important;
                border: 2px solid ${btn.color} !important;
                border-radius: 12px !important;
                color: ${btn.color} !important;
                font-size: 0.95rem !important;
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
            `;
            
            // Create icon element
            const iconElement = document.createElement('span');
            iconElement.style.cssText = `
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: ${btn.platform === 'twitter' ? '18px' : '20px'} !important;
                font-weight: ${btn.platform === 'twitter' ? 'bold' : 'normal'} !important;
                line-height: 1 !important;
                color: ${btn.color} !important;
            `;
            iconElement.innerHTML = btn.icon;
            
            // Create label element
            const labelElement = document.createElement('span');
            labelElement.textContent = btn.label;
            labelElement.style.cssText = `
                font-weight: 600 !important;
                color: ${btn.color} !important;
            `;
            
            button.appendChild(iconElement);
            button.appendChild(labelElement);
            
            // Simple hover effect - just lift the button with shadow
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
            });
            
            button.addEventListener('click', () => handleShare(btn.platform, shareType));
            container.appendChild(button);
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
            
            // Generate personalized share text with top 5 and hype message
            let shareText = '';
            if (shareType === 'songs') {
                const top5 = topSongs.slice(0, 5);
                shareText = `My top 5 Kanye songs:\n${top5.map((s, i) => `${i+1}. ${s.title}`).join('\n')}\n\n🌊 Think you know Ye better? Prove it at kanyeranker.com`;
            } else {
                const top5 = topAlbums.slice(0, 5);
                shareText = `My top 5 Kanye albums:\n${top5.map((a, i) => `${i+1}. ${a.album.name}`).join('\n')}\n\n🎵 What's your Kanye era? Find out at kanyeranker.com`;
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
                    alert('Image downloaded! 📸\n\nOpen Instagram and share from your gallery.\n\nSuggested caption:\n\n' + shareText);
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
    
})();