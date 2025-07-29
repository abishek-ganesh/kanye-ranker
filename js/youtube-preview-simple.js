// Simplified YouTube Preview System using direct embeds
class YouTubePreviewSimple {
    constructor() {
        console.log('[YouTube Preview Simple] Initializing...');
        
        this.currentIframe = null;
        this.previewContainer = null;
        this.isPreviewEnabled = true;
        this.previewDelay = 600;
        this.hoverTimeout = null;
        this.currentVideoId = null;
        
        this.init();
    }
    
    init() {
        // Create preview container
        this.createPreviewContainer();
        
        // Add toggle button
        this.addPreviewToggle();
        
        // Add instructions
        this.addInstructions();
        
        console.log('[YouTube Preview Simple] Ready!');
    }
    
    createPreviewContainer() {
        this.previewContainer = document.createElement('div');
        this.previewContainer.id = 'youtube-preview-simple';
        this.previewContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            background: #000;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 10000;
            overflow: hidden;
        `;
        
        // Add header with close button
        const header = document.createElement('div');
        header.style.cssText = `
            background: #222;
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            font-size: 14px;
        `;
        
        const title = document.createElement('span');
        title.textContent = 'Song Preview';
        title.style.fontWeight = 'bold';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: transparent;
            color: white;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 0 5px;
        `;
        closeBtn.onclick = () => this.stopPreview();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        this.previewContainer.appendChild(header);
        
        // Add iframe container
        const iframeContainer = document.createElement('div');
        iframeContainer.id = 'youtube-iframe-container';
        iframeContainer.style.cssText = `
            width: 100%;
            height: 225px;
            background: #000;
        `;
        this.previewContainer.appendChild(iframeContainer);
        
        document.body.appendChild(this.previewContainer);
    }
    
    addInstructions() {
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 0, 0.9);
            color: #333;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1000;
        `;
        instructions.innerHTML = `
            <strong>🎵 Music Preview Active</strong><br>
            <small>Hover over songs to preview them.<br>
            Note: You may need to click play on the first video due to browser autoplay policies.</small>
        `;
        document.body.appendChild(instructions);
        
        // Remove after 10 seconds
        setTimeout(() => instructions.remove(), 10000);
    }
    
    addPreviewToggle() {
        const toggle = document.createElement('div');
        toggle.innerHTML = `
            <label style="position: fixed; bottom: 20px; left: 20px; background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 999; cursor: pointer; display: flex; align-items: center;">
                <input type="checkbox" id="preview-enabled" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                <span style="font-size: 14px; color: #333; font-weight: 500;">🎵 Preview on Hover</span>
            </label>
        `;
        document.body.appendChild(toggle);
        
        document.getElementById('preview-enabled').addEventListener('change', (e) => {
            this.isPreviewEnabled = e.target.checked;
            if (!this.isPreviewEnabled) {
                this.stopPreview();
            }
        });
    }
    
    attachHoverListeners(songCard, songTitle, albumName) {
        // Store song info on the card element
        songCard.dataset.songTitle = songTitle;
        songCard.dataset.albumName = albumName;
        
        songCard.addEventListener('mouseenter', (e) => {
            if (!this.isPreviewEnabled) return;
            
            // Visual feedback
            songCard.style.transform = 'scale(1.02)';
            songCard.style.boxShadow = '0 8px 24px rgba(255, 0, 0, 0.2)';
            
            // Clear existing timeout
            if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
            
            // Start preview after delay
            this.hoverTimeout = setTimeout(() => {
                const title = e.currentTarget.dataset.songTitle;
                const album = e.currentTarget.dataset.albumName;
                this.startPreview(title, album);
            }, this.previewDelay);
        });
        
        songCard.addEventListener('mouseleave', (e) => {
            // Reset visual feedback
            songCard.style.transform = '';
            songCard.style.boxShadow = '';
            
            // Cancel preview if not started
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
        });
    }
    
    startPreview(songTitle, albumName) {
        console.log(`[YouTube Preview] Starting: ${songTitle}`);
        
        const videoId = this.getVideoId(songTitle);
        if (!videoId) {
            console.log('[YouTube Preview] No video ID found for:', songTitle);
            this.showNoPreview(songTitle);
            return;
        }
        
        // Don't reload if same video
        if (videoId === this.currentVideoId && this.currentIframe) {
            this.previewContainer.style.display = 'block';
            return;
        }
        
        this.currentVideoId = videoId;
        this.loadVideo(videoId, songTitle);
    }
    
    loadVideo(videoId, songTitle) {
        const container = document.getElementById('youtube-iframe-container');
        
        // Clear existing iframe
        container.innerHTML = '';
        
        // Create new iframe with autoplay
        this.currentIframe = document.createElement('iframe');
        this.currentIframe.width = '400';
        this.currentIframe.height = '225';
        this.currentIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0`;
        this.currentIframe.frameBorder = '0';
        this.currentIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        this.currentIframe.allowFullscreen = true;
        
