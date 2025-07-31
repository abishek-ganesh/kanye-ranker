class KanyeRankerExport {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        
        // Polyfill for roundRect if not supported
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
                if (width < 2 * radius) radius = width / 2;
                if (height < 2 * radius) radius = height / 2;
                this.beginPath();
                this.moveTo(x + radius, y);
                this.arcTo(x + width, y, x + width, y + height, radius);
                this.arcTo(x + width, y + height, x, y + height, radius);
                this.arcTo(x, y + height, x, y, radius);
                this.arcTo(x, y, x + width, y, radius);
                this.closePath();
                return this;
            };
        }
    }
    
    // Helper function to determine readable text color based on background
    getReadableTextColor(bgColor) {
        // Convert hex to RGB
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return white for dark backgrounds, dark gray for light backgrounds
        return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF';
    }
    
    // Helper function for secondary text color
    getSecondaryTextColor(bgColor) {
        const primaryText = this.getReadableTextColor(bgColor);
        // Return a slightly muted version
        return primaryText === '#FFFFFF' ? '#B0B0B0' : '#666666';
    }
    
    async generateSongsImage(topSongs, albumsMap, canvas, skipDownload = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.canvas.width = 1080;
        this.canvas.height = 1920;
        
        // Get the top song's album for background and colors
        const topAlbumId = topSongs[0]?.albumId;
        this.currentAlbumId = topAlbumId; // Store for use in other methods
        this.drawBackground(topAlbumId);
        this.drawHeader(topAlbumId);
        await this.drawSongList(topSongs, albumsMap);
        this.drawFooter(topAlbumId);
        
        if (!skipDownload) {
            // Track songs export
            if (window.analytics) {
                const topAlbum = albumsMap.get(topSongs[0]?.albumId);
                window.analytics.trackSongsExported(topAlbum?.name || 'Unknown');
            }
            this.downloadImage();
        }
    }
    
    drawBackground(albumId = null) {
        // Get album colors if available
        let bgColor = '#000000';
        let accentColor = '#D4AF37';
        let secondaryColor = '#D4AF37';
        
        if (albumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(albumId);
            bgColor = albumColors.background;
            accentColor = albumColors.primary;
            secondaryColor = albumColors.secondary;
        }
        
        // Album-specific background
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add gradient overlay for depth
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Album-specific patterns
        this.ctx.save();
        
        switch(albumId) {
            case 'cd': // College Dropout - Vintage paper texture
                this.drawVintageTexture(accentColor);
                break;
            case 'lr': // Late Registration - Orchestral waves
                this.drawOrchestralWaves(accentColor, secondaryColor);
                break;
            case 'grad': // Graduation - Futuristic grid
                this.drawFuturisticGrid(accentColor, secondaryColor);
                break;
            case '808s': // 808s - Digital heartbeat lines
                this.drawHeartbeatLines(accentColor);
                break;
            case 'mbdtf': // MBDTF - Baroque gold patterns
                this.drawBaroquePattern(secondaryColor); // Gold
                break;
            case 'wtt': // Watch the Throne - Royal crest pattern
                this.drawRoyalPattern(accentColor);
                break;
            case 'cruel': // Cruel Summer - Diamond pattern
                this.drawDiamondPattern(accentColor);
                break;
            case 'yeezus': // Yeezus - Industrial texture
                this.drawIndustrialTexture(accentColor);
                break;
            case 'tlop': // TLOP - Chaotic paint strokes
                this.drawPaintStrokes(accentColor, secondaryColor);
                break;
            case 'ye': // Ye - Mountain landscape silhouette
                this.drawMountainSilhouette(accentColor);
                break;
            case 'ksg': // Kids See Ghosts - Psychedelic waves
                this.drawPsychedelicWaves(accentColor, secondaryColor);
                break;
            case 'jik': // Jesus Is King - Light rays
                this.drawLightRays(accentColor);
                break;
            case 'donda': // Donda - Minimal dots
                this.drawMinimalDots(accentColor);
                break;
            case 'donda2': // Donda 2 - Digital matrix
                this.drawDigitalMatrix(accentColor);
                break;
            case 'v1': // Vultures 1 - Feather texture
            case 'v2': // Vultures 2 - Feather texture
                this.drawFeatherTexture(accentColor);
                break;
            default: // Default subtle pattern
                this.drawDefaultPattern(accentColor);
        }
        
        this.ctx.restore();
    }
    
    drawHeader(albumId = null) {
        // Get album colors and fonts
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let headerFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (albumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(albumId);
            primaryColor = albumColors.primary;
            // Ensure text is readable on dark backgrounds
            textColor = this.getReadableTextColor(albumColors.background);
            headerFont = albumColors.headerFont || headerFont;
            console.log(`Export using album ${albumId} with font: ${headerFont}`);
        }
        
        this.ctx.fillStyle = textColor;
        this.ctx.font = `bold 72px ${headerFont}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MY TOP 10', this.canvas.width / 2, 120);
        
        this.ctx.fillStyle = primaryColor;
        this.ctx.font = `bold 96px ${headerFont}`;
        this.ctx.fillText('KANYE SONGS', this.canvas.width / 2, 220);
        
        this.ctx.strokeStyle = primaryColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(100, 260);
        this.ctx.lineTo(this.canvas.width - 100, 260);
        this.ctx.stroke();
    }
    
    async drawSongList(topSongs, albumsMap) {
        const startY = 350;
        const itemHeight = 120;
        const padding = 40;
        
        // Get colors and fonts based on top album
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let secondaryTextColor = '#999999';
        let bodyFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (this.currentAlbumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(this.currentAlbumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            secondaryTextColor = this.getSecondaryTextColor(albumColors.background);
            bodyFont = albumColors.bodyFont || bodyFont;
        }
        
        for (let i = 0; i < topSongs.length; i++) {
            const song = topSongs[i];
            const album = albumsMap.get(song.albumId);
            const y = startY + (i * itemHeight);
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.fillRect(padding, y - 45, this.canvas.width - (padding * 2), 100);
            
            this.ctx.fillStyle = primaryColor; // Album color for rank numbers
            this.ctx.font = `bold 64px ${bodyFont}`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`#${i + 1}`, padding + 20, y + 15);
            
            const albumArtSize = 80;
            const albumArtX = padding + 150; // Moved right to avoid overlap with #10
            const albumArtY = y - 40;
            
            // Try to load album artwork
            if (album && album.coverArt) {
                await this.drawAlbumArt(album.coverArt, albumArtX, albumArtY, albumArtSize);
            } else {
                // Fallback placeholder
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(albumArtX, albumArtY, albumArtSize, albumArtSize);
                
                this.ctx.fillStyle = textColor;
                this.ctx.font = '8px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('No Art', albumArtX + albumArtSize/2, albumArtY + albumArtSize/2);
            }
            
            const textX = albumArtX + albumArtSize + 30;
            
            this.ctx.fillStyle = textColor;
            this.ctx.font = `bold 36px ${bodyFont}`;
            this.ctx.textAlign = 'left';
            
            const maxTitleWidth = this.canvas.width - textX - padding - 150;
            // Censor specific titles for display
            const displayTitle = song.title === "Niggas in Paris" ? "N****s in Paris" : song.title;
            const title = this.truncateText(displayTitle, maxTitleWidth);
            this.ctx.fillText(title, textX, y);
            
            // Special handling for Watch the Throne - use black for album text
            if (this.currentAlbumId === 'wtt') {
                this.ctx.fillStyle = '#000000';
            } else {
                this.ctx.fillStyle = secondaryTextColor;
            }
            this.ctx.font = `28px ${bodyFont}`;
            const albumName = album ? this.formatAlbumName(album.name) : 'Unknown Album';
            const albumYear = album ? album.year : '';
            const albumText = albumYear ? `${albumName} (${albumYear})` : albumName;
            const truncatedAlbum = this.truncateText(albumText, maxTitleWidth);
            this.ctx.fillText(truncatedAlbum, textX, y + 35);
            
            // Remove rating display as requested
        }
    }
    
    async drawAlbumArt(coverArtPath, x, y, size) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.ctx.save();
                
                // Draw rounded rectangle clip
                this.ctx.beginPath();
                this.ctx.roundRect(x, y, size, size, 8);
                this.ctx.clip();
                
                // Draw the image
                this.ctx.drawImage(img, x, y, size, size);
                this.ctx.restore();
                resolve();
            };
            
            img.onerror = () => {
                // Fallback on error
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(x, y, size, size);
                resolve();
            };
            
            img.src = `assets/album-covers/${coverArtPath}`;
        });
    }
    
    drawFooter(albumId = null) {
        const footerY = this.canvas.height - 150;
        
        // Get album colors and fonts
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let dateColor = '#666666';
        let headerFont = '"Helvetica Neue", Arial, sans-serif';
        let bodyFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (albumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(albumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            dateColor = this.getSecondaryTextColor(albumColors.background);
            headerFont = albumColors.headerFont || headerFont;
            bodyFont = albumColors.bodyFont || bodyFont;
        }
        
        this.ctx.strokeStyle = primaryColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(100, footerY - 50);
        this.ctx.lineTo(this.canvas.width - 100, footerY - 50);
        this.ctx.stroke();
        
        this.ctx.fillStyle = textColor;
        this.ctx.font = `32px ${bodyFont}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('created with', this.canvas.width / 2, footerY);
        
        this.ctx.fillStyle = primaryColor;
        this.ctx.font = `bold 44px ${headerFont}`;
        this.ctx.fillText('kanyeranker.com', this.canvas.width / 2, footerY + 55);
        
        // Add date
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        this.ctx.fillStyle = textColor;
        this.ctx.font = `24px ${bodyFont}`;
        this.ctx.fillText(date, this.canvas.width / 2, footerY + 95);
    }
    
    truncateText(text, maxWidth) {
        const metrics = this.ctx.measureText(text);
        if (metrics.width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (this.ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        return truncated + '...';
    }
    
    formatAlbumName(albumName) {
        // Use abbreviations for long album names
        const abbreviations = {
            'My Beautiful Dark Twisted Fantasy': 'MBDTF',
            'The College Dropout': 'The College Dropout',
            'Late Registration': 'Late Registration',
            'Graduation': 'Graduation',
            '808s & Heartbreak': '808s & Heartbreak',
            'Watch the Throne': 'Watch the Throne',
            'Cruel Summer': 'Cruel Summer',
            'Yeezus': 'Yeezus',
            'The Life of Pablo': 'The Life of Pablo',
            'Ye': 'Ye',
            'Kids See Ghosts': 'Kids See Ghosts',
            'Jesus Is King': 'Jesus Is King',
            'Donda': 'Donda',
            'Donda 2': 'Donda 2',
            'Vultures 1': 'Vultures 1',
            'Vultures 2': 'Vultures 2'
        };
        
        return abbreviations[albumName] || albumName;
    }
    
    downloadImage(filename = 'kanye-ranker-top10') {
        this.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }
    
    async generateAlbumsImage(topAlbums, canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.canvas.width = 1080;
        this.canvas.height = 1920;
        
        // Get the top album's ID for background and colors
        const topAlbumId = topAlbums[0]?.album?.id;
        this.currentAlbumId = topAlbumId; // Store for use in other methods
        this.drawBackground(topAlbumId);
        this.drawAlbumsHeader(topAlbumId);
        await this.drawAlbumsList(topAlbums);
        this.drawFooter(topAlbumId);
        
        // Track albums export
        if (window.analytics) {
            const topAlbum = topAlbums[0]?.album;
            window.analytics.trackAlbumsExported(topAlbum?.name || 'Unknown');
        }
        
        this.downloadImage('kanye-ranker-top-albums');
    }
    
    drawAlbumsHeader(albumId = null) {
        // Get album colors and fonts
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let headerFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (albumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(albumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            headerFont = albumColors.headerFont || headerFont;
        }
        
        this.ctx.fillStyle = textColor;
        this.ctx.font = `bold 72px ${headerFont}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MY TOP 5', this.canvas.width / 2, 120);
        
        this.ctx.fillStyle = primaryColor;
        this.ctx.font = `bold 96px ${headerFont}`;
        this.ctx.fillText('KANYE ALBUMS', this.canvas.width / 2, 220);
        
        this.ctx.strokeStyle = primaryColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(100, 260);
        this.ctx.lineTo(this.canvas.width - 100, 260);
        this.ctx.stroke();
    }
    
    async drawAlbumsList(topAlbums) {
        const startY = 400;
        const itemHeight = 220;
        const padding = 60;
        
        // Get colors and fonts based on top album
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let secondaryTextColor = '#999999';
        let bodyFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (this.currentAlbumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(this.currentAlbumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            secondaryTextColor = this.getSecondaryTextColor(albumColors.background);
            bodyFont = albumColors.bodyFont || bodyFont;
        }
        
        for (let i = 0; i < topAlbums.length; i++) {
            const albumData = topAlbums[i];
            const album = albumData.album;
            const y = startY + (i * itemHeight);
            
            // Background card
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.fillRect(padding, y - 80, this.canvas.width - (padding * 2), 180);
            
            // Rank
            this.ctx.fillStyle = primaryColor;
            this.ctx.font = `bold 80px ${bodyFont}`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`#${i + 1}`, padding + 30, y + 25);
            
            // Album art
            const albumArtSize = 140;
            const albumArtX = padding + 180;
            const albumArtY = y - 70;
            
            if (album && album.coverArt) {
                await this.drawAlbumArt(album.coverArt, albumArtX, albumArtY, albumArtSize);
            } else {
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(albumArtX, albumArtY, albumArtSize, albumArtSize);
                
                this.ctx.fillStyle = textColor;
                this.ctx.font = '12px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('No Art', albumArtX + albumArtSize/2, albumArtY + albumArtSize/2);
            }
            
            // Album info
            const textX = albumArtX + albumArtSize + 40;
            
            // Album name
            this.ctx.fillStyle = textColor;
            this.ctx.font = `bold 48px ${bodyFont}`;
            this.ctx.textAlign = 'left';
            
            const maxTitleWidth = this.canvas.width - textX - padding - 50;
            const formattedName = this.formatAlbumName(album.name);
            const title = this.truncateText(formattedName, maxTitleWidth);
            this.ctx.fillText(title, textX, y);
            
            // Album year - special handling for Watch the Throne
            if (this.currentAlbumId === 'wtt') {
                this.ctx.fillStyle = '#000000';
            } else {
                this.ctx.fillStyle = secondaryTextColor;
            }
            this.ctx.font = `36px ${bodyFont}`;
            this.ctx.fillText(album.year.toString(), textX, y + 50);
        }
    }
    
    // Pattern drawing methods
    drawVintageTexture(color) {
        this.ctx.globalAlpha = 0.03;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        
        // Draw horizontal lines for paper texture
        for (let y = 0; y < this.canvas.height; y += 4) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawOrchestralWaves(color1, color2) {
        this.ctx.globalAlpha = 0.05;
        
        for (let i = 0; i < 5; i++) {
            const amplitude = 50 + i * 20;
            const frequency = 0.01 - i * 0.002;
            const yOffset = 200 + i * 150;
            
            this.ctx.strokeStyle = i % 2 === 0 ? color1 : color2;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            
            for (let x = 0; x < this.canvas.width; x++) {
                const y = yOffset + Math.sin(x * frequency) * amplitude;
                if (x === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            
            this.ctx.stroke();
        }
    }
    
    drawFuturisticGrid(color1, color2) {
        this.ctx.globalAlpha = 0.1;
        const gridSize = 40;
        
        // Draw grid lines
        this.ctx.strokeStyle = color1;
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Add diagonal accents
        this.ctx.strokeStyle = color2;
        this.ctx.globalAlpha = 0.05;
        this.ctx.lineWidth = 2;
        
        for (let i = -this.canvas.height; i < this.canvas.width; i += gridSize * 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i + this.canvas.height, this.canvas.height);
            this.ctx.stroke();
        }
    }
    
    drawHeartbeatLines(color) {
        this.ctx.globalAlpha = 0.1;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        
        const lineSpacing = 100;
        const segments = 20;
        
        for (let y = lineSpacing; y < this.canvas.height; y += lineSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            
            for (let i = 0; i < segments; i++) {
                const x = (this.canvas.width / segments) * i;
                const nextX = (this.canvas.width / segments) * (i + 1);
                
                if (i % 4 === 2) {
                    // Heartbeat spike
                    this.ctx.lineTo(x + (nextX - x) * 0.3, y);
                    this.ctx.lineTo(x + (nextX - x) * 0.4, y - 30);
                    this.ctx.lineTo(x + (nextX - x) * 0.5, y + 15);
                    this.ctx.lineTo(x + (nextX - x) * 0.6, y);
                    this.ctx.lineTo(nextX, y);
                } else {
                    this.ctx.lineTo(nextX, y);
                }
            }
            
            this.ctx.stroke();
        }
    }
    
    drawBaroquePattern(goldColor) {
        this.ctx.globalAlpha = 0.08;
        this.ctx.fillStyle = goldColor;
        
        // Draw ornate swirls
        const swirls = 15;
        for (let i = 0; i < swirls; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = 80 + Math.random() * 120;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(Math.random() * Math.PI * 2);
            
            // Draw baroque swirl
            this.ctx.beginPath();
            for (let angle = 0; angle < Math.PI * 4; angle += 0.1) {
                const r = size * (angle / (Math.PI * 4));
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                
                if (angle === 0) this.ctx.moveTo(px, py);
                else this.ctx.lineTo(px, py);
            }
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = goldColor;
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    drawRoyalPattern(color) {
        this.ctx.globalAlpha = 0.06;
        this.ctx.fillStyle = color;
        
        // Draw crown/fleur-de-lis inspired shapes
        const pattern = 8;
        const size = this.canvas.width / pattern;
        
        for (let row = 0; row < pattern * 2; row++) {
            for (let col = 0; col < pattern; col++) {
                const x = col * size + (row % 2 === 0 ? 0 : size / 2);
                const y = row * size / 2;
                
                // Simple crown shape
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x - size * 0.3, y + size * 0.3);
                this.ctx.lineTo(x - size * 0.2, y + size * 0.2);
                this.ctx.lineTo(x, y + size * 0.4);
                this.ctx.lineTo(x + size * 0.2, y + size * 0.2);
                this.ctx.lineTo(x + size * 0.3, y + size * 0.3);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    }
    
    drawDiamondPattern(color) {
        this.ctx.globalAlpha = 0.08;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        
        const size = 60;
        for (let row = 0; row < this.canvas.height / size + 1; row++) {
            for (let col = 0; col < this.canvas.width / size + 1; col++) {
                const x = col * size;
                const y = row * size;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x + size / 2, y);
                this.ctx.lineTo(x + size, y + size / 2);
                this.ctx.lineTo(x + size / 2, y + size);
                this.ctx.lineTo(x, y + size / 2);
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
    }
    
    drawIndustrialTexture(color) {
        this.ctx.globalAlpha = 0.1;
        
        // Vertical industrial lines
        for (let x = 0; x < this.canvas.width; x += 20) {
            const width = 2 + Math.random() * 4;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, 0, width, this.canvas.height);
        }
        
        // Horizontal noise bands
        this.ctx.globalAlpha = 0.05;
        for (let y = 0; y < this.canvas.height; y += 100) {
            const height = 20 + Math.random() * 30;
            this.ctx.fillRect(0, y, this.canvas.width, height);
        }
    }
    
    drawPaintStrokes(color1, color2) {
        this.ctx.globalAlpha = 0.06;
        
        // Chaotic paint strokes
        for (let i = 0; i < 20; i++) {
            this.ctx.strokeStyle = i % 2 === 0 ? color1 : color2;
            this.ctx.lineWidth = 10 + Math.random() * 40;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            const startX = Math.random() * this.canvas.width;
            const startY = Math.random() * this.canvas.height;
            this.ctx.moveTo(startX, startY);
            
            // Random bezier curves
            const cp1x = startX + (Math.random() - 0.5) * 400;
            const cp1y = startY + (Math.random() - 0.5) * 400;
            const cp2x = startX + (Math.random() - 0.5) * 400;
            const cp2y = startY + (Math.random() - 0.5) * 400;
            const endX = startX + (Math.random() - 0.5) * 600;
            const endY = startY + (Math.random() - 0.5) * 600;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            this.ctx.stroke();
        }
    }
    
    drawMountainSilhouette(color) {
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = color;
        
        // Draw mountain ranges
        for (let layer = 0; layer < 3; layer++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.canvas.height);
            
            const peaks = 5 + layer * 2;
            for (let i = 0; i <= peaks; i++) {
                const x = (this.canvas.width / peaks) * i;
                const height = 200 + Math.random() * 300 - layer * 50;
                const y = this.canvas.height - height;
                
                if (i === 0) this.ctx.lineTo(x, y);
                else {
                    const prevX = (this.canvas.width / peaks) * (i - 1);
                    const midX = (prevX + x) / 2;
                    const midY = y + (Math.random() - 0.5) * 50;
                    this.ctx.quadraticCurveTo(midX, midY, x, y);
                }
            }
            
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.globalAlpha *= 0.7; // Each layer more transparent
        }
    }
    
    drawPsychedelicWaves(color1, color2) {
        this.ctx.globalAlpha = 0.04;
        
        const waves = 8;
        for (let i = 0; i < waves; i++) {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(0.5, color2);
            gradient.addColorStop(1, color1);
            
            this.ctx.fillStyle = gradient;
            
            this.ctx.beginPath();
            for (let x = 0; x <= this.canvas.width; x += 10) {
                const y = this.canvas.height / 2 + 
                         Math.sin(x * 0.01 + i) * 200 + 
                         Math.sin(x * 0.02 - i) * 100;
                
                if (x === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.lineTo(0, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    drawLightRays(color) {
        this.ctx.globalAlpha = 0.05;
        
        const centerX = this.canvas.width / 2;
        const centerY = -100;
        const rays = 12;
        
        for (let i = 0; i < rays; i++) {
            const angle = (Math.PI * 2 / rays) * i;
            const gradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, this.canvas.height * 1.5
            );
            
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(angle);
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(-30, this.canvas.height * 1.5);
            this.ctx.lineTo(30, this.canvas.height * 1.5);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }
    
    drawMinimalDots(color) {
        this.ctx.globalAlpha = 0.15;
        this.ctx.fillStyle = color;
        
        const dotSize = 3;
        const spacing = 50;
        
        for (let x = spacing; x < this.canvas.width; x += spacing) {
            for (let y = spacing; y < this.canvas.height; y += spacing) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, dotSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawDigitalMatrix(color) {
        this.ctx.globalAlpha = 0.08;
        this.ctx.fillStyle = color;
        this.ctx.font = '14px monospace';
        
        const chars = '01';
        const columnWidth = 20;
        const rowHeight = 20;
        
        for (let x = 0; x < this.canvas.width; x += columnWidth) {
            for (let y = rowHeight; y < this.canvas.height; y += rowHeight) {
                if (Math.random() > 0.7) {
                    const char = chars[Math.floor(Math.random() * chars.length)];
                    this.ctx.fillText(char, x, y);
                }
            }
        }
    }
    
    drawFeatherTexture(color) {
        this.ctx.globalAlpha = 0.06;
        this.ctx.strokeStyle = color;
        
        // Draw feather-like curves
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const length = 100 + Math.random() * 200;
            const angle = Math.random() * Math.PI * 2;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(angle);
            
            // Main feather stem
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, length);
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Feather barbs
            for (let j = 10; j < length; j += 8) {
                const barbLength = (length - j) / 3;
                
                this.ctx.beginPath();
                this.ctx.moveTo(0, j);
                this.ctx.lineTo(barbLength, j - 5);
                this.ctx.moveTo(0, j);
                this.ctx.lineTo(-barbLength, j - 5);
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }
    }
    
    drawDefaultPattern(color) {
        // Subtle geometric pattern for any unmatched albums
        this.ctx.globalAlpha = 0.05;
        this.ctx.fillStyle = color;
        
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = Math.random() * 100 + 50;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Generate square image for Instagram and other social platforms
     */
    async generateSquareImage(topSongs, albumsMap, canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Square format
        this.canvas.width = 1080;
        this.canvas.height = 1080;
        
        // Get the top song's album for background and colors
        const topAlbumId = topSongs[0]?.albumId;
        this.currentAlbumId = topAlbumId;
        
        this.drawSquareBackground(topAlbumId);
        this.drawSquareHeader(topAlbumId);
        await this.drawSquareSongList(topSongs, albumsMap);
        this.drawSquareFooter(topAlbumId);
    }
    
    drawSquareBackground(albumId = null) {
        // Use the same background as regular export
        this.drawBackground(albumId);
    }
    
    drawSquareHeader(albumId = null) {
        // Get album colors and fonts
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let headerFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (albumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(albumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            headerFont = albumColors.headerFont || headerFont;
        }
        
        // Compact header for square format
        this.ctx.fillStyle = textColor;
        this.ctx.font = `bold 48px ${headerFont}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MY TOP 10', this.canvas.width / 2, 80);
        
        this.ctx.fillStyle = primaryColor;
        this.ctx.font = `bold 64px ${headerFont}`;
        this.ctx.fillText('KANYE SONGS', this.canvas.width / 2, 150);
        
        // Divider line
        this.ctx.strokeStyle = primaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(100, 180);
        this.ctx.lineTo(this.canvas.width - 100, 180);
        this.ctx.stroke();
    }
    
    async drawSquareSongList(topSongs, albumsMap) {
        const startY = 220;
        const itemHeight = 65; // Smaller height for square format
        const padding = 60;
        
        // Get colors and fonts based on top album
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let secondaryTextColor = '#999999';
        let bodyFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (this.currentAlbumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(this.currentAlbumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            secondaryTextColor = this.getSecondaryTextColor(albumColors.background);
            bodyFont = albumColors.bodyFont || bodyFont;
        }
        
        // Display top 10 songs in two columns for square format
        const columns = 2;
        const columnWidth = (this.canvas.width - padding * 2) / columns;
        
        for (let i = 0; i < Math.min(topSongs.length, 10); i++) {
            const song = topSongs[i];
            const album = albumsMap.get(song.albumId);
            
            const column = i < 5 ? 0 : 1;
            const row = i % 5;
            const x = padding + (column * columnWidth);
            const y = startY + (row * itemHeight);
            
            // Rank number
            this.ctx.fillStyle = primaryColor;
            this.ctx.font = `bold 32px ${bodyFont}`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${i + 1}.`, x, y + 25);
            
            // Song title
            this.ctx.fillStyle = textColor;
            this.ctx.font = `bold 24px ${bodyFont}`;
            const titleX = x + 45;
            const maxTitleWidth = columnWidth - 60;
            const displayTitle = song.title === "Niggas in Paris" ? "N****s in Paris" : song.title;
            const title = this.truncateText(displayTitle, maxTitleWidth);
            this.ctx.fillText(title, titleX, y + 20);
            
            // Album name (smaller)
            if (this.currentAlbumId === 'wtt') {
                this.ctx.fillStyle = '#000000';
            } else {
                this.ctx.fillStyle = secondaryTextColor;
            }
            this.ctx.font = `18px ${bodyFont}`;
            const albumText = album ? this.formatAlbumName(album.name) : 'Unknown';
            const truncatedAlbum = this.truncateText(albumText, maxTitleWidth);
            this.ctx.fillText(truncatedAlbum, titleX, y + 40);
        }
    }
    
    drawSquareFooter(albumId = null) {
        const footerY = this.canvas.height - 100;
        
        // Get album colors and fonts
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let bodyFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (albumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(albumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            bodyFont = albumColors.bodyFont || bodyFont;
        }
        
        // Divider line
        this.ctx.strokeStyle = primaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(100, footerY - 30);
        this.ctx.lineTo(this.canvas.width - 100, footerY - 30);
        this.ctx.stroke();
        
        // Website URL
        this.ctx.fillStyle = primaryColor;
        this.ctx.font = `bold 36px ${bodyFont}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('kanyeranker.com', this.canvas.width / 2, footerY + 10);
        
        // Date
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        this.ctx.fillStyle = textColor;
        this.ctx.font = `20px ${bodyFont}`;
        this.ctx.fillText(date, this.canvas.width / 2, footerY + 40);
    }
    
    /**
     * Generate square image for albums
     */
    async generateSquareAlbumsImage(topAlbums, canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Square format
        this.canvas.width = 1080;
        this.canvas.height = 1080;
        
        // Get the top album's ID for background and colors
        const topAlbumId = topAlbums[0]?.album?.id;
        this.currentAlbumId = topAlbumId;
        
        this.drawSquareBackground(topAlbumId);
        this.drawSquareAlbumsHeader(topAlbumId);
        await this.drawSquareAlbumsList(topAlbums);
        this.drawSquareFooter(topAlbumId);
    }
    
    drawSquareAlbumsHeader(albumId = null) {
        // Get album colors and fonts
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let headerFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (albumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(albumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            headerFont = albumColors.headerFont || headerFont;
        }
        
        // Compact header for square format
        this.ctx.fillStyle = textColor;
        this.ctx.font = `bold 48px ${headerFont}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MY TOP 5', this.canvas.width / 2, 80);
        
        this.ctx.fillStyle = primaryColor;
        this.ctx.font = `bold 64px ${headerFont}`;
        this.ctx.fillText('KANYE ALBUMS', this.canvas.width / 2, 150);
        
        // Divider line
        this.ctx.strokeStyle = primaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(100, 180);
        this.ctx.lineTo(this.canvas.width - 100, 180);
        this.ctx.stroke();
    }
    
    async drawSquareAlbumsList(topAlbums) {
        const startY = 250;
        const itemHeight = 140; // Compact height for albums
        const padding = 80;
        
        // Get colors and fonts based on top album
        let primaryColor = '#D4AF37';
        let textColor = '#ffffff';
        let secondaryTextColor = '#999999';
        let bodyFont = '"Helvetica Neue", Arial, sans-serif';
        
        if (this.currentAlbumId && window.getAlbumColors) {
            const albumColors = window.getAlbumColors(this.currentAlbumId);
            primaryColor = albumColors.primary;
            textColor = this.getReadableTextColor(albumColors.background);
            secondaryTextColor = this.getSecondaryTextColor(albumColors.background);
            bodyFont = albumColors.bodyFont || bodyFont;
        }
        
        for (let i = 0; i < Math.min(topAlbums.length, 5); i++) {
            const albumData = topAlbums[i];
            const album = albumData.album;
            const y = startY + (i * itemHeight);
            
            // Rank
            this.ctx.fillStyle = primaryColor;
            this.ctx.font = `bold 56px ${bodyFont}`;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`#${i + 1}`, padding, y + 40);
            
            // Album art
            const albumArtSize = 100;
            const albumArtX = padding + 120;
            const albumArtY = y - 30;
            
            if (album && album.coverArt) {
                await this.drawAlbumArt(album.coverArt, albumArtX, albumArtY, albumArtSize);
            } else {
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(albumArtX, albumArtY, albumArtSize, albumArtSize);
            }
            
            // Album info
            const textX = albumArtX + albumArtSize + 30;
            
            // Album name
            this.ctx.fillStyle = textColor;
            this.ctx.font = `bold 36px ${bodyFont}`;
            this.ctx.textAlign = 'left';
            
            const maxTitleWidth = this.canvas.width - textX - padding;
            const formattedName = this.formatAlbumName(album.name);
            const title = this.truncateText(formattedName, maxTitleWidth);
            this.ctx.fillText(title, textX, y + 20);
            
            // Album year
            if (this.currentAlbumId === 'wtt') {
                this.ctx.fillStyle = '#000000';
            } else {
                this.ctx.fillStyle = secondaryTextColor;
            }
            this.ctx.font = `28px ${bodyFont}`;
            this.ctx.fillText(album.year.toString(), textX, y + 55);
        }
    }
}

// Make class available globally
window.KanyeRankerExport = KanyeRankerExport;