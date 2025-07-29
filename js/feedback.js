// Feedback System
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
        
        this.init();
    }
    
    init() {
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
        
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.closeModal();
            }
        });
    }
    
    openModal() {
        this.modal.classList.add('show');
        this.messageInput.focus();
    }
    
    closeModal() {
        this.modal.classList.remove('show');
        this.form.reset();
        this.updateCharCount();
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
            darkMode: document.body.classList.contains('dark-mode')
        };
        
        // Add screen-specific context
        if (screenName === 'comparison-screen') {
            const currentComp = document.getElementById('current-comparison');
            const totalComp = document.getElementById('total-comparisons');
            context.comparison = {
                current: currentComp ? currentComp.textContent : 'unknown',
                total: totalComp ? totalComp.textContent : 'unknown'
            };
        } else if (screenName === 'results-screen') {
            const topSongs = document.querySelectorAll('#top-songs .result-item');
            context.completedComparisons = topSongs.length > 0;
        }
        
        return context;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        // Check rate limiting
        const now = Date.now();
        if (now - this.lastSubmitTime < this.submitCooldown) {
            const remainingTime = Math.ceil((this.submitCooldown - (now - this.lastSubmitTime)) / 1000);
            this.showToast(`Please wait ${remainingTime} seconds before sending another feedback`, 'error');
            return;
        }
        
        const email = this.emailInput.value.trim();
        const message = this.messageInput.value.trim();
        
        if (!message) {
            this.showToast('Please enter a message', 'error');
            return;
        }
        
        // Disable submit button
        const submitBtn = document.getElementById('feedback-send');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        try {
            // Get context
            const context = this.getContext();
            
            // Send email using EmailJS
            // Note: You'll need to sign up for EmailJS and get your service ID, template ID, and user ID
            // For now, I'll use a fallback mailto method
            
            // Fallback: Use mailto link
            const subject = `Kanye Ranker Feedback - ${context.screen}`;
            const body = `
Feedback from Kanye Ranker

Message: ${message}

User Email: ${email || 'Not provided'}

Context:
- Screen: ${context.screen}
- Dark Mode: ${context.darkMode ? 'Yes' : 'No'}
- Timestamp: ${context.timestamp}
${context.comparison ? `- Comparison: ${context.comparison.current} of ${context.comparison.total}` : ''}

User Agent: ${context.userAgent}
            `.trim();
            
            // Create mailto link
            const mailtoLink = `mailto:abishek.ganesh30@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            // Open mail client
            window.location.href = mailtoLink;
            
            // Track analytics
            if (window.analytics) {
                window.analytics.trackFeedbackSubmitted(!!email);
            }
            
            // Update last submit time
            this.lastSubmitTime = now;
            
            // Show success message
            this.showToast('Opening your email client...', 'success');
            
            // Close modal after a short delay
            setTimeout(() => {
                this.closeModal();
            }, 1500);
            
        } catch (error) {
            console.error('Error sending feedback:', error);
            this.showToast('Failed to send feedback. Please try again.', 'error');
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Feedback';
        }
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
    window.feedbackManager = new FeedbackManager();
});