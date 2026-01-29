// Fallback YouTube Preview System - Simple Click-to-Play
class YouTubePreviewFallback {
    constructor() {
        
        this.currentModal = null;
        this.videoIds = {};
        
        // Check if video data is already loaded
        if (window.videoLinks && window.videoLinks.videoIds) {
            this.videoIds = window.videoLinks.videoIds;
            this.init();
        } else {
            // Load video data from JSON file
            this.loadVideoData().then(() => {
                this.init();
            });
        }
    }
    
    async loadVideoData() {
        try {
            const response = await fetch('data/video-links.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load video data: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.videoIds = data.videoIds || {};
            
            // Only set globally if not already set by video-loader.js
            if (!window.videoLinks) {
                window.videoLinks = {
                    videoIds: this.videoIds
                };
            }
            
        } catch (error) {
            console.error('Failed to load video links:', error);
            // Fallback to empty database if loading fails
            this.videoIds = {};
            
            // Don't show error to user as previews are optional
            if (window.KanyeUtils && window.KanyeUtils.handleError) {
                // Log but don't show to user
                console.warn('Video previews unavailable');
            }
        }
    }
    
    init() {
        // Create modal for video playback
        this.createModal();
        
        // Add CSS for preview buttons
        this.addStyles();
        
        // Listen for preview button clicks
        this.attachGlobalListeners();
        
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .song-card {
                position: relative;
                overflow: visible;
            }
            
            .preview-indicator {
                display: none !important;
            }
            
            .song-card {
                border: 2px solid transparent;
                transition: border-color 0.2s;
            }
            
            .song-card:hover {
                border-color: #ddd;
            }
            
            .btn-choose {
                background: #1db954 !important;
                color: white !important;
                font-size: 16px !important;
                padding: 12px 24px !important;
                margin-top: 15px !important;
                border: none !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
            }
            
            .btn-choose:hover {
                background: #1ed760 !important;
                transform: scale(1.05);
            }
            
            .preview-btn.has-preview {
                background: #ff4444 !important;
                color: white !important;
                cursor: pointer !important;
                font-weight: normal !important;
            }
            
            .preview-btn.has-preview:hover {
                background: #ff0000 !important;
                color: white !important;
            }
            
            .preview-btn:not(.has-preview) {
                background: #e0e0e0 !important;
                color: #666 !important;
                cursor: not-allowed !important;
                font-weight: normal !important;
            }
            
            .preview-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                cursor: pointer;
            }
            
            .preview-modal.active {
                display: flex;
            }
            
            .preview-content {
                position: relative;
                width: 90%;
                max-width: 800px;
                background: #000;
                border-radius: 12px;
                overflow: hidden;
                cursor: default;
            }
            
            .preview-header {
                background: #222;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: white;
            }
            
            .preview-title {
                font-size: 18px;
                font-weight: bold;
            }
            
            .preview-close {
                background: transparent;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0 10px;
                transition: opacity 0.2s;
            }
            
            .preview-close:hover {
                opacity: 0.7;
            }
            
            .preview-video {
                width: 100%;
                aspect-ratio: 16/9;
                background: #000;
            }
            
            .preview-help {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                padding: 20px 30px;
                border-radius: 12px;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                max-width: 400px;
            }
            
            .preview-help h3 {
                margin: 0 0 10px 0;
                color: #000;
            }
            
            .preview-help button {
                margin-top: 15px;
                padding: 10px 20px;
                background: #ff0000;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }
    
    createModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'preview-modal';
        this.modal.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <span class="preview-title"></span>
                    <button class="preview-close">×</button>
                </div>
                <div class="preview-video"></div>
            </div>
        `;
        
        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Close button
        this.modal.querySelector('.preview-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.body.appendChild(this.modal);
        
    }
    
    attachGlobalListeners() {
        // Listen for clicks on preview buttons only
        document.addEventListener('click', (e) => {
            // Handle preview button clicks
            if (e.target.classList.contains('preview-btn') || e.target.closest('.preview-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const songCard = e.target.closest('.song-card') || e.target.closest('.result-item');
                const songTitle = songCard?.querySelector('.song-title')?.textContent || songCard?.querySelector('.result-title')?.textContent;
                const albumName = songCard?.querySelector('.album-name')?.textContent || '';
                
                if (songTitle) {
                    // Track preview click
                    if (window.analytics) {
                        window.analytics.trackSongPreviewed(songTitle, albumName, 'preview_button');
                    }
                    this.playPreview(songTitle);
                }
            }
            
            // Handle preview indicator clicks
            if (e.target.classList.contains('preview-indicator')) {
                e.preventDefault();
                e.stopPropagation();
                
                const songCard = e.target.closest('.song-card') || e.target.closest('.result-item');
                const songTitle = songCard?.querySelector('.song-title')?.textContent || songCard?.querySelector('.result-title')?.textContent;
                const albumName = songCard?.querySelector('.album-name')?.textContent || '';
                
                if (songTitle) {
                    // Track preview click
                    if (window.analytics) {
                        window.analytics.trackSongPreviewed(songTitle, albumName, 'preview_button');
                    }
                    this.playPreview(songTitle);
                }
            }
        });
    }
    
    markPreviewableSongs() {
        const songCards = document.querySelectorAll('.song-card');
        
        // Only log debug info once per session
        if (!this._hasLoggedDebugInfo) {
            
            // Debug: Show some Vultures videos
            const vultureVideos = Object.entries(this.videoIds)
                .filter(([title]) => title.includes('ARNIVAL') || title.includes('arnival'))
                .slice(0, 3);
            this._hasLoggedDebugInfo = true;
        }
        
        songCards.forEach((card, index) => {
            // Remove any previous preview-checked class
            card.classList.remove('preview-checked');
            
            const titleElement = card.querySelector('.song-title');
            if (!titleElement) {
                return;
            }
            
            const songTitle = titleElement.textContent.trim();
            let videoId = KanyeUtils.getCaseInsensitiveValue(this.videoIds, songTitle);
            
            if (videoId) {
                card.classList.add('has-preview');
                
                // Remove any existing indicators
                const existingIndicator = card.querySelector('.preview-indicator');
                if (existingIndicator) existingIndicator.remove();
                
                // Update preview button
                const previewBtn = card.querySelector('.preview-btn');
                if (previewBtn) {
                    // Only update if not already set up correctly
                    if (!previewBtn.classList.contains('has-preview') || previewBtn.textContent.includes('Unavailable')) {
                        previewBtn.classList.remove('disabled');
                        previewBtn.classList.add('has-preview');
                        previewBtn.textContent = '▶ Listen';
                        // Remove any inline styles
                        previewBtn.removeAttribute('style');
                        // Remove any existing onclick to prevent duplicates
                        previewBtn.onclick = null;
                    }
                }
            } else {
                // Only log missing videos if song title exists
                if (songTitle && songTitle.trim()) {
                }
                // Remove preview indicator if no video
                const indicator = card.querySelector('.preview-indicator');
                if (indicator) indicator.remove();
                
                // Update preview button to show unavailable
                const previewBtn = card.querySelector('.preview-btn');
                if (previewBtn) {
                    // Only update if currently showing as available
                    if (previewBtn.classList.contains('has-preview') || !previewBtn.textContent.includes('Unavailable')) {
                        if (songTitle && songTitle.trim()) {
                        }
                        previewBtn.classList.remove('has-preview');
                        previewBtn.classList.add('disabled');
                        previewBtn.textContent = 'Unavailable';
                        // Remove any inline styles
                        previewBtn.removeAttribute('style');
                        previewBtn.onclick = null;
                    }
                }
            }
        });
    }
    
    playPreview(songTitle) {
        try {
            let videoId = KanyeUtils.getCaseInsensitiveValue(this.videoIds, songTitle);
            
            if (!videoId) {
                // Show error message in modal
                this.modal.querySelector('.preview-title').textContent = 'Preview Not Available';
                const videoContainer = this.modal.querySelector('.preview-video');
                videoContainer.innerHTML = `
                    <div style="padding: 50px; text-align: center; color: #999;">
                        <p>Sorry, no preview is available for "${songTitle}"</p>
                    </div>
                `;
                this.modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                return;
            }
            
            // Update modal content
            this.modal.querySelector('.preview-title').textContent = songTitle;
            const videoContainer = this.modal.querySelector('.preview-video');
            
            // Create a container div for the player
            const playerId = `youtube-player-${Date.now()}`;
            videoContainer.innerHTML = `<div id="${playerId}" style="width: 100%; height: 100%;"></div>`;
            
            // Show modal
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Create iframe with autoplay
            videoContainer.innerHTML = `
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
            
        } catch (error) {
            console.error('Failed to play preview:', error);
            this.closeModal();
            
            if (window.KanyeUtils && window.KanyeUtils.handleError) {
                window.KanyeUtils.handleError(error, 'preview', false); // false = don't show to user
            }
        }
    }
    
