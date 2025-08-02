// Button Stabilizer - Prevents button jumping on mobile
class ButtonStabilizer {
    constructor() {
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.stabilizeButtons());
        } else {
            this.stabilizeButtons();
        }
    }
    
    stabilizeButtons() {
        const buttons = ['skip-comparison', 'show-results'];
        
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (!button) return;
            
            // Prevent default touch behaviors
            button.addEventListener('touchstart', (e) => {
                // Prevent any default behavior but allow the click
                e.stopPropagation();
                
                // Lock the button position
                const rect = button.getBoundingClientRect();
                button.style.position = 'relative';
                button.style.top = '0';
                button.style.left = '0';
                button.style.transform = 'none';
                button.style.webkitTransform = 'none';
            }, { passive: true });
            
            button.addEventListener('touchend', (e) => {
                // Ensure button stays in place
                e.stopPropagation();
                button.style.transform = 'none';
                button.style.webkitTransform = 'none';
            }, { passive: true });
            
            // Prevent any movement on click
            button.addEventListener('click', (e) => {
                button.style.transform = 'none';
                button.style.webkitTransform = 'none';
                button.style.position = 'relative';
                button.style.top = '0';
                button.style.left = '0';
            }, { capture: true });
            
            // Override any inline styles that might be applied
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        // If transform is applied, remove it
                        const transform = button.style.transform || button.style.webkitTransform;
                        if (transform && transform !== 'none') {
                            button.style.transform = 'none';
                            button.style.webkitTransform = 'none';
                        }
                    }
                });
            });
            
            // Start observing style changes
            observer.observe(button, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
        });
    }
}

// Initialize button stabilizer
window.buttonStabilizer = new ButtonStabilizer();