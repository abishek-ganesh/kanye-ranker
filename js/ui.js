class UI {
    constructor() {
        console.log('Initializing UI...');
        
        this.screens = {
            landing: document.getElementById('landing-screen'),
            comparison: document.getElementById('comparison-screen'),
            results: document.getElementById('results-screen')
        };
        
        // Initialize YouTube preview system
        this.youtubePreview = null;
        
        // Check if screens exist
        if (!this.screens.landing || !this.screens.comparison || !this.screens.results) {
            console.error('One or more screens not found:', this.screens);
            console.error('Landing screen:', this.screens.landing);
            console.error('Comparison screen:', this.screens.comparison);
            console.error('Results screen:', this.screens.results);
        } else {
            console.log('All screens found successfully');
        }
        
        this.elements = {
            startButton: document.getElementById('start-ranking'),
            skipButton: document.getElementById('skip-comparison'),
            showResultsButton: document.getElementById('show-results'),
            restartButton: document.getElementById('restart'),
            exportSongsImageButton: document.getElementById('export-songs-image'),
            exportAlbumsImageButton: document.getElementById('export-albums-image'),
            
            currentComparison: document.getElementById('current-comparison'),
            totalComparisons: document.getElementById('total-comparisons'),
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
                console.log('YouTube preview system initialized');
            }
        }, 1000);
    }
    
    validateElements() {
        const criticalElements = [
            'startButton',
            'currentComparison',
            'totalComparisons',
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
                console.error(`Critical element missing: ${path}`);
                hasErrors = true;
            }
        });
        
        if (!hasErrors) {
            console.log('All critical UI elements validated successfully');
        }
        
        return !hasErrors;
    }
    
    showScreen(screenName) {
        console.log(`Switching to screen: ${screenName}`);
        
        if (!this.screens[screenName]) {
            console.error(`Screen "${screenName}" not found!`);
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
        console.log(`Screen "${screenName}" is now active`);
        console.log('Active class check:', this.screens[screenName].classList.contains('active'));
        
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
            // Hide back button on landing and results screens
            if (screenName === 'landing' || screenName === 'results') {
                backButton.classList.remove('visible');
            } else if (screenName === 'comparison' && window.backButtonManager && window.backButtonManager.history.length > 0) {
                backButton.classList.add('visible');
            }
        }
        console.log('Display style:', this.screens[screenName].style.display);
    }
    
    updateProgressBar(current, total, completedComparisons = null) {
        this.elements.currentComparison.textContent = current;
        this.elements.totalComparisons.textContent = total;
        const percentage = (current / total) * 100;
        this.elements.progressFill.style.width = `${percentage}%`;
        
        // Update completed comparisons count if provided
        if (completedComparisons !== null && this.elements.completedComparisons) {
            this.elements.completedComparisons.textContent = completedComparisons;
        }
        
        // Update show results button visibility based on completed comparisons
        this.updateShowResultsButton(completedComparisons !== null ? completedComparisons : current);
    }
    
    updateShowResultsButton(currentComparisons) {
        const minComparisons = 20;
        const showResultsBtn = this.elements.showResultsButton;
        
        if (currentComparisons < minComparisons) {
            showResultsBtn.style.display = 'none';
        } else {
            showResultsBtn.style.display = 'block';
            showResultsBtn.disabled = false;
            showResultsBtn.classList.remove('btn-disabled');
            showResultsBtn.textContent = 'I\'m Done - Show Results';
            showResultsBtn.title = 'Show your results';
        }
    }
    
    displayComparison(songA, songB, albumsMap) {
        console.log('displayComparison called with:', songA.title, 'vs', songB.title);
        
        try {
            const albumA = albumsMap.get(songA.albumId);
            const albumB = albumsMap.get(songB.albumId);
            
            console.log('Album A:', albumA);
            console.log('Album B:', albumB);
            
            // Ensure the comparison screen is visible
            if (!this.screens.comparison.classList.contains('active')) {
                console.warn('Comparison screen not active when trying to display comparison');
            }
            
            try {
                this.updateSongCard('a', songA, albumA);
                console.log('Card A updated successfully');
            } catch (error) {
                console.error('Error updating card A:', error);
            }
            
            try {
                this.updateSongCard('b', songB, albumB);
                console.log('Card B updated successfully');
            } catch (error) {
                console.error('Error updating card B:', error);
            }
            
            console.log('Song cards update attempted');
        } catch (error) {
            console.error('Error displaying comparison:', error);
            console.error('Stack trace:', error.stack);
            this.showError('Failed to display songs. Please refresh and try again.');
        }
    }
    
    updateSongCard(side, song, album) {
        console.log(`Starting updateSongCard for side: ${side}`);
        const card = this.elements.songCards[side];
        console.log(`Card object for ${side}:`, card);
        
        if (!card) {
            console.error(`Card object is null/undefined for side ${side}`);
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
        
        console.log(`Setting title for ${side}...`);
        // Censor specific titles for display
        const displayTitle = song.title === "Niggas in Paris" ? "N****s in Paris" : song.title;
        card.title.textContent = displayTitle || 'Unknown Title';
        
        console.log(`Setting album for ${side}...`);
        // Display "Vultures" instead of "Vultures 1" for better UX
        const displayAlbumName = album?.name === 'Vultures 1' ? 'Vultures' : (album ? album.name : 'Unknown Album');
        card.album.textContent = displayAlbumName;
        
        console.log(`Setting year for ${side}...`);
        card.year.textContent = album ? `(${album.year})` : '';
        
        // Reset image handlers
        card.albumArt.onerror = null;
        
        let albumArtPath = 'assets/album-covers/placeholder.svg';
        if (album && album.coverArt) {
            albumArtPath = `assets/album-covers/${album.coverArt}`;
        }
        
        console.log(`Setting album art for ${side}: ${albumArtPath} (Album: ${album?.name})`);
        
        // Set up error handler first
        card.albumArt.onerror = function() {
            console.error(`FAILED to load album art: ${this.src} (Album: ${album?.name})`);
            this.onerror = null; // Prevent infinite loop
            this.src = 'assets/album-covers/placeholder.svg';
            this.style.backgroundColor = '#f0f0f0';
        };
        
        // Add onload handler to confirm successful loads
        card.albumArt.onload = function() {
            console.log(`SUCCESS: Album art loaded: ${this.src} (Album: ${album?.name})`);
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
        console.log(`Setting YouTube link for ${side}...`);
        if (card.youtubeLink) {
            const youtubeQuery = encodeURIComponent(`${song.title} ${artistName}`);
            card.youtubeLink.href = `https://www.youtube.com/results?search_query=${youtubeQuery}`;
        } else {
            console.error(`No youtubeLink for ${side}`);
        }
        
        console.log(`Setting lyrics link for ${side}...`);
        console.log(`Song title: "${song.title}", Artist: "${artistName}"`);
        console.log(`window.lyricsLinks available:`, !!window.lyricsLinks);
        
        // Check if we have a direct Genius URL for this song
        if (card.lyricsLink) {
            // Debug: log what we're looking for
            console.log(`Looking for lyrics link for: "${song.title}"`);
            
            // CRITICAL DEBUG: Check if lyrics are loaded
            if (!window.lyricsLinks) {
                console.error(`❌ CRITICAL: window.lyricsLinks is not loaded!`);
                console.log(`Attempting to check if lyrics-loader.js has run...`);
            } else {
                console.log(`✓ window.lyricsLinks is loaded with ${Object.keys(window.lyricsLinks).length} entries`);
                // Check if our specific song exists
                console.log(`Does "Carnival" exist in lyricsLinks?`, !!window.lyricsLinks["Carnival"]);
                console.log(`First 5 Vultures songs in lyricsLinks:`, 
                    Object.keys(window.lyricsLinks).filter(k => k.includes("ulture")).slice(0, 5));
            }
            
            // Try case-sensitive first, then case-insensitive lookup
            let directGeniusUrl = window.lyricsLinks && window.lyricsLinks[song.title];
            console.log(`Direct lookup result:`, directGeniusUrl);
            
            // If not found, try case-insensitive lookup
            if (!directGeniusUrl && window.lyricsLinks) {
                console.log(`Trying case-insensitive lookup...`);
                
                // Try uppercase version (for Vultures songs)
                const upperTitle = song.title.toUpperCase();
                console.log(`Checking uppercase: "${upperTitle}"`);
                directGeniusUrl = window.lyricsLinks[upperTitle];
                console.log(`Uppercase lookup result:`, directGeniusUrl);
                
                // If still not found, do a case-insensitive search through all keys
                if (!directGeniusUrl) {
                    console.log(`Searching through all keys...`);
                    const titleLower = song.title.toLowerCase();
                    for (const key in window.lyricsLinks) {
                        if (key.toLowerCase() === titleLower) {
                            console.log(`Found match: key="${key}", url="${window.lyricsLinks[key]}"`);
                            directGeniusUrl = window.lyricsLinks[key];
                            break;
                        }
                    }
                }
            }
            
            if (directGeniusUrl) {
                card.lyricsLink.href = directGeniusUrl;
                console.log(`✓ Found direct lyrics URL for "${song.title}": ${directGeniusUrl}`);
            } else {
                // Fallback to search if no direct URL
                const lyricsQuery = encodeURIComponent(`${song.title} ${artistName}`);
                card.lyricsLink.href = `https://genius.com/search?q=${lyricsQuery}`;
                console.log(`✗ No direct lyrics URL found for "${song.title}", using search`);
                console.log(`Search URL: https://genius.com/search?q=${lyricsQuery}`);
            }
        } else {
            console.error(`No lyricsLink for ${side}`);
        }
        
        console.log(`Setting preview button for ${side}...`);
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
            
            console.log(`Looking for video preview for: "${song.title}"`);
            console.log(`window.videoLinks available:`, !!window.videoLinks);
            console.log(`window.videoLinks.videoIds available:`, !!(window.videoLinks && window.videoLinks.videoIds));
            
            // Check if we have a YouTube video ID for this song
            let videoId = window.videoLinks && window.videoLinks.videoIds && window.videoLinks.videoIds[song.title];
            console.log(`Direct lookup for "${song.title}":`, videoId);
            
            // If not found, try case-insensitive lookup (for Vultures songs like CARNIVAL)
            if (!videoId && window.videoLinks && window.videoLinks.videoIds) {
                console.log(`Trying case-insensitive lookup...`);
                
                // Try uppercase version
                const upperTitle = song.title.toUpperCase();
                console.log(`Checking uppercase: "${upperTitle}"`);
                videoId = window.videoLinks.videoIds[upperTitle];
                console.log(`Uppercase lookup result:`, videoId);
                
                // If still not found, do case-insensitive search
                if (!videoId) {
                    console.log(`Searching through all video keys...`);
                    const titleLower = song.title.toLowerCase();
                    for (const key in window.videoLinks.videoIds) {
                        if (key.toLowerCase() === titleLower) {
                            console.log(`Found match: key="${key}", videoId="${window.videoLinks.videoIds[key]}"`);
                            videoId = window.videoLinks.videoIds[key];
                            break;
                        }
                    }
                }
            }
            
            if (videoId) {
                card.previewBtn.dataset.videoId = videoId;
                card.previewBtn.classList.remove('disabled');
                card.previewBtn.classList.add('has-preview');  // Add this class for YouTube preview fallback
                card.previewBtn.textContent = '▶ Preview';
                console.log(`✓ Found video preview for "${song.title}": ${videoId}`);
            } else {
                delete card.previewBtn.dataset.videoId;
                card.previewBtn.classList.add('disabled');
                card.previewBtn.classList.remove('has-preview');  // Remove this class
                card.previewBtn.textContent = 'No Preview';
                console.log(`✗ No video preview found for "${song.title}"`);
            }
        } else {
            console.error(`No previewBtn for ${side}`);
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
        
        console.log(`Setting choose button for ${side}...`);
        if (card.chooseBtn) {
            card.chooseBtn.dataset.songId = song.id;
        } else {
            console.error(`No chooseBtn for ${side}`);
        }
        
        console.log(`Adding fade animation for ${side}...`);
        if (card.container) {
            card.container.classList.remove('fade-in');
            void card.container.offsetWidth;
            card.container.classList.add('fade-in');
        } else {
            console.error(`No container for ${side}`);
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
        const displayTitle = song.title === "Niggas in Paris" ? "N****s in Paris" : song.title;
        
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
    
    async playPreview(spotifyId) {
        if (this.currentlyPlaying) {
            this.stopPreview();
        }
        
        const embedUrl = `https://open.spotify.com/embed/track/${spotifyId}`;
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = embedUrl;
        document.body.appendChild(iframe);
        
        this.currentlyPlaying = iframe;
        
        const previewBtns = document.querySelectorAll('.preview-btn');
        previewBtns.forEach(btn => {
            if (btn.dataset.spotifyId === spotifyId) {
                btn.textContent = '⏸ Stop';
                btn.classList.add('playing');
            }
        });
    }
    
    stopPreview() {
        if (this.currentlyPlaying) {
            this.currentlyPlaying.remove();
            this.currentlyPlaying = null;
            
            const previewBtns = document.querySelectorAll('.preview-btn');
            previewBtns.forEach(btn => {
                btn.textContent = '▶ Preview';
                btn.classList.remove('playing');
            });
        }
    }
    
    showLoading(element) {
        element.classList.add('loading');
    }
    
    hideLoading(element) {
        element.classList.remove('loading');
    }
    
    showOverlay(message = 'Loading...') {
        // Overlay disabled for now
        console.log('Overlay message:', message);
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