    closeModal() {
        // Clear iframe to stop video
        this.modal.querySelector('.preview-video').innerHTML = '';
        
        // Hide modal
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
}

// Initialize on load and update when songs are displayed
window.addEventListener('load', () => {
    window.youtubePreviewFallback = new YouTubePreviewFallback();
    
    // Initial marking after a short delay
    setTimeout(() => {
        if (window.youtubePreviewFallback) {
            window.youtubePreviewFallback.markPreviewableSongs();
        }
    }, 500);
    
    // Watch for song cards being added or changed
    const observer = new MutationObserver((mutations) => {
        // Check if any mutations affected song cards
        const hasSongCardChanges = mutations.some(mutation => {
            return mutation.target.classList?.contains('song-card') ||
                   mutation.target.querySelector?.('.song-card') ||
                   Array.from(mutation.addedNodes).some(node => 
                       node.classList?.contains('song-card') || 
                       node.querySelector?.('.song-card')
                   );
        });
        
        if (hasSongCardChanges && window.youtubePreviewFallback) {
            // Debounce to avoid multiple calls
            clearTimeout(window.previewDebounce);
            window.previewDebounce = setTimeout(() => {
                window.youtubePreviewFallback.markPreviewableSongs();
            }, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    // Track last marked song titles to avoid repeated marking
    let lastMarkedSongs = ['', ''];
    
    // Also observe screen changes
    setInterval(() => {
        const comparisonScreen = document.getElementById('comparison-screen');
        if (comparisonScreen && comparisonScreen.classList.contains('active')) {
            const cards = document.querySelectorAll('.song-card');
            if (cards.length === 2) {
                // Check if songs have changed
                const currentSongs = [
                    cards[0].querySelector('.song-title')?.textContent || '',
                    cards[1].querySelector('.song-title')?.textContent || ''
                ];
                
                // Only mark if songs have changed
                if (currentSongs[0] !== lastMarkedSongs[0] || currentSongs[1] !== lastMarkedSongs[1]) {
                    lastMarkedSongs = currentSongs;
                    window.youtubePreviewFallback.markPreviewableSongs();
                }
            }
        }
    }, 1000);
});