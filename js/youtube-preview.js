// YouTube Music Preview System
class YouTubePreview {
    constructor() {
        this.currentPlayer = null;
        this.previewContainer = null;
        this.isPreviewEnabled = true;
        this.previewDelay = 800; // ms before preview starts
        this.hoverTimeout = null;
        this.currentVideoId = null;
        this.playerReady = false;
        
        this.init();
    }
    
    init() {
        console.log('Initializing YouTube Preview system...');
        
        // Create preview container
        this.createPreviewContainer();
        
        // Load YouTube IFrame API
        this.loadYouTubeAPI();
        
        // Add toggle button for preview
        this.addPreviewToggle();
    }
    
    createPreviewContainer() {
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
        closeBtn.onclick = () => this.stopPreview();
        
        this.previewContainer.appendChild(closeBtn);
        document.body.appendChild(this.previewContainer);
        
        // Create player div
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player';
        this.previewContainer.appendChild(playerDiv);
    }
    
    loadYouTubeAPI() {
        // Check if API is already loaded
        if (window.YT && window.YT.Player) {
            this.onYouTubeAPIReady();
            return;
        }
        
        // Load the IFrame Player API code asynchronously
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Set up callback
        window.onYouTubeIframeAPIReady = () => {
            this.onYouTubeAPIReady();
        };
    }
    
