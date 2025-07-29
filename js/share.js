class KanyeRankerShare {
    constructor() {
        this.appUrl = window.location.origin + window.location.pathname;
    }
    
    init(app) {
        this.app = app;
        this.initEventListeners();
    }
    
    initEventListeners() {
        const shareTwitterBtn = document.getElementById('share-twitter');
        const shareFacebookBtn = document.getElementById('share-facebook');
        const shareWhatsappBtn = document.getElementById('share-whatsapp');
        const shareInstagramBtn = document.getElementById('share-instagram');
        const shareLinkBtn = document.getElementById('share-link');
        
        if (shareTwitterBtn) {
            shareTwitterBtn.addEventListener('click', () => this.shareToTwitter());
        }
        
        if (shareFacebookBtn) {
            shareFacebookBtn.addEventListener('click', () => this.shareToFacebook());
        }
        
        if (shareWhatsappBtn) {
            shareWhatsappBtn.addEventListener('click', () => this.shareToWhatsApp());
        }
        
        if (shareInstagramBtn) {
            shareInstagramBtn.addEventListener('click', () => this.shareToInstagram());
        }
        
        if (shareLinkBtn) {
            shareLinkBtn.addEventListener('click', () => this.copyShareLink());
        }
    }
    
    getShareText() {
        const topSongs = this.app.getTopSongs();
        const topThree = topSongs.slice(0, 3);
        
        // Use Kanye-themed share messages if available
        if (window.KanyeMessages) {
            const shareMessage = KanyeMessages.getRandomMessage('share');
            let text = shareMessage + "\n\n";
            topThree.forEach((song, index) => {
                text += `${index + 1}. ${song.title}\n`;
            });
            text += "\n🌊 Ride the wave at";
            return text;
        }
        
        // Fallback message
        let text = "My Top 3 Kanye Songs:\n";
        topThree.forEach((song, index) => {
            text += `${index + 1}. ${song.title}\n`;
        });
        text += "\nFind your top Kanye songs at";
        
        return text;
    }
    
    getShareUrl() {
        const topSongs = this.app.getTopSongs();
        const songIds = topSongs.map(song => song.id).slice(0, 10);
        const encoded = btoa(JSON.stringify(songIds));
        return `${this.appUrl}#results=${encoded}`;
    }
    
    shareToTwitter() {
        const text = this.getShareText();
        const url = this.getShareUrl();
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    }
    
    shareToFacebook() {
        const url = this.getShareUrl();
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'width=550,height=420');
    }
    
    shareToWhatsApp() {
        const text = this.getShareText();
        const url = this.getShareUrl();
        const whatsappText = `${text} ${url}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    async copyShareLink() {
        const url = this.getShareUrl();
        try {
            await navigator.clipboard.writeText(url);
            this.showToast('Link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy link:', err);
            this.showToast('Failed to copy link', 'error');
        }
    }
    
    async shareToInstagram() {
        // Check if we're on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (!isMobile) {
            this.showToast('Instagram Stories can only be shared from mobile devices. Please open this site on your phone.', 'info');
            return;
        }
        
        // Check if Web Share API is available
        if (!navigator.share || !navigator.canShare) {
            this.showToast('Your browser doesn\'t support sharing to Instagram. Try using Safari on iOS or Chrome on Android.', 'error');
            return;
        }
        
        try {
            // Generate the image
            const exporter = new KanyeRankerExport();
            const canvas = document.getElementById('export-canvas');
            const topSongs = this.app.getTopSongs();
            const albumsMap = this.app.albums;
            
            // Generate the image on canvas (skip automatic download)
            await exporter.generateSongsImage(topSongs, albumsMap, canvas, true);
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            
            // Create a File object from the blob
            const file = new File([blob], 'kanye-ranker-top10.png', {
                type: 'image/png',
                lastModified: new Date().getTime()
            });
            
            // Prepare share data with only files (no text or title)
            const shareData = {
                files: [file]
            };
            
            // Check if we can share files
            if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
                this.showToast('Image shared successfully!');
            } else {
                throw new Error('Cannot share files on this device');
            }
        } catch (err) {
            console.error('Failed to share to Instagram:', err);
            
            // If sharing failed, fall back to downloading the image
            if (err.name !== 'AbortError') { // User didn't cancel
                this.showToast('Unable to share directly. The image has been downloaded - you can manually share it to Instagram.', 'info');
                // The image is already downloaded by generateSongsImage
            }
        }
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    async generateShareImage() {
        const exporter = new KanyeRankerExport();
        const canvas = document.getElementById('export-canvas');
        const topSongs = this.app.getTopSongs();
        const albumsMap = this.app.albums;
        
        await exporter.generateSongsImage(topSongs, albumsMap, canvas);
    }
    
    parseShareUrl() {
        const hash = window.location.hash;
        if (hash.startsWith('#results=')) {
            try {
                const encoded = hash.substring(9);
                const songIds = JSON.parse(atob(encoded));
                return songIds;
            } catch (err) {
                console.error('Failed to parse share URL:', err);
                return null;
            }
        }
        return null;
    }
    
    async displaySharedResults(songIds) {
        if (!songIds || !Array.isArray(songIds)) return;
        
        const songs = [];
        for (const id of songIds) {
            const song = this.app.songs.find(s => s.id === id);
            if (song) {
                songs.push({
                    ...song,
                    rating: 1500 + (10 - songs.length) * 50
                });
            }
        }
        
        if (songs.length > 0) {
            const albumStats = this.app.calculateAlbumStats(songs);
            const topAlbums = Array.from(albumStats.values())
                .sort((a, b) => b.averageRating - a.averageRating)
                .slice(0, 5);
            
            this.app.ui.displayResults(songs, topAlbums, this.app.albums);
            this.app.ui.showScreen('results');
            
            const sharedNotice = document.createElement('div');
            sharedNotice.className = 'shared-notice';
            sharedNotice.textContent = 'Viewing shared results';
            document.getElementById('results-screen').insertBefore(
                sharedNotice,
                document.getElementById('results-screen').firstChild
            );
        }
    }
}

window.KanyeRankerShare = KanyeRankerShare;