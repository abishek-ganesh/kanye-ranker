class UI {
    constructor() {
        
        this.screens = {
            landing: document.getElementById('landing-screen'),
            comparison: document.getElementById('comparison-screen'),
            results: document.getElementById('results-screen')
        };
        
        // Initialize YouTube preview system
        this.youtubePreview = null;
        
        // Track achieved milestones
        this.achievedMilestones = new Set();
        
        // Check if screens exist
        if (!this.screens.landing || !this.screens.comparison || !this.screens.results) {
            console.error('One or more screens not found:', this.screens);
            throw new Error('Required screens not found in DOM');
        }
        
        this.elements = {
            startButton: document.getElementById('start-ranking'),
            skipButton: document.getElementById('skip-comparison'),
            showResultsButton: document.getElementById('show-results'),
            restartButton: document.getElementById('restart'),
            exportSongsImageButton: document.getElementById('export-songs-image'),
            exportAlbumsImageButton: document.getElementById('export-albums-image'),
            
            currentComparison: document.getElementById('current-comparison'),
            progressFill: document.getElementById('progress-fill'),
            completedComparisons: document.getElementById('completed-comparisons'),
            
            songCards: {
                a: {
                    container: document.getElementById('song-a'),
                    albumArt: document.getElementById('album-art-a'),
                    title: document.getElementById('song-title-a'),
                    album: document.getElementById('album-name-a'),
                    year: document.getElementById('year-a'),
                    previewBtn: document.getElementById('preview-a'),
                    youtubeLink: document.getElementById('youtube-a'),
                    lyricsLink: document.getElementById('lyrics-a'),
                    chooseBtn: document.getElementById('choose-a')
                },
                b: {
                    container: document.getElementById('song-b'),
                    albumArt: document.getElementById('album-art-b'),
                    title: document.getElementById('song-title-b'),
                    album: document.getElementById('album-name-b'),
                    year: document.getElementById('year-b'),
                    previewBtn: document.getElementById('preview-b'),
                    youtubeLink: document.getElementById('youtube-b'),
                    lyricsLink: document.getElementById('lyrics-b'),
                    chooseBtn: document.getElementById('choose-b')
                }
            },
            
            topSongs: document.getElementById('top-songs'),
            topAlbums: document.getElementById('top-albums'),
            
            audioPlayer: document.getElementById('audio-player'),
            exportCanvas: document.getElementById('export-canvas'),
            
            overlay: document.getElementById('overlay'),
            overlayMessage: document.getElementById('overlay-message')
        };
        
        this.currentlyPlaying = null;
        
        // Validate critical elements
        this.validateElements();
        
        // Initialize YouTube preview after a delay
        setTimeout(() => {
            if (typeof YouTubePreview !== 'undefined') {
                this.youtubePreview = new YouTubePreview();
            }
        }, 1000);
    }
    
    validateElements() {
        const criticalElements = [
            'startButton',
            'currentComparison',
            'progressFill',
            'songCards.a.container',
            'songCards.b.container'
        ];
        
        let hasErrors = false;
        criticalElements.forEach(path => {
            const element = path.includes('.') 
                ? path.split('.').reduce((obj, key) => obj?.[key], this.elements)
                : this.elements[path];
                
            if (!element) {
                hasErrors = true;
            }
        });
        
        if (!hasErrors) {
        }
        
        return !hasErrors;
    }
    
    showScreen(screenName) {
        
        if (!this.screens[screenName]) {
            return;
        }
        
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.style.display = 'none';
                screen.classList.remove('active');
            }
        });
        
        // Show the requested screen
        this.screens[screenName].style.display = 'block';
        this.screens[screenName].classList.add('active');
        
        // Safari fix: Force progress bar initialization when showing comparison screen
        if (screenName === 'comparison') {
            setTimeout(() => {
                const progressFill = document.getElementById('progress-fill');
                const progressIndicator = document.getElementById('progress-indicator');
                if (progressFill && progressIndicator) {
                    // Force Safari to recognize the elements
                    const currentWidth = progressFill.style.width || '0%';
                    const currentLeft = progressIndicator.style.left || '0%';
                    
                    // Force reflow
                    progressFill.style.display = 'none';
                    progressIndicator.style.display = 'none';
                    void progressFill.offsetHeight;
                    void progressIndicator.offsetHeight;
                    progressFill.style.display = '';
                    progressIndicator.style.display = '';
                    
                    // Reapply values
                    progressFill.style.width = currentWidth;
                    progressIndicator.style.left = currentLeft;
                }
            }, 50);
        }
        
        // Handle auto-scroll on mobile
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                if (screenName === 'comparison') {
                    const firstCard = document.querySelector('#song-a');
                    if (firstCard) {
                        const header = document.querySelector('.comparison-header');
                        const headerHeight = header ? header.offsetHeight : 0;
                        window.scrollTo({ top: headerHeight + 10, behavior: 'smooth' });
                    }
                } else if (screenName === 'results') {
                    const hallOfFame = document.querySelector('.results-header h1');
                    if (hallOfFame) {
                        hallOfFame.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }, 100);
        }
        
        // Handle back button visibility
        const backButton = document.getElementById('back-button');
        if (backButton) {
            const isMobile = window.innerWidth <= 768;
            // Hide back button on landing and results screens
            if (screenName === 'landing' || screenName === 'results') {
                backButton.classList.remove('visible');
            } else if (screenName === 'comparison' && window.backButtonManager) {
                // On mobile, only show back button after at least 2 comparisons
                const minHistory = isMobile ? 2 : 1;
                if (window.backButtonManager.history.length >= minHistory) {
                    backButton.classList.add('visible');
                }
            }
        }
    }
    
    updateProgressBar(current, total, completedComparisons = null) {
        // Update comparison count
        this.elements.currentComparison.textContent = current;
        
        // Safari fix: Force DOM update
        if (window.safari || /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
            // Force Safari to recognize the text change
            this.elements.currentComparison.style.display = 'none';
            void this.elements.currentComparison.offsetHeight;
            this.elements.currentComparison.style.display = '';
        }
        
        // Update milestone progress
        this.updateMilestoneProgress(current);
        
        // Update show results button based on completed comparisons
        this.updateShowResultsButton(completedComparisons !== null ? completedComparisons : current);
    }
    
    updateMilestoneProgress(current) {
        const milestones = [0, 20, 50, 100];
        const maxMilestone = 100;
        
        // Calculate progress percentage (capped at 100)
        const progressPercentage = Math.min((current / maxMilestone) * 100, 100);
        const progressFill = document.getElementById('progress-fill');
        const progressIndicator = document.getElementById('progress-indicator');
        
        if (progressFill) {
            // Safari fix: Remove and re-add the width to force update
            progressFill.style.width = '';
            // Force layout recalculation
            void progressFill.offsetWidth;
            progressFill.style.width = `${progressPercentage}%`;
            // Force Safari repaint
            progressFill.style.webkitTransform = 'translateZ(0)';
            
            // Additional Safari fix: trigger a reflow
            progressFill.style.display = 'none';
            progressFill.offsetHeight; // Force reflow
            progressFill.style.display = '';
        }
        
        if (progressIndicator) {
            // Safari fix: Remove and re-add the left position
            progressIndicator.style.left = '';
            void progressIndicator.offsetLeft;
            progressIndicator.style.left = `${progressPercentage}%`;
            // Force Safari repaint
            progressIndicator.style.webkitTransform = 'translate(-50%, -50%) translateZ(0)';
        }
        
        // Check for milestone achievements and show messages
        this.checkMilestoneAchievements(current);
        
        // Update milestone states
        const milestoneElements = document.querySelectorAll('.milestone');
        let nextTarget = null;
        
        milestoneElements.forEach((elem, index) => {
            const milestoneValue = milestones[index];
            const icon = elem.querySelector('.milestone-icon');
            
            elem.classList.remove('unlocked', 'achieved', 'next-target');
            
            if (current >= milestoneValue && milestoneValue > 0) {
                elem.classList.add('achieved');
                icon.textContent = '✅';
            } else if (current >= milestoneValue && milestoneValue === 0) {
                // Special case for 0 - keep star icon when achieved
                elem.classList.add('achieved');
                // Always keep the star icon for the start milestone
                // Don't change the icon content
            } else if (!nextTarget && milestoneValue > current) {
                nextTarget = milestoneValue;
                elem.classList.add('next-target');
                if (milestoneValue !== 0) {  // Only change icon if not start milestone
                    icon.textContent = '🎯';
                }
            } else {
                if (milestoneValue !== 0) {  // Only change icon if not start milestone
                    icon.textContent = '🔒';
                }
            }
        });
        
        // Update progress message
        const progressMessage = document.getElementById('progress-message');
        if (progressMessage) {
            if (current === 0) {
                progressMessage.textContent = 'Start your journey • 20 comparisons to unlock results';
                progressMessage.classList.remove('unlocked');
            } else if (current < 20) {
                progressMessage.textContent = `Keep going! ${20 - current} more to unlock results`;
                progressMessage.classList.remove('unlocked');
            } else if (current < 50) {
                progressMessage.textContent = 'You can stop anytime • Keep ranking or view your results';
                progressMessage.classList.add('unlocked');
            } else if (current < 100) {
                progressMessage.textContent = 'Power ranker! Keep going or view your results';
                progressMessage.classList.add('unlocked');
            } else {
                progressMessage.textContent = `${current} comparisons • Continue as long as you want to perfect your rankings`;
                progressMessage.classList.add('unlocked');
            }
        }
    }
    
    checkMilestoneAchievements(current) {
        // Use milestone messages from KanyeMessages
        const milestoneMessages = KanyeMessages.milestones;
        
        // Check for new milestones
        for (const [milestone, message] of Object.entries(milestoneMessages)) {
            const milestoneNum = parseInt(milestone);
            if (current >= milestoneNum && !this.achievedMilestones.has(milestoneNum)) {
                this.achievedMilestones.add(milestoneNum);
                this.showMilestoneNotification(message);
            }
        }
    }
    
    showMilestoneNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'milestone-notification';
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #FFD93D 0%, #FF8E53 100%);
            color: #000;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideInDown 0.5s ease-out;
        `;
        
        // Add animation keyframes if not already present
        if (!document.querySelector('#milestone-animations')) {
            const style = document.createElement('style');
            style.id = 'milestone-animations';
            style.textContent = `
                @keyframes slideInDown {
                    from {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutUp {
                    from {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                    to {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutUp 0.5s ease-in';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 4000);
    }
    
    updateShowResultsButton(currentComparisons) {
        const minComparisons = 20;
        const showResultsBtn = this.elements.showResultsButton;
        const lockIcon = showResultsBtn.querySelector('.btn-lock-icon');
        const btnText = showResultsBtn.querySelector('.btn-text');
        
        // Safari fix: Log current state for debugging
        
        if (currentComparisons < minComparisons) {
            // Keep button visible but locked
            showResultsBtn.disabled = true;
            showResultsBtn.classList.add('btn-locked');
            showResultsBtn.classList.remove('unlock-animation');
            if (lockIcon) lockIcon.style.display = 'inline-block';
            showResultsBtn.title = `Complete ${minComparisons - currentComparisons} more comparisons to unlock`;
        } else {
            // Unlock the button
            if (showResultsBtn.disabled) {
                // First time unlocking - add animation
                showResultsBtn.classList.add('unlock-animation');
                setTimeout(() => {
                    showResultsBtn.classList.remove('unlock-animation');
                }, 600);
            }
            
            showResultsBtn.disabled = false;
            showResultsBtn.classList.remove('btn-locked');
            if (lockIcon) lockIcon.style.display = 'none';
            showResultsBtn.title = 'Show your results';
            
            // Safari fix: Force button state update
            if (window.safari || /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                showResultsBtn.style.opacity = '0.99';
                void showResultsBtn.offsetHeight;
                showResultsBtn.style.opacity = '';
            }
        }
    }
    
    displayComparison(songA, songB, albumsMap) {
        
        try {
            const albumA = albumsMap.get(songA.albumId);
            const albumB = albumsMap.get(songB.albumId);
            
            
            // Ensure the comparison screen is visible
            if (!this.screens.comparison.classList.contains('active')) {
            }
            
            try {
                this.updateSongCard('a', songA, albumA);
            } catch (error) {
            }
            
            try {
                this.updateSongCard('b', songB, albumB);
            } catch (error) {
            }
            
        } catch (error) {
            this.showError('Failed to display songs. Please refresh and try again.');
        }
    }
    
    updateSongCard(side, song, album) {
        const card = this.elements.songCards[side];
        
        if (!card) {
            return;
        }
        
        if (!card.title || !card.album || !card.year || !card.albumArt) {
            console.error(`Missing elements for card ${side}:`, {
                title: !!card.title,
                album: !!card.album,
                year: !!card.year,
                albumArt: !!card.albumArt
            });
            return;
        }
        
        // Censor specific titles for display
        const displayTitle = KanyeUtils.getCensoredTitle(song.title);
        card.title.textContent = displayTitle || 'Unknown Title';
        
        // Display "Vultures" instead of "Vultures 1" for better UX
        const displayAlbumName = album?.name === 'Vultures 1' ? 'Vultures' : (album ? album.name : 'Unknown Album');
        card.album.textContent = displayAlbumName;
        
        card.year.textContent = album ? `(${album.year})` : '';
        
        // Reset image handlers
        card.albumArt.onerror = null;
        
        let albumArtPath = 'assets/album-covers/placeholder.svg';
        if (album && album.coverArt) {
            albumArtPath = `assets/album-covers/${album.coverArt}`;
        }
        
        
        // Set up error handler first
        card.albumArt.onerror = function() {
            this.onerror = null; // Prevent infinite loop
            this.src = 'assets/album-covers/placeholder.svg';
            this.style.backgroundColor = '#f0f0f0';
        };
        
        // Add onload handler to confirm successful loads
        card.albumArt.onload = function() {
        };
        
        // Special handling for Vultures albums - set background first
        if (album && (album.name === 'Vultures 1' || album.name === 'Vultures 2')) {
            card.albumArt.style.backgroundColor = '#000';
        }
        
        // Then set the source
        card.albumArt.src = albumArtPath;
        card.albumArt.alt = album ? `${album.name} album cover` : 'Album cover';
        
        // Determine artist name based on album
        let artistName = 'Kanye West';
        if (album) {
            if (album.name === 'Vultures 1' || album.name === 'Vultures 2') {
                artistName = '¥$';
            } else if (album.name === 'Kids See Ghosts') {
                artistName = 'Kids See Ghosts';
            }
        }
        
        // Set YouTube URL
        if (card.youtubeLink) {
            const youtubeQuery = encodeURIComponent(`${song.title} ${artistName}`);
            card.youtubeLink.href = `https://www.youtube.com/results?search_query=${youtubeQuery}`;
        } else {
        }
        
        
        // Check if we have a direct Genius URL for this song
        if (card.lyricsLink) {
            // Debug: log what we're looking for
            
            // Try case-sensitive first, then case-insensitive lookup
            let directGeniusUrl = null;
            if (window.lyricsLinks) {
                directGeniusUrl = KanyeUtils.getCaseInsensitiveValue(window.lyricsLinks, song.title);
            }
            
            if (directGeniusUrl) {
                card.lyricsLink.href = directGeniusUrl;
            } else {
                // Fallback to search if no direct URL
                const lyricsQuery = encodeURIComponent(`${song.title} ${artistName}`);
                card.lyricsLink.href = `https://genius.com/search?q=${lyricsQuery}`;
            }
        } else {
        }
        
        if (card.previewBtn) {
            // Always apply album-specific colors first
            if (window.getAlbumColors) {
                const albumColors = window.getAlbumColors(song.albumId);
                card.previewBtn.style.setProperty('background-color', albumColors.primary, 'important');
                card.previewBtn.style.setProperty('color', albumColors.text, 'important');
                card.previewBtn.style.setProperty('border-color', albumColors.primary, 'important');
                card.previewBtn.style.setProperty('border', `2px solid ${albumColors.primary}`, 'important');
                
                // Add hover effect with inline style
                card.previewBtn.onmouseenter = function() {
                    this.style.setProperty('background-color', albumColors.secondary, 'important');
                    this.style.setProperty('border-color', albumColors.secondary, 'important');
                };
                card.previewBtn.onmouseleave = function() {
                    this.style.setProperty('background-color', albumColors.primary, 'important');
                    this.style.setProperty('border-color', albumColors.primary, 'important');
                };
            }
            
            
            // Check if we have a YouTube video ID for this song
            let videoId = null;
            if (window.videoLinks && window.videoLinks.videoIds) {
                videoId = KanyeUtils.getCaseInsensitiveValue(window.videoLinks.videoIds, song.title);
            }
            
            if (videoId) {
                card.previewBtn.dataset.videoId = videoId;
                card.previewBtn.classList.remove('disabled');
                card.previewBtn.classList.add('has-preview');  // Add this class for YouTube preview fallback
                card.previewBtn.textContent = '▶ Preview';
            } else {
                delete card.previewBtn.dataset.videoId;
                card.previewBtn.classList.add('disabled');
                card.previewBtn.classList.remove('has-preview');  // Remove this class
                card.previewBtn.textContent = 'No Preview';
            }
        } else {
        }
        
        // Apply album-specific colors to lyrics link (always, not just when preview exists)
        if (card.lyricsLink && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(song.albumId);
            card.lyricsLink.style.setProperty('background-color', 'transparent', 'important');
            card.lyricsLink.style.setProperty('color', albumColors.tertiary || albumColors.primary, 'important');
            card.lyricsLink.style.setProperty('border', `2px solid ${albumColors.tertiary || albumColors.primary}`, 'important');
            
            // Add hover effect
            card.lyricsLink.onmouseenter = function() {
                this.style.setProperty('background-color', albumColors.tertiary || albumColors.primary, 'important');
                this.style.setProperty('color', '#FFFFFF', 'important');
                this.style.setProperty('transform', 'translateY(-1px)', 'important');
                this.style.setProperty('box-shadow', `0 4px 12px ${albumColors.tertiary || albumColors.primary}40`, 'important');
            };
            card.lyricsLink.onmouseleave = function() {
                this.style.setProperty('background-color', 'transparent', 'important');
                this.style.setProperty('color', albumColors.tertiary || albumColors.primary, 'important');
                this.style.setProperty('transform', 'none', 'important');
                this.style.setProperty('box-shadow', 'none', 'important');
            };
        }
        
        if (card.chooseBtn) {
            card.chooseBtn.dataset.songId = song.id;
        } else {
        }
        
        if (card.container) {
            card.container.classList.remove('fade-in');
            void card.container.offsetWidth;
            card.container.classList.add('fade-in');
        } else {
        }
        
        // Attach YouTube preview hover listeners
        if (this.youtubePreview) {
            this.youtubePreview.attachHoverListeners(card.container, song.title, album ? album.name : '');
        }
        
        // Force YouTube preview system to update
        if (window.youtubePreviewFallback && typeof window.youtubePreviewFallback.markPreviewableSongs === 'function') {
            setTimeout(() => {
                window.youtubePreviewFallback.markPreviewableSongs();
            }, 50);
        }
    }
    
    displayResults(topSongs, topAlbums, albumsMap) {
        this.elements.topSongs.innerHTML = '';
        this.elements.topAlbums.innerHTML = '';
        
        topSongs.forEach((song, index) => {
            const album = albumsMap.get(song.albumId);
            const resultItem = this.createResultItem(index + 1, song, album, true);
            this.elements.topSongs.appendChild(resultItem);
        });
        
        topAlbums.forEach((album, index) => {
            const resultItem = this.createAlbumResultItem(index + 1, album);
            this.elements.topAlbums.appendChild(resultItem);
        });
    }
    
    createResultItem(rank, song, album, showRating = true) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        const albumArtPath = album && album.coverArt 
            ? `assets/album-covers/${album.coverArt}` 
            : 'assets/album-covers/placeholder.svg';
        
        // Get video ID for preview - videos are keyed by song title
        const videoId = window.videoLinks && window.videoLinks.videoIds && window.videoLinks.videoIds[song.title] 
            ? window.videoLinks.videoIds[song.title] 
            : null;
        
        // Get lyrics URL - lyrics are keyed by song title
        const lyricsUrl = window.lyricsLinks && window.lyricsLinks[song.title]
            ? window.lyricsLinks[song.title]
            : null;
        
        // Censor specific titles for display
        const displayTitle = KanyeUtils.getCensoredTitle(song.title);
        
        div.innerHTML = `
            <div class="result-rank">#${rank}</div>
            <img class="result-album-art" src="${albumArtPath}" alt="${album ? album.name : 'Album'} album cover" onerror="this.onerror=null; this.src='assets/album-covers/placeholder.svg';">
            <div class="result-info">
                <div class="result-title">${displayTitle}</div>
                <div class="result-album">${album ? album.name : ''}</div>
            </div>
            <div class="result-actions">
                <button class="btn-small preview-btn ${videoId ? 'has-preview' : ''}" 
                        data-video-id="${videoId || ''}"
                        data-album-id="${song.albumId || ''}"
                        ${!videoId ? 'disabled' : ''}>
                    ▶ Preview
                </button>
                <a class="btn-small lyrics-btn" 
                   href="${lyricsUrl || '#'}"
                   target="_blank"
                   ${!lyricsUrl ? 'style="pointer-events: none; opacity: 0.5;"' : ''}>
                    Lyrics
                </a>
            </div>
        `;
        
        // Apply album-specific colors to preview button
        const previewBtn = div.querySelector('.preview-btn');
        if (previewBtn && !previewBtn.disabled && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(song.albumId);
            previewBtn.style.setProperty('background-color', albumColors.primary, 'important');
            previewBtn.style.setProperty('color', albumColors.text, 'important');
            previewBtn.style.setProperty('border-color', albumColors.primary, 'important');
            previewBtn.style.setProperty('border', `2px solid ${albumColors.primary}`, 'important');
            
            // Add hover effect with inline style
            previewBtn.onmouseenter = function() {
                this.style.setProperty('background-color', albumColors.secondary, 'important');
                this.style.setProperty('border-color', albumColors.secondary, 'important');
                this.style.setProperty('transform', 'translateY(-1px)', 'important');
                this.style.setProperty('box-shadow', `0 4px 12px ${albumColors.secondary}40`, 'important');
            };
            previewBtn.onmouseleave = function() {
                this.style.setProperty('background-color', albumColors.primary, 'important');
                this.style.setProperty('border-color', albumColors.primary, 'important');
                this.style.setProperty('transform', 'none', 'important');
                this.style.setProperty('box-shadow', 'none', 'important');
            };
        }
        
        // Apply album-specific colors to lyrics button
        const lyricsBtn = div.querySelector('.lyrics-btn');
        if (lyricsBtn && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(song.albumId);
            if (!lyricsBtn.style.pointerEvents || lyricsBtn.style.pointerEvents !== 'none') {
                lyricsBtn.style.setProperty('background-color', 'transparent', 'important');
                lyricsBtn.style.setProperty('color', albumColors.tertiary || albumColors.primary, 'important');
                lyricsBtn.style.setProperty('border', `2px solid ${albumColors.tertiary || albumColors.primary}`, 'important');
                
                // Add hover effect
                lyricsBtn.onmouseenter = function() {
                    this.style.setProperty('background-color', albumColors.tertiary || albumColors.primary, 'important');
                    this.style.setProperty('color', '#FFFFFF', 'important');
                    this.style.setProperty('transform', 'translateY(-1px)', 'important');
                    this.style.setProperty('box-shadow', `0 4px 12px ${albumColors.tertiary || albumColors.primary}40`, 'important');
                };
                lyricsBtn.onmouseleave = function() {
                    this.style.setProperty('background-color', 'transparent', 'important');
                    this.style.setProperty('color', albumColors.tertiary || albumColors.primary, 'important');
                    this.style.setProperty('transform', 'none', 'important');
                    this.style.setProperty('box-shadow', 'none', 'important');
                };
            }
        }
        
        // The preview system uses a global click handler that looks for .preview-btn
        // and gets the song title from the result item, so we don't need a custom handler
        // Just ensure the song title is accessible
        const titleElement = div.querySelector('.result-title');
        if (titleElement) {
            titleElement.classList.add('song-title'); // Add class for preview system
        }
        
        return div;
    }
    
    createAlbumResultItem(rank, albumData) {
        const div = document.createElement('div');
        div.className = 'result-item';
        
        const albumArtPath = albumData.album.coverArt 
            ? `assets/album-covers/${albumData.album.coverArt}` 
            : 'assets/album-covers/placeholder.jpg';
        
        div.innerHTML = `
            <div class="result-rank">#${rank}</div>
            <img class="result-album-art" src="${albumArtPath}" alt="${albumData.album.name} album cover">
            <div class="result-info">
                <div class="result-title">${albumData.album.name}</div>
                <div class="result-album">${albumData.album.year}</div>
            </div>
        `;
        
        return div;
    }
    
    showOverlay(message = 'Loading...') {
        // Overlay disabled for now
    }
    
    hideOverlay() {
        // Overlay disabled for now
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    }
    
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #44ff44;
            color: #333;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => successDiv.remove(), 300);
        }, 3000);
    }
    
    showWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.textContent = message;
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FFA500;
            color: #333;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(warningDiv);
        
        setTimeout(() => {
            warningDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => warningDiv.remove(), 300);
        }, 3000);
    }
    
    disableComparisonButtons() {
        this.elements.songCards.a.chooseBtn.disabled = true;
        this.elements.songCards.b.chooseBtn.disabled = true;
        this.elements.skipButton.disabled = true;
    }
    
    enableComparisonButtons() {
        this.elements.songCards.a.chooseBtn.disabled = false;
        this.elements.songCards.b.chooseBtn.disabled = false;
        this.elements.skipButton.disabled = false;
    }
}

// Make class available globally
window.UI = UI;