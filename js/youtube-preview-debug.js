// YouTube Music Preview System with Enhanced Debugging
class YouTubePreviewDebug {
    constructor() {
        console.log('[YouTube Preview] Initializing...');
        
        this.currentPlayer = null;
        this.previewContainer = null;
        this.isPreviewEnabled = true;
        this.previewDelay = 800;
        this.hoverTimeout = null;
        this.currentVideoId = null;
        this.playerReady = false;
        this.apiLoaded = false;
        this.debugMode = true;
        
        // Track hover events
        this.hoverCount = 0;
        
        this.init();
    }
    
    log(message, data = null) {
        if (this.debugMode) {
            if (data) {
                console.log(`[YouTube Preview] ${message}`, data);
            } else {
                console.log(`[YouTube Preview] ${message}`);
            }
        }
    }
    
    init() {
        this.log('Starting initialization...');
        
        // Create debug panel
        this.createDebugPanel();
        
        // Create preview container
        this.createPreviewContainer();
        
        // Load YouTube IFrame API
        this.loadYouTubeAPI();
        
        // Add toggle button for preview
        this.addPreviewToggle();
        
        // Test with a simple player first
        this.createTestButton();
        
        this.log('Initialization complete');
    }
    
    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'youtube-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-height: 400px;
            overflow-y: auto;
        `;
        panel.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">YouTube Preview Debug</h3>
            <div id="debug-status">
                <p>API Loaded: <span id="api-status">❌</span></p>
                <p>Player Ready: <span id="player-status">❌</span></p>
                <p>Hover Count: <span id="hover-count">0</span></p>
                <p>Current Video: <span id="current-video">None</span></p>
            </div>
            <div id="debug-log" style="margin-top: 10px; border-top: 1px solid #666; padding-top: 10px;">
            </div>
        `;
        document.body.appendChild(panel);
        this.debugPanel = panel;
    }
    
    updateDebugStatus() {
        if (!this.debugPanel) return;
        
        document.getElementById('api-status').textContent = this.apiLoaded ? '✅' : '❌';
        document.getElementById('player-status').textContent = this.playerReady ? '✅' : '❌';
        document.getElementById('hover-count').textContent = this.hoverCount;
        document.getElementById('current-video').textContent = this.currentVideoId || 'None';
    }
    
    addDebugLog(message) {
        const logDiv = document.getElementById('debug-log');
        if (logDiv) {
            const entry = document.createElement('div');
            entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
            entry.style.marginBottom = '5px';
            logDiv.insertBefore(entry, logDiv.firstChild);
            
            // Keep only last 10 entries
            while (logDiv.children.length > 10) {
                logDiv.removeChild(logDiv.lastChild);
            }
        }
    }
    
    createTestButton() {
        const btn = document.createElement('button');
        btn.textContent = 'Test YouTube Player';
        btn.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            padding: 10px 20px;
            background: #ff0000;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        `;
        btn.onclick = () => {
            this.log('Test button clicked');
            this.testPlayer();
        };
        document.body.appendChild(btn);
    }
    
    testPlayer() {
        this.log('Testing player with known video ID...');
        this.addDebugLog('Testing with Stronger video');
        
        // Test with a known working video ID (Stronger)
        this.currentVideoId = 'PsO6ZnUZI0g';
        this.previewContainer.style.display = 'block';
        
        if (!this.currentPlayer) {
            this.createPlayer(this.currentVideoId);
        } else {
            this.currentPlayer.loadVideoById(this.currentVideoId);
        }
    }
    
    createPreviewContainer() {
        this.log('Creating preview container...');
        
        this.previewContainer = document.createElement('div');
        this.previewContainer.id = 'youtube-preview-container';
        this.previewContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            height: 180px;
            background: #000;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: none;
            z-index: 1000;
            overflow: hidden;
            transition: all 0.3s ease;
        `;
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            font-size: 20px;
            cursor: pointer;
            z-index: 1001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.onclick = () => {
            this.log('Close button clicked');
            this.stopPreview();
        };
        
        this.previewContainer.appendChild(closeBtn);
        document.body.appendChild(this.previewContainer);
        
        // Create player div
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player';
        this.previewContainer.appendChild(playerDiv);
        
        this.log('Preview container created');
    }
    
    loadYouTubeAPI() {
        this.log('Loading YouTube API...');
        this.addDebugLog('Loading YouTube API');
        
        // Check if API is already loaded
        if (window.YT && window.YT.Player) {
            this.log('API already loaded');
            this.onYouTubeAPIReady();
            return;
        }
        
        // Create a global callback
        window.onYouTubeIframeAPIReady = () => {
            this.log('YouTube API callback fired');
            this.onYouTubeAPIReady();
        };
        
        // Load the IFrame Player API code asynchronously
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = () => {
            this.log('Failed to load YouTube API script');
            this.addDebugLog('ERROR: Failed to load API');
        };
        tag.onload = () => {
            this.log('YouTube API script loaded');
            this.addDebugLog('API script loaded');
        };
        
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    onYouTubeAPIReady() {
        this.log('YouTube API ready');
        this.apiLoaded = true;
        this.playerReady = true;
        this.updateDebugStatus();
        this.addDebugLog('API ready!');
    }
    
    createPlayer(videoId) {
        this.log('Creating player with video ID:', videoId);
        this.addDebugLog(`Creating player: ${videoId}`);
        
        try {
            this.currentPlayer = new YT.Player('youtube-player', {
                height: '180',
                width: '320',
                videoId: videoId,
                playerVars: {
                    'autoplay': 1,
                    'controls': 1,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'fs': 0,
                    'iv_load_policy': 3,
                    'mute': 0, // Start unmuted (browser may override)
                    'origin': window.location.origin
                },
                events: {
                    'onReady': (event) => {
                        this.log('Player ready');
                        this.addDebugLog('Player ready');
                        event.target.setVolume(70);
                        
                        // Try to play
                        try {
                            event.target.playVideo();
                            this.addDebugLog('Playing video');
                        } catch (e) {
                            this.log('Autoplay failed:', e);
                            this.addDebugLog('Autoplay blocked - click play');
                        }
                    },
                    'onError': (error) => {
                        this.log('YouTube player error:', error);
                        this.addDebugLog(`Error: ${error.data}`);
                        // Error codes: 2 = invalid video ID, 5 = HTML5 error, 100 = video not found, 101/150 = embedding disabled
                    },
                    'onStateChange': (event) => {
                        const states = {
                            '-1': 'unstarted',
                            '0': 'ended',
                            '1': 'playing',
                            '2': 'paused',
                            '3': 'buffering',
                            '5': 'video cued'
                        };
                        this.log('Player state changed:', states[event.data]);
                        this.addDebugLog(`State: ${states[event.data]}`);
                    }
                }
            });
        } catch (error) {
            this.log('Error creating player:', error);
            this.addDebugLog(`Create error: ${error.message}`);
        }
    }
    
    addPreviewToggle() {
        const toggle = document.createElement('div');
        toggle.id = 'preview-toggle';
        toggle.innerHTML = `
            <label style="position: fixed; bottom: 20px; left: 20px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 999; cursor: pointer; user-select: none;">
                <input type="checkbox" id="preview-checkbox" checked style="margin-right: 8px; cursor: pointer;">
                <span style="font-size: 14px; color: #333;">Music Preview on Hover</span>
            </label>
        `;
        document.body.appendChild(toggle);
        
        document.getElementById('preview-checkbox').addEventListener('change', (e) => {
            this.isPreviewEnabled = e.target.checked;
            this.log('Preview enabled:', this.isPreviewEnabled);
            if (!this.isPreviewEnabled) {
                this.stopPreview();
            }
        });
    }
    
    attachHoverListeners(songCard, songTitle, albumName) {
        this.log(`Attaching hover listeners to: ${songTitle}`);
        
        songCard.addEventListener('mouseenter', () => {
            this.hoverCount++;
            this.updateDebugStatus();
            this.log(`Mouse entered: ${songTitle}`);
            this.addDebugLog(`Hover: ${songTitle}`);
            
            if (!this.isPreviewEnabled) {
                this.log('Preview disabled');
                return;
            }
            
            // Clear any existing timeout
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
            }
            
            // Add visual feedback
            songCard.classList.add('preview-loading');
            
            // Start preview after delay
            this.hoverTimeout = setTimeout(() => {
                this.startPreview(songTitle, albumName);
            }, this.previewDelay);
        });
        
        songCard.addEventListener('mouseleave', () => {
            this.log(`Mouse left: ${songTitle}`);
            
            // Clear timeout if user leaves before preview starts
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
            
            // Remove visual feedback
            songCard.classList.remove('preview-loading');
        });
    }
    
    async startPreview(songTitle, albumName) {
        this.log(`Starting preview for: ${songTitle} - ${albumName}`);
        this.addDebugLog(`Start preview: ${songTitle}`);
        
        if (!this.apiLoaded || !this.playerReady) {
            this.log('API not ready', { apiLoaded: this.apiLoaded, playerReady: this.playerReady });
            this.addDebugLog('API not ready yet');
            return;
        }
        
        // Get video ID
        const videoId = this.getVideoId(songTitle);
        
        if (!videoId) {
            this.log('No video ID found for:', songTitle);
            this.addDebugLog(`No video ID: ${songTitle}`);
            return;
        }
        
        this.log('Found video ID:', videoId);
        this.currentVideoId = videoId;
        this.updateDebugStatus();
        
        // Show container
        this.previewContainer.style.display = 'block';
        
        // Create or update player
        if (!this.currentPlayer) {
            this.createPlayer(videoId);
        } else {
            try {
                this.currentPlayer.loadVideoById(videoId);
                this.addDebugLog(`Loading: ${videoId}`);
            } catch (e) {
                this.log('Error loading video:', e);
                this.addDebugLog(`Load error: ${e.message}`);
            }
        }
    }
    
    getVideoId(songTitle) {
        // Map of song titles to YouTube video IDs
        const videoIds = {
            "Heartless": "Co0tTeuUVhU",
            "Stronger": "PsO6ZnUZI0g",
            "Gold Digger": "6vwNcNOTVzY",
            "Power": "L53gjP-TtGE",
            "POWER": "L53gjP-TtGE",
            "Flashing Lights": "ila-hAUXR5U",
            "All of the Lights": "HAfFfqiYLp0",
            "Bound 2": "BBAtAM7vtgc",
            "Black Skinhead": "q604eed4ad0",
            "Runaway": "VhEoCOWUtcU",
            "Through the Wire": "AE8y25CcE6s",
            "Jesus Walks": "MYF7H_fpc-g",
            "All Falls Down": "8kyMDQxbPxI",
            "Can't Tell Me Nothing": "E58qN4hi69M",
            "Good Life": "FEKEjpTzB0Q",
            "I Wonder": "oMwS9DGg8vI"
        };
        
        return videoIds[songTitle] || null;
    }
    
    stopPreview() {
        this.log('Stopping preview');
        this.addDebugLog('Stop preview');
        
        if (this.currentPlayer) {
            try {
                this.currentPlayer.pauseVideo();
            } catch (e) {
                this.log('Error pausing video:', e);
            }
        }
        
        this.previewContainer.style.display = 'none';
        
        // Clear any pending timeouts
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        
        // Remove visual feedback from all cards
        document.querySelectorAll('.preview-loading').forEach(card => {
            card.classList.remove('preview-loading');
        });
    }
}

// Make it globally available
window.YouTubePreviewDebug = YouTubePreviewDebug;