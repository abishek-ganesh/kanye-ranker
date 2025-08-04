// Back button functionality
class BackButtonManager {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.init();
    }
    
    init() {
        this.addBackButton();
        this.restoreHistory();
    }
    
    addBackButton() {
        // Add CSS for back button
        const style = document.createElement('style');
        style.textContent = `
            #back-button {
                position: absolute !important;
                top: 20px !important;
                left: 20px !important;
                background: transparent !important;
                border: 2px solid #666 !important;
                color: #666 !important;
                padding: 8px 16px !important;
                border-radius: 20px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: none;
                z-index: 10000 !important;
                align-items: center;
                gap: 4px;
            }
            
            #back-button:hover {
                background: #666;
                color: white;
                transform: translateX(-2px);
            }
            
            #back-button.visible {
                display: flex !important;
            }
            
            #comparison-screen.active #back-button.visible {
                display: flex !important;
            }
            
            /* Ensure back button is visible on comparison screen */
            body:has(#comparison-screen.active) #back-button.visible {
                display: flex !important;
            }
            
            @media (max-width: 768px) {
                #back-button {
                    position: absolute !important;
                    top: 20px;
                    left: 15px;
                    padding: 0 10px;
                    font-size: 14px;
                    min-width: auto;
                    height: 30px;
                    line-height: 30px;
                    align-items: center !important;
                }
                
                #back-button.visible {
                    display: flex !important;
                }
                
                #back-button .back-text {
                    display: none;
                }
            }
            
            /* Desktop stays fixed */
            @media (min-width: 769px) {
                #back-button {
                    position: fixed !important;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Create back button
        const backBtn = document.createElement('button');
        backBtn.id = 'back-button';
        backBtn.innerHTML = '← <span class="back-text">Back</span>';
        backBtn.onclick = () => this.goBack();
        document.body.appendChild(backBtn);
    }
    
    saveComparison(songIdA, songIdB, winnerId) {
        try {
            const comparison = {
                songIdA,
                songIdB,
                winnerId,
                timestamp: Date.now(),
                pairIndex: this.app.currentPairIndex
            };
            
            this.history.push(comparison);
            
            // Try to save to localStorage
            try {
                localStorage.setItem('comparison-history', JSON.stringify(this.history));
            } catch (storageError) {
                console.warn('Could not save comparison history:', storageError);
                // Continue anyway - history still works for this session
            }
            
            // Show back button after first comparison (but not on mobile for first comparison)
            const isMobile = window.innerWidth <= 768;
            const backButton = document.getElementById('back-button');
            if (backButton && this.history.length > 0 && (!isMobile || this.history.length > 1)) {
                backButton.classList.add('visible');
            }
        } catch (error) {
            console.error('Failed to save comparison:', error);
            // Don't throw - back button is optional functionality
        }
    }
    
    restoreHistory() {
        try {
            const saved = localStorage.getItem('comparison-history');
            if (saved) {
                this.history = JSON.parse(saved);
                // Only show back button if we have history AND we're not on the landing screen
                // AND follow mobile rules (hide on first comparison for mobile)
                const isMobile = window.innerWidth <= 768;
                const landingScreen = document.getElementById('landing-screen');
                const backButton = document.getElementById('back-button');
                
                if (backButton && this.history.length > 0 && 
                    (!landingScreen || !landingScreen.classList.contains('active')) && 
                    (!isMobile || this.history.length > 1)) {
                    backButton.classList.add('visible');
                }
            }
        } catch (error) {
            console.warn('Could not restore comparison history:', error);
            this.history = [];
        }
    }
    
    goBack() {
        try {
            if (this.history.length === 0) return;
            
            // Get last comparison
            const lastComparison = this.history.pop();
            
            if (!lastComparison || !lastComparison.songIdA || !lastComparison.songIdB) {
                throw new Error('Invalid comparison history');
            }
            
            // Revert the ratings
            const { songIdA, songIdB, winnerId } = lastComparison;
            const loserId = winnerId === songIdA ? songIdB : songIdA;
            
            // Get the stored ratings from before this comparison
            const storedRatings = this.getStoredRatingsBeforeComparison(lastComparison.pairIndex);
            if (storedRatings) {
                this.app.songRatings.set(songIdA, storedRatings[songIdA]);
                this.app.songRatings.set(songIdB, storedRatings[songIdB]);
            }
            
            // Update comparison history in ELO system
            if (this.app.elo && typeof this.app.elo.removeComparison === 'function') {
                this.app.elo.removeComparison(songIdA, songIdB);
            }
            
            // Go back to the previous comparison
            this.app.currentPairIndex = Math.max(0, lastComparison.pairIndex);
            
            // Clear processing flag
            this.app.isProcessingChoice = false;
            
            // Show the comparison again
            this.app.showNextComparison();
        
            // Force enable comparison buttons after a short delay
            setTimeout(() => {
                this.app.ui.enableComparisonButtons();
            }, 100);
            
            // Update history storage
            try {
                localStorage.setItem('comparison-history', JSON.stringify(this.history));
            } catch (storageError) {
                console.warn('Could not update history:', storageError);
            }
            
        } catch (error) {
            console.error('Failed to go back:', error);
            // Re-add the comparison to history since we failed
            if (lastComparison) {
                this.history.push(lastComparison);
            }
            
            if (window.KanyeUtils && window.KanyeUtils.handleError) {
                window.KanyeUtils.handleError(error, 'undo-comparison');
            }
        }
        
        // Hide back button if no more history (or on mobile for first comparison)
        const isMobile = window.innerWidth <= 768;
        if (this.history.length === 0 || (isMobile && this.history.length <= 1)) {
            document.getElementById('back-button').classList.remove('visible');
        }
    }
    
    getStoredRatingsBeforeComparison(pairIndex) {
        // Session storage removed - get ratings from app's rating snapshots
        if (this.app.ratingSnapshots && this.app.ratingSnapshots[pairIndex - 1]) {
            return this.app.ratingSnapshots[pairIndex - 1];
        }
        return null;
    }
    
    clear() {
        this.history = [];
        localStorage.removeItem('comparison-history');
        document.getElementById('back-button').classList.remove('visible');
    }
}

// Make it globally available
window.BackButtonManager = BackButtonManager;