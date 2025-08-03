// Feedback System - Updated with EmailJS
// Version 2.0 - Cache bust: ${Date.now()}
console.log('Loading new feedback.js with EmailJS support...');

class FeedbackManager {
    constructor() {
        this.modal = document.getElementById('feedback-modal');
        this.button = document.getElementById('feedback-button');
        this.form = document.getElementById('feedback-form');
        this.emailInput = document.getElementById('feedback-email');
        this.messageInput = document.getElementById('feedback-message');
        this.charCurrent = document.getElementById('char-current');
        this.charLimit = 500;
        
        // Rate limiting
        this.lastSubmitTime = 0;
        this.submitCooldown = 60000; // 1 minute cooldown
        
        // EmailJS configuration
        this.serviceID = 'service_m82svqs';
        this.templateID = 'template_ea3aht8';
        this.publicKey = '9Sa_4DDtQczyQSQ-b';
        
        this.init();
    }
    
    init() {
        // Initialize EmailJS - wait for it to be available
        const initEmailJS = () => {
            if (window.emailjs) {
                emailjs.init(this.publicKey);
                console.log('EmailJS initialized with key:', this.publicKey);
                return true;
            }
            return false;
        };
        
        // Try to initialize immediately
        if (!initEmailJS()) {
            console.warn('EmailJS not ready, waiting...');
            // If not ready, wait for window load
            window.addEventListener('load', () => {
                if (!initEmailJS()) {
                    console.error('EmailJS SDK failed to load!');
                }
            });
        }
        
        // Button click handler
        this.button.addEventListener('click', () => this.openModal());
        
        // Modal click handler (close on background click)
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Cancel button
        document.getElementById('feedback-cancel').addEventListener('click', () => this.closeModal());
        
        // Character counter
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        
        // Form submission - prevent ALL default behavior
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Form submit intercepted!');
            this.handleSubmit(e);
            return false;
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });
    }
    
    open() {
        this.openModal();
    }
    
    openModal() {
        this.modal.classList.add('show');
        this.messageInput.focus();
    }
    
    closeModal() {
        this.modal.classList.remove('show');
        this.form.reset();
        this.updateCharCount();
        
        // Restore original content if we showed success message
        if (this.originalFormContent) {
            const formContent = this.modal.querySelector('.feedback-content');
            formContent.innerHTML = this.originalFormContent;
            this.originalFormContent = null;
            
            // Re-attach event listeners
            this.form = document.getElementById('feedback-form');
            this.emailInput = document.getElementById('feedback-email');
            this.messageInput = document.getElementById('feedback-message');
            this.charCurrent = document.getElementById('char-current');
            
            // Re-attach form submission
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            
            // Re-attach character counter
            this.messageInput.addEventListener('input', () => this.updateCharCount());
            
            // Re-attach cancel button
            document.getElementById('feedback-cancel').addEventListener('click', () => this.closeModal());
        }
    }
    
    updateCharCount() {
        const length = this.messageInput.value.length;
        this.charCurrent.textContent = length;
        
        if (length > this.charLimit) {
            this.messageInput.value = this.messageInput.value.substring(0, this.charLimit);
            this.charCurrent.textContent = this.charLimit;
        }
        
        // Update color based on proximity to limit
        if (length > this.charLimit * 0.9) {
            this.charCurrent.style.color = '#ff6b6b';
        } else if (length > this.charLimit * 0.7) {
            this.charCurrent.style.color = '#ffa500';
        } else {
            this.charCurrent.style.color = '';
        }
    }
    
    getContext() {
        // Gather context about the current state
        const activeScreen = document.querySelector('.screen.active');
        const screenName = activeScreen ? activeScreen.id : 'unknown';
        
        let context = {
            screen: screenName,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            darkMode: document.body.classList.contains('dark-mode'),
            // Additional metadata (without exposing personal info)
            platform: navigator.platform || 'Unknown',
            language: navigator.language || 'Unknown',
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            referrer: document.referrer || 'Direct visit'
        };
        
        // Add screen-specific context
        if (screenName === 'comparison-screen') {
            const currentComp = document.getElementById('current-comparison');
            
            // Get song names from comparison
            const songA = document.querySelector('#song-a .song-title');
            const songB = document.querySelector('#song-b .song-title');
            const albumA = document.querySelector('#song-a .album-name');
            const albumB = document.querySelector('#song-b .album-name');
            
            context.comparison = {
                current: currentComp ? currentComp.textContent : 'unknown',
                songA: songA ? songA.textContent : 'Unknown Song',
                songB: songB ? songB.textContent : 'Unknown Song',
                albumA: albumA ? albumA.textContent : 'Unknown Album',
                albumB: albumB ? albumB.textContent : 'Unknown Album'
            };
        } else if (screenName === 'results-screen') {
            // Get top 10 songs from results
            const topSongElements = document.querySelectorAll('#top-songs .result-item');
            const topSongs = [];
            
            for (let i = 0; i < Math.min(10, topSongElements.length); i++) {
                const songTitle = topSongElements[i].querySelector('.result-title');
                const albumName = topSongElements[i].querySelector('.result-album');
                if (songTitle) {
                    topSongs.push({
                        rank: i + 1,
                        title: songTitle.textContent,
                        album: albumName ? albumName.textContent : 'Unknown Album'
                    });
                }
            }
            
            // Get top 5 albums from results
            const topAlbumElements = document.querySelectorAll('#top-albums .result-item');
            const topAlbums = [];
            
            for (let i = 0; i < Math.min(5, topAlbumElements.length); i++) {
                const albumTitle = topAlbumElements[i].querySelector('.result-title');
                const albumYear = topAlbumElements[i].querySelector('.result-album');
                if (albumTitle) {
                    topAlbums.push({
                        rank: i + 1,
                        title: albumTitle.textContent,
                        year: albumYear ? albumYear.textContent : ''
                    });
                }
            }
            
            const currentComp = document.getElementById('current-comparison');
            context.results = {
                completedComparisons: currentComp ? currentComp.textContent : 'unknown',
                topSongs: topSongs,
                topAlbums: topAlbums
            };
        }
        
        return context;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        console.log('Form submitted!');
        
        // Check rate limiting
        const now = Date.now();
        if (now - this.lastSubmitTime < this.submitCooldown) {
            const remainingTime = Math.ceil((this.submitCooldown - (now - this.lastSubmitTime)) / 1000);
            this.showToast(`Please wait ${remainingTime} seconds before sending another feedback`, 'error');
            return;
        }
        
        const email = this.emailInput.value.trim();
        const message = this.messageInput.value.trim();
        
        console.log('Email:', email, 'Message:', message);
        
        if (!message) {
            this.showToast('Please enter a message', 'error');
            return;
        }
        
        // Check if EmailJS is available
        if (!window.emailjs) {
            console.error('EmailJS not available in window object');
            this.showToast('Email service not available. Please try again later.', 'error');
            return;
        }
        
        console.log('EmailJS is available, proceeding...');
        
        // Disable submit button
        const submitBtn = document.getElementById('feedback-send');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        try {
            // Get context
            const context = this.getContext();
            
            // Prepare context info string
            let contextInfo = 'No additional context';
            let comparisonDetails = '';
            let resultsDetails = '';
            
            if (context.comparison) {
                contextInfo = `Comparison: ${context.comparison.current} of ${context.comparison.total}`;
                comparisonDetails = `Currently comparing:
• "${context.comparison.songA}" (${context.comparison.albumA})
• "${context.comparison.songB}" (${context.comparison.albumB})`;
            } else if (context.results) {
                contextInfo = `User completed rankings (${context.results.completedComparisons} comparisons)`;
                
                // Format top songs
                if (context.results.topSongs.length > 0) {
                    resultsDetails = '=== TOP 10 SONGS ===\n' + 
                        context.results.topSongs.map(song => 
                            `${song.rank}. "${song.title}" - ${song.album}`
                        ).join('\n');
                }
                
                // Add top albums
                if (context.results.topAlbums.length > 0) {
                    resultsDetails += '\n\n=== TOP 5 ALBUMS ===\n' + 
                        context.results.topAlbums.map(album => 
                            `${album.rank}. ${album.title} ${album.year ? `(${album.year})` : ''}`
                        ).join('\n');
                }
            }
            
            // Prepare template parameters for EmailJS
            const templateParams = {
                message: message,
                user_email: email || 'Not provided',
                screen_name: context.screen,
                dark_mode: context.darkMode ? 'Yes' : 'No',
                timestamp: context.timestamp,
                context_info: contextInfo,
                comparison_details: comparisonDetails,
                results_details: resultsDetails,
                user_agent: context.userAgent,
                // Additional metadata
                platform: context.platform,
                language: context.language,
                screen_resolution: context.screenResolution,
                window_size: context.windowSize,
                referrer: context.referrer
            };
            
            console.log('Template params:', templateParams);
            console.log('Service ID:', this.serviceID);
            console.log('Template ID:', this.templateID);
            
            // Send email using EmailJS
            console.log('About to call emailjs.send...');
            const response = await emailjs.send(
                this.serviceID,
                this.templateID,
                templateParams
            );
            
            console.log('EmailJS response:', response);
            
            // Track analytics
            if (window.analytics) {
                window.analytics.trackFeedbackSubmitted(!!email);
            }
            
            // Update last submit time
            this.lastSubmitTime = now;
            
            // Show success message
            this.showSuccessInModal();
            
            // Close modal after showing success
            setTimeout(() => {
                this.closeModal();
            }, 2000);
            
        } catch (error) {
            console.error('Error sending feedback:', error);
            this.showToast('Failed to send feedback. Please try again later.', 'error');
            
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Feedback';
        }
    }
    
    showSuccessInModal() {
        // Replace form content with success message
        const formContent = this.modal.querySelector('.feedback-content');
        const originalContent = formContent.innerHTML;
        
        formContent.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;">✓</div>
                <h3 style="color: #333; margin-bottom: 10px;">Thank You!</h3>
                <p style="color: #666;">Your feedback has been sent successfully.</p>
            </div>
        `;
        
        // Store original content to restore later
        this.originalFormContent = originalContent;
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} show`;
        toast.textContent = message;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize feedback system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing FeedbackManager v2.0 with EmailJS...');
    window.feedbackManager = new FeedbackManager();
    
    // Double-check EmailJS is loaded
    if (!window.emailjs) {
        console.error('CRITICAL: EmailJS not found! Check if CDN is blocked.');
    } else {
        console.log('EmailJS confirmed available');
    }
});