        container.appendChild(this.currentIframe);
        
        // Update title
        this.previewContainer.querySelector('span').textContent = `Preview: ${songTitle}`;
        
        // Show container
        this.previewContainer.style.display = 'block';
        
        // Add animation
        this.previewContainer.style.animation = 'slideInRight 0.3s ease-out';
    }
    
    showNoPreview(songTitle) {
        const container = document.getElementById('youtube-iframe-container');
        container.innerHTML = `
            <div style="color: white; text-align: center; padding: 50px 20px;">
                <p style="font-size: 18px; margin-bottom: 10px;">😔 No preview available</p>
                <p style="opacity: 0.7;">"${songTitle}"</p>
                <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(songTitle + ' Kanye West')}" 
                   target="_blank" 
                   style="color: #ff6b6b; text-decoration: none; margin-top: 10px; display: inline-block;">
                   Search on YouTube →
                </a>
            </div>
        `;
        
        this.previewContainer.querySelector('span').textContent = 'No Preview Available';
        this.previewContainer.style.display = 'block';
    }
    
    stopPreview() {
        if (this.currentIframe) {
            // Stop video by clearing src
            this.currentIframe.src = '';
        }
        
        this.previewContainer.style.display = 'none';
        this.previewContainer.style.animation = '';
        
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }
    
    getVideoId(songTitle) {
        // Expanded video ID database
        const videoIds = {
            // Most popular songs
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
            "I Wonder": "oMwSgogJJ8",
            "Can't Tell Me Nothing": "E58qN4hi69M",
            "Good Life": "FEKEjpTzB0Q",
            "Ghost Town": "qAsHVwl-MU4",
            "Father Stretch My Hands, Pt. 1": "wuO4_P_8p-Q",
            "Father Stretch My Hands Pt. 1": "wuO4_P_8p-Q",
            "Waves": "3KO3kx38Z-s",
            "Ultralight Beam": "KE2o5AZclaQ",
            "All Falls Down": "8kyMDQxbPxI",
            "Through the Wire": "AE8y25CcE6s",
            "Jesus Walks": "MYF7H_fpc-g",
            "Touch the Sky": "YkwQbuAGLj4",
            "Homecoming": "LQ0uDk-BVkY",
            "Love Lockdown": "HZwMX6T5Jhk",
            "Paranoid": "iMsN8tcCmMY",
            "Amazing": "PH4JPgVD2SM",
            "Monster": "Oe0qwoedHoQ",
            "Devil in a New Dress": "sk3rpYkiHe8",
            "Blood on the Leaves": "E3bwXDYf0Qc",
            "New Slaves": "dT3swdCJrrg",
            "Hold My Liquor": "bvBfiKHzNzA",
            "I Am a God": "ViGNBLQpGWE",
            "On Sight": "xnrLXDYnS6c",
            "Send It Up": "xVFKG1q5wZQ",
            "Yikes": "hNXMJNsPn2w",
            "All Mine": "PSqKSlC1EHw",
            "Violent Crimes": "aTH8E_ZPiS4",
            "Follow God": "ivCY3Ec4iaU",
            "Closed on Sunday": "IX7JTmv6TYw",
            "Selah": "6Xz5dQsTF8s",
            "Use This Gospel": "8yQP1Mn1Aq4",
            "Hurricane": "nHubI0vvV9E",
            "Moon": "FncI5g7W0ag",
            "Praise God": "9sJZOGxRxwM",
            "Off the Grid": "EbDMNjT-QpI",
            "Jail": "U9L29Wa8fqY",
            "Believe What I Say": "3wDt3nggTu8",
            "24": "SFH0Vkt6J5s",
            "Come to Life": "V5ilCBXnQCY",
            "No Child Left Behind": "gkgY7nCM1to",
            // Additional songs
            "Welcome to Heartbreak": "wGM6N0qXeu4",
            "Street Lights": "bkX9pEa9e0Y",
            "Coldest Winter": "WNxNJFw0YjU",
            "Say You Will": "QHtT8p4Dbqs",
            "See You In My Nightmares": "nCmpJK6KmHg",
            "RoboCop": "P4h0G85pGfc",
            "Bad News": "j_REfcqPnJY",
            "Gorgeous": "lT7W-3SVb2Y",
            "Dark Fantasy": "UTH8CsJ_vKg",
            "Hell of a Life": "1eVPKpBKGCE",
            "Lost in the World": "ofaRvNOV4SI",
            "Who Will Survive in America": "LKXJb_sTr9w",
            "Blame Game": "vt0Diud2Fgk",
            "So Appalled": "0o9mSVpZlLI",
            "Champion": "6I-d0LJ6ojg",
            "Everything I Am": "0Dz88XSSJ0k",
            "The Glory": "SDLnD_1CMJY",
            "Drunk and Hot Girls": "8NV2m2FvcIM",
            "Barry Bonds": "Nvb3PgPXJnA",
            "Big Brother": "j7Yw6KFnVOE",
            "Good Morning": "6CHs4x2uqcQ",
            "I Love Kanye": "Wmp-5cuOrI",
            "Real Friends": "fWD9GF-Ogf4",
            "FML": "JVCM7gCqj2I",
            "Highlights": "jDQ3b1AXBXI",
            "Feedback": "_5L3D62nFZg",
            "Low Lights": "0LMXh5xhQT0",
            "Freestyle 4": "4AhI80d-u5Y",
            "Pt. 2": "eNYF_-mGGUI",
            "Facts (Charlie Heat Version)": "iXGNCD-m9kM",
            "Fade": "_i5K-Wol4LU",
            "Saint Pablo": "K9Sh7If34t8",
            "30 Hours": "YGfO7l6mfcY",
            "No More Parties in LA": "NnMuFqsmBSY",
            "Wolves": "LsA84bXrTZU",
            "Frank's Track": "Ia2GJn-DJlE",
            "Siiiiiiiiilver Surffffeeeeer Intermission": "L0hKOQZdcbI",
            "I Thought About Killing You": "s0MwG9w5a_0",
            "Wouldn't Leave": "VB9VDH5KJlQ",
            "No Mistakes": "H2lmlWT-Luw",
            "Every Hour": "1b7u0xxo2ik",
            "Water": "XC8Z1dZcnBI",
            "God Is": "KNb2WFRHhYI",
            "Hands On": "FaaXZOOchgI",
            "Everything We Need": "TnIzKg4MEL4",
            "Closed On Sunday": "IX7JTmv6TYw",
            "On God": "AHuHePEgLso",
            "Jesus Is Lord": "7GBethq0odI"
        };
        
        return videoIds[songTitle] || null;
    }
}

// Make it globally available
window.YouTubePreviewSimple = YouTubePreviewSimple;