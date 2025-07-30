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
            }
            
            #back-button:hover {
                background: #666;
                color: white;
                transform: translateX(-2px);
            }
            
            #back-button.visible {
                display: inline-block !important;
            }
            
            #comparison-screen.active #back-button.visible {
                display: inline-block !important;
            }
            
            /* Ensure back button is visible on comparison screen */
            body:has(#comparison-screen.active) #back-button.visible {
                display: inline-block !important;
            }
            
            @media (max-width: 768px) {
                #back-button {
                    position: absolute !important;
                    top: 15px;
                    left: 15px;
                    padding: 8px 12px;
                    font-size: 16px;
                    min-width: auto;
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
        const comparison = {
            songIdA,
            songIdB,
            winnerId,
            timestamp: Date.now(),
            pairIndex: this.app.currentPairIndex
        };
        
        this.history.push(comparison);
        localStorage.setItem('comparison-history', JSON.stringify(this.history));
        
        // Show back button after first comparison
        if (this.history.length > 0) {
            document.getElementById('back-button').classList.add('visible');
        }
    }
    
    restoreHistory() {
        const saved = localStorage.getItem('comparison-history');
        if (saved) {
            this.history = JSON.parse(saved);
            // Only show back button if we have history AND we're not on the landing screen
            if (this.history.length > 0 && !document.getElementById('landing-screen').classList.contains('active')) {
                document.getElementById('back-button').classList.add('visible');
            }
        }
    }
    
    goBack() {
        if (this.history.length === 0) return;
        
        // Get last comparison
        const lastComparison = this.history.pop();
        
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
        this.app.elo.removeComparison(songIdA, songIdB);
        
        // Go back to the previous comparison
        this.app.currentPairIndex = Math.max(0, lastComparison.pairIndex);
        
        // Clear processing flag
        this.app.isProcessingChoice = false;
        
        // Show the comparison again
        this.app.showNextComparison();
        
        // Update history storage
        localStorage.setItem('comparison-history', JSON.stringify(this.history));
        
        // Hide back button if no more history
        if (this.history.length === 0) {
            document.getElementById('back-button').classList.remove('visible');
        }
    }
    
    getStoredRatingsBeforeComparison(pairIndex) {
        // Get ratings snapshot from session storage
        const sessionData = localStorage.getItem('kanye-ranker-session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.ratingSnapshots && session.ratingSnapshots[pairIndex - 1]) {
                return session.ratingSnapshots[pairIndex - 1];
            }
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