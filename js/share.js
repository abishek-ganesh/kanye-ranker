/**
 * ShareManager - Handles social sharing functionality for Kanye Ranker
 * Supports Twitter/X, WhatsApp, Instagram, Facebook, and link copying
 */
class ShareManager {
    constructor() {
        this.isMobile = this.detectMobile();
        this.canShare = navigator.share !== undefined;
        this.platforms = {
            twitter: {
                name: 'Twitter',
                icon: '𝕏',
                color: '#000000',
                action: 'tweet'
            },
            whatsapp: {
                name: 'WhatsApp',
                icon: '💬',
                color: '#25D366',
                action: 'message'
            },
            instagram: {
                name: 'Instagram',
                icon: '📷',
                color: '#E4405F',
                action: 'share',
                mobileOnly: true
            },
            facebook: {
                name: 'Facebook',
                icon: 'f',
                color: '#1877F2',
                action: 'share'
            },
            copy: {
                name: 'Copy Link',
                icon: '🔗',
                color: '#666666',
                action: 'copy'
            }
        };
        
        // Add native share option for mobile
        if (this.isMobile && this.canShare) {
            this.platforms.native = {
                name: 'Share',
                icon: '📤',
                color: '#007AFF',
                action: 'native'
            };
        }
    }
    
    /**
     * Initialize the share manager with app reference
     */
    init(app) {
        this.app = app;
        console.log('ShareManager initialized with app reference');
        // Will be called when results are shown
    }
    
    /**
     * Detect if user is on mobile device
     */
    detectMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
    
    /**
     * Render share buttons in the results screen
     */
    renderShareButtons() {
        console.log('renderShareButtons called');
        const container = document.getElementById('share-buttons');
        if (!container) {
            console.error('Share buttons container not found');
            return;
        }
        
        // Clear container and ensure it's visible
        container.innerHTML = '';
        container.style.display = 'grid';
        
        // Create buttons for each platform
        Object.entries(this.platforms).forEach(([key, platform]) => {
            // Skip mobile-only platforms on desktop
            if (platform.mobileOnly && !this.isMobile) return;
            
            const button = document.createElement('button');
            button.className = 'share-btn';
            button.setAttribute('data-platform', key);
            button.setAttribute('type', 'button'); // Ensure it's a button
            button.setAttribute('aria-label', `Share on ${platform.name}`);
            
            // Create icon and name spans
            const icon = document.createElement('span');
            icon.className = 'share-icon';
            icon.textContent = platform.icon;
            icon.setAttribute('aria-hidden', 'true');
            
            const name = document.createElement('span');
            name.className = 'share-name';
            name.textContent = platform.name;
            
            button.appendChild(icon);
            button.appendChild(name);
            
            button.addEventListener('click', () => this.share(key));
            container.appendChild(button);
        });
        
        console.log(`Rendered ${container.children.length} share buttons`);
        
        // Force container to be visible after rendering
        container.style.display = 'grid';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        
        // Check final state
        const styles = window.getComputedStyle(container);
        console.log('Container final computed styles:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            children: container.children.length
        });
        