    onYouTubeAPIReady() {
        console.log('YouTube API ready');
        this.playerReady = true;
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
            if (!this.isPreviewEnabled) {
                this.stopPreview();
            }
        });
    }
    
    attachHoverListeners(songCard, songTitle, albumName) {
        // Remove any existing listeners
        songCard.removeEventListener('mouseenter', songCard._mouseenterHandler);
        songCard.removeEventListener('mouseleave', songCard._mouseleaveHandler);
        
        // Create new handlers
        songCard._mouseenterHandler = () => {
            if (!this.isPreviewEnabled) return;
            
            // Clear any existing timeout
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
            }
            
            // Start preview after delay
            this.hoverTimeout = setTimeout(() => {
                this.startPreview(songTitle, albumName);
            }, this.previewDelay);
        };
        
        songCard._mouseleaveHandler = () => {
            // Clear timeout if user leaves before preview starts
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
            // Don't stop preview immediately - let user move to player
        };
        
        // Attach new listeners
        songCard.addEventListener('mouseenter', songCard._mouseenterHandler);
        songCard.addEventListener('mouseleave', songCard._mouseleaveHandler);
    }
    
    async startPreview(songTitle, albumName) {
        if (!this.playerReady) {
            console.log('YouTube API not ready yet');
            return;
        }
        
        console.log(`Starting preview for: ${songTitle} - ${albumName}`);
        
        // Search for the song on YouTube
        const searchQuery = `${songTitle} ${albumName} Kanye West official audio`;
        const videoId = await this.searchYouTube(searchQuery);
        
        if (!videoId) {
            console.log('No video found for:', searchQuery);
            return;
        }
        
        // If same video, just show the player
        if (videoId === this.currentVideoId && this.currentPlayer) {
            this.previewContainer.style.display = 'block';
            if (this.currentPlayer.getPlayerState() !== 1) { // Not playing
                this.currentPlayer.playVideo();
            }
            return;
        }
        
        this.currentVideoId = videoId;
        this.previewContainer.style.display = 'block';
        
        // Create or update player
        if (!this.currentPlayer) {
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
                    'iv_load_policy': 3
                },
                events: {
                    'onReady': (event) => {
                        event.target.setVolume(50);
                        event.target.playVideo();
                    },
                    'onError': (error) => {
                        console.error('YouTube player error:', error);
                        this.stopPreview();
                    }
                }
            });
        } else {
            this.currentPlayer.loadVideoById(videoId);
        }
    }
    
    async searchYouTube(query) {
        // For now, we'll use a simple approach - construct a search URL
        // In a production app, you'd use the YouTube Data API
        
        // Common patterns for Kanye songs on YouTube
        const videoIds = {
            // Top songs with known video IDs
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
            "Famous": "p7FCgF_GDWw",
            "I Wonder": "oZMwSgogJJ8",
            "Can't Tell Me Nothing": "E58qN4hi69M",
            "Good Life": "FEKEjpTzB0Q",
            "Ghost Town": "qAsHVwl-MU4",
            "Father Stretch My Hands Pt. 1": "N7s-c4Dze3Q",
            "Father Stretch My Hands, Pt. 1": "N7s-c4Dze3Q",
            "Waves": "3KO3kx38Z-s",
            "Ultralight Beam": "KE2o5AZclaQ",
            "All Falls Down": "8kyMDQxbPxI",
            "Through the Wire": "AE8y25CcE6s",
            "Jesus Walks": "MYF7H_fpc-g",
            "Touch the Sky": "YkwQbuAGLj4",
            "Homecoming": "LQ0uDk-BVkY",
            "Love Lockdown": "HZwMX6T5Jhk",
            "Paranoid": "e8ejqr2vMkI",
            "Amazing": "PH4JPgVD2SM",
            "Monster": "J3af6LQrFu4",
            "Devil in a New Dress": "m5apbOvQltU",
            "Blood on the Leaves": "D0QcxWPBvr0",
            "New Slaves": "dT3swdCJrrg",
            "Hold My Liquor": "4AP8NcW7I1w",
            "I Am a God": "ViGNBLQpGWE",
            "On Sight": "xnrLXDYnS6c",
            "Send It Up": "0wTxqHbJOzg",
            "Yikes": "0WHMTqGLqQo",
            "All Mine": "JpMI4CzAIBo",
            "Violent Crimes": "jPDQYYm-5AY",
            "Follow God": "ivCY3Ec4iaU",
            "Closed on Sunday": "IX7JTmv6TYw",
            "Selah": "qJ5-sR7OLLI",
            "Use This Gospel": "8yQP1Mn1Aq4",
            "Hurricane": "yLx6XrMJvSI",
            "Moon": "Exsrqp80-gY",
            "Praise God": "9sJZOGxRxwM",
            "Off the Grid": "EbDMNjT-QpI",
            "Jail": "U9L29Wa8fqY",
            "Believe What I Say": "3wDt3nggTu8",
            "24": "nojcwom8Yzg",
            "Come to Life": "V5ilCBXnQCY",
            "No Child Left Behind": "gkgY7nCM1to",
            "Carnival": "pz2J1iHPjms",
            "Burn": "Ck4xHocysLw",
            "Vultures": "4p3V3SG1Zgs",
            "Fuk Sumn": "LZQWJYEaau4",
            "Talking": "2W9pGp7cKJI",
            "True Love": "ox0t3CW7hsQ",
            "Niggas in Paris": "gG_dA32oH44",
            "Otis": "BoEKWtgJQAU",
            "No Church in the Wild": "FJt7gNi3Nr4",
            "H•A•M": "UtoHI0JEfDg",
            "Why I Love You": "EgeuHKNWQxc",
            "Murder to Excellence": "eSLe4HuKuK0",
            "Lift Off": "2TMBWAwqz_8",
            "Gotta Have It": "_7o5jnM0uXU"
        };
        
        // Check if we have a known video ID
        const cleanTitle = query.split(' Kanye West')[0].trim();
        const songTitle = cleanTitle.split(' - ')[0].trim();
        
        if (videoIds[songTitle]) {
            return videoIds[songTitle];
        }
        
        // For songs we don't have IDs for, we'd need to use YouTube Data API
        // For now, return null
        console.log('No video ID found for:', songTitle);
        return null;
    }
    
    stopPreview() {
        if (this.currentPlayer) {
            this.currentPlayer.pauseVideo();
        }
        this.previewContainer.style.display = 'none';
        
        // Clear any pending timeouts
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }
    
    destroy() {
        if (this.currentPlayer) {
            this.currentPlayer.destroy();
        }
        if (this.previewContainer) {
            this.previewContainer.remove();
        }
        const toggle = document.getElementById('preview-toggle');
        if (toggle) {
            toggle.remove();
        }
    }
}

// Make it globally available
window.YouTubePreview = YouTubePreview;