// UI Instructions Helper
(function() {
    let instructionsShown = false;
    
    function showInstructions() {
        // Instructions popup removed per user request
        return;
        
        if (instructionsShown || localStorage.getItem('ui-instructions-shown')) return;
        
        const instructions = document.createElement('div');
        instructions.id = 'ui-instructions';
        instructions.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            font-size: 16px;
            line-height: 1.6;
            animation: fadeIn 0.3s ease-out;
        `;
        
        instructions.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #fff; font-size: 24px;">How to Compare Songs</h2>
            
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 40px; height: 40px; background: #ff0000; border-radius: 8px; margin-right: 15px; display: flex; align-items: center; justify-content: center; font-weight: bold;">▶</div>
                    <div>
                        <strong>Preview Songs:</strong><br>
                        Click the red "▶ Preview" button to listen to a song
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="width: 40px; height: 40px; background: #1db954; border-radius: 8px; margin-right: 15px; display: flex; align-items: center; justify-content: center; font-weight: bold;">✓</div>
                    <div>
                        <strong>Choose Your Favorite:</strong><br>
                        Click the green "CHOOSE THIS" button to select a song
                    </div>
                </div>
                
                <div style="display: flex; align-items: center;">
                    <div style="width: 40px; height: 40px; background: #666; border-radius: 8px; margin-right: 15px; display: flex; align-items: center; justify-content: center; font-weight: bold;">➜</div>
                    <div>
                        <strong>Skip or Finish:</strong><br>
                        Use "Skip" if unsure, or "Show Results" when done
                    </div>
                </div>
            </div>
            
            <button onclick="document.getElementById('ui-instructions').remove(); localStorage.setItem('ui-instructions-shown', 'true')" 
                    style="background: #1db954; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; width: 100%; font-weight: bold;">
                Got it! Let's Start
            </button>
            
            <div style="text-align: center; margin-top: 15px; opacity: 0.7; font-size: 14px;">
                <label style="cursor: pointer;">
                    <input type="checkbox" id="dont-show-again" style="margin-right: 5px;">
                    Don't show this again
                </label>
            </div>
        `;
        
        document.body.appendChild(instructions);
        instructionsShown = true;
        
        // Handle checkbox
        document.getElementById('dont-show-again').addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('ui-instructions-shown', 'true');
            }
        });
        
        // Add fade-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show instructions when comparison screen becomes active
    const observer = new MutationObserver(() => {
        const comparisonScreen = document.getElementById('comparison-screen');
        if (comparisonScreen && comparisonScreen.classList.contains('active') && !instructionsShown) {
            setTimeout(showInstructions, 500);
        }
    });
    
    observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class']
    });
    
    // Help button removed per user request
})();