        // Also add event listeners to format radio buttons
        const formatInputs = document.querySelectorAll('input[name="shareFormat"]');
        formatInputs.forEach(input => {
            input.addEventListener('change', () => {
                console.log('Share format changed to:', input.value);
            });
        });
    }
    
    /**
     * Get the selected share format (songs or albums)
     */
    getShareFormat() {
        const formatInput = document.querySelector('input[name="shareFormat"]:checked');
        return formatInput ? formatInput.value : 'songs';
    }
    
    /**
     * Main share method - routes to platform-specific methods
     */
    async share(platform) {
        // Track analytics
        if (window.analytics) {
            window.analytics.trackShareClicked(platform);
        }
        
        const format = this.getShareFormat();
        const url = this.generateShareUrl();
        
        switch(platform) {
            case 'twitter':
                this.shareToTwitter(this.generateShareText('twitter', format), url);
                break;
            case 'whatsapp':
                this.shareToWhatsApp(this.generateShareText('whatsapp', format), url);
                break;
            case 'instagram':
                await this.shareToInstagram(format);
                break;
            case 'facebook':
                this.shareToFacebook(url);
                break;
            case 'copy':
                await this.copyLink(url);
                break;
            case 'native':
                await this.nativeShare(format);
                break;
        }
    }
    
    /**
     * Generate shareable URL
     */
    generateShareUrl() {
        return window.location.origin + window.location.pathname;
    }
    
    /**
     * Generate share text based on platform and format
     */
    generateShareText(platform, format) {
        if (format === 'songs') {
            return this.generateSongShareText(platform);
        } else {
            return this.generateAlbumShareText(platform);
        }
    }
    
    /**
     * Generate song share text
     */
    generateSongShareText(platform) {
        const topSongs = this.app.getTopSongs().slice(0, 10);
        
        switch(platform) {
            case 'twitter':
                // Twitter has character limit, so just top 3
                const top3 = topSongs.slice(0, 3);
                let tweetText = "My top 3 Kanye songs:\n";
                top3.forEach((song, index) => {
                    tweetText += `${index + 1}. ${song.title}\n`;
                });
                tweetText += "\nFind yours at";
                return tweetText;
                
            case 'whatsapp':
                // WhatsApp can handle longer text
                let waText = "🎵 MY TOP 10 KANYE SONGS 🎵\n\n";
                topSongs.forEach((song, index) => {
                    const album = this.app.albums.get(song.albumId);
                    waText += `${index + 1}. ${song.title}`;
                    if (album) {
                        waText += ` (${album.name})`;
                    }
                    waText += '\n';
                });
                waText += "\n🔥 Create your ranking at";
                return waText;
                
            default:
                return "Check out my top Kanye songs!";
        }
    }
    
    /**
     * Generate album share text
     */
    generateAlbumShareText(platform) {
        const topAlbums = this.app.getTopAlbums().slice(0, 5);
        
        switch(platform) {
            case 'twitter':
                let tweetText = "My top Kanye albums:\n";
                topAlbums.slice(0, 3).forEach((albumData, index) => {
                    tweetText += `${index + 1}. ${albumData.album.name}\n`;
                });
                tweetText += "\nRank yours at";
                return tweetText;
                
            case 'whatsapp':
                let waText = "💿 MY TOP KANYE ALBUMS 💿\n\n";
                topAlbums.forEach((albumData, index) => {
                    waText += `${index + 1}. ${albumData.album.name} (${albumData.album.year})\n`;
                });
                waText += "\n🎤 Make your ranking at";
                return waText;
                
            default:
                return "Check out my top Kanye albums!";
        }
    }
    
    /**
     * Share to Twitter/X
     */
    shareToTwitter(text, url) {
        const tweetText = text.substring(0, 250); // Leave room for URL
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    }
    
    /**
     * Share to WhatsApp
     */
    shareToWhatsApp(text, url) {
        const message = `${text} ${url}`;
        const whatsappUrl = this.isMobile 
            ? `whatsapp://send?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    /**
     * Share to Instagram (mobile only)
     */
    async shareToInstagram(format) {
        if (!this.isMobile) {
            this.showToast('Instagram sharing is only available on mobile devices', 'info');
            return;
        }
        
        try {
            // Generate square image
            const imageBlob = await this.generateSquareImage(format);
            
            // Use Web Share API if available
            if (this.canShare && navigator.canShare({ files: [new File([imageBlob], 'kanye-ranking.png', { type: 'image/png' })] })) {
                const file = new File([imageBlob], 'kanye-ranking.png', { type: 'image/png' });
                
                await navigator.share({
                    files: [file]
                });
                
                this.showToast('Select Instagram to share your ranking!');
            } else {
                // Fallback: download image
                this.downloadImage(imageBlob, 'kanye-ranking-square.png');
                this.showToast('Image downloaded! Open Instagram and share from your gallery.', 'info');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Instagram share error:', error);
                this.showToast('Failed to share to Instagram', 'error');
            }
        }
    }
    
    /**
     * Share to Facebook
     */
    shareToFacebook(url) {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(fbUrl, '_blank', 'width=550,height=420');
    }
    
    /**
     * Copy link to clipboard
     */
    async copyLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showToast('Link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy link:', err);
            this.showToast('Failed to copy link', 'error');
        }
    }
    
    /**
     * Native share (mobile)
     */
    async nativeShare(format) {
        if (!this.canShare) {
            this.showToast('Sharing not supported on this device', 'error');
            return;
        }
        
        try {
            const shareData = {
                title: 'My Kanye Ranking',
                text: this.generateShareText('native', format),
                url: this.generateShareUrl()
            };
            
            await navigator.share(shareData);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Native share error:', error);
                this.showToast('Failed to share', 'error');
            }
        }
    }
    
    /**
     * Generate square image for Instagram
     */
    async generateSquareImage(format) {
        const canvas = document.createElement('canvas');
        const exporter = new window.KanyeRankerExport();
        
        if (format === 'songs') {
            const topSongs = this.app.getTopSongs();
            await exporter.generateSquareImage(topSongs, this.app.albums, canvas);
        } else {
            const topAlbums = this.app.getTopAlbums();
            await exporter.generateSquareAlbumsImage(topAlbums, canvas);
        }
        
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/png');
        });
    }
    
    /**
     * Download image blob
     */
    downloadImage(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        // Remove any existing toasts
        const existingToast = document.querySelector('.share-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `share-toast share-toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Make ShareManager available globally
window.ShareManager = ShareManager;