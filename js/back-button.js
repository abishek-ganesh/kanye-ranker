// Back button functionality
class BackButtonManager {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.init();
    }
    
    init() {
        this.addBackButton();
        // History is in-memory only (rankings don't survive reloads either);
        // drop any key left by older versions that persisted it
        try {
            localStorage.removeItem('comparison-history');
        } catch (storageError) {
            // Storage unavailable - nothing to clean up
        }
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
    
    // state comes from app.captureUndoState(), taken before the choice was applied
    saveComparison(songIdA, songIdB, winnerId, state) {
        try {
            this.history.push({
                songIdA,
                songIdB,
                winnerId,
                pairIndex: this.app.currentPairIndex,
                state
            });

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
    
    goBack() {
        // A choice is still animating; its delayed advance would skip past the undone pair
        if (this.history.length === 0 || this.app.isProcessingChoice) return;

        let lastComparison = null;
        try {
            lastComparison = this.history.pop();

            if (!lastComparison || !lastComparison.songIdA || !lastComparison.songIdB || !lastComparison.state) {
                throw new Error('Invalid comparison history');
            }

            this.app.restoreUndoState(lastComparison);
            this.app.showNextComparison();

            if (window.analytics) {
                window.analytics.trackComparisonUndone(lastComparison.pairIndex + 1);
            }

            // Force enable comparison buttons after a short delay
            setTimeout(() => {
                this.app.ui.enableComparisonButtons();
            }, 100);

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
    
    clear() {
        this.history = [];
        document.getElementById('back-button')?.classList.remove('visible');
    }
}

// Make it globally available
window.BackButtonManager = BackButtonManager;