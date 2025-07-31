// Simple share implementation that just works
(function() {
    // Wait for DOM
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[ShareSimple] Initializing...');
        
        // Watch for results screen
        const observer = new MutationObserver(function(mutations) {
            const resultsScreen = document.getElementById('results-screen');
            if (resultsScreen && resultsScreen.classList.contains('active')) {
                setTimeout(renderButtons, 200);
            }
        });
        
        const resultsScreen = document.getElementById('results-screen');
        if (resultsScreen) {
            observer.observe(resultsScreen, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
        }
    });
    
    function renderButtons() {
        console.log('[ShareSimple] Rendering buttons...');
        const container = document.getElementById('share-buttons');
        if (!container) {
            console.error('[ShareSimple] Container not found!');
            return;
        }
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Remove ALL styles and classes that might be hiding it
        container.removeAttribute('style');
        container.removeAttribute('class');
        container.className = 'share-buttons-simple';
        
        // Create wrapper div to ensure visibility
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: block !important;
            padding: 20px !important;
            text-align: center !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 9999 !important;
            background: transparent !important;
        `;
        
        // Check if mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Define buttons
        const buttons = [
            { label: '𝕏 Twitter', color: '#000', url: 'https://twitter.com/intent/tweet?text=Check%20out%20my%20Kanye%20ranking!&url=' + encodeURIComponent(window.location.href) },
            { label: '💬 WhatsApp', color: '#25D366', url: 'https://wa.me/?text=' + encodeURIComponent('Check out my Kanye ranking! ' + window.location.href) },
            { label: 'f Facebook', color: '#1877F2', url: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) }
        ];
        
        // Add Instagram for mobile
        if (isMobile) {
            buttons.push({ 
                label: '📷 Instagram', 
                color: '#E4405F', 
                action: 'instagram'
            });
        }
        
        // Create buttons
        buttons.forEach(btn => {
            if (btn.action === 'instagram') {
                // Instagram needs special handling
                const instagramBtn = document.createElement('button');
                instagramBtn.style.cssText = `
                    display: inline-block !important;
                    background: ${btn.color} !important;
                    color: white !important;
                    padding: 12px 24px !important;
                    margin: 5px !important;
                    border: none !important;
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    position: relative !important;
                    z-index: 10000 !important;
                `;
                instagramBtn.textContent = btn.label;
                instagramBtn.onclick = function() {
                    alert('Instagram sharing coming soon! For now, take a screenshot and share manually.');
                };
                wrapper.appendChild(instagramBtn);
            } else {
                const link = document.createElement('a');
                link.href = btn.url;
                link.target = '_blank';
                link.rel = 'noopener';
                link.style.cssText = `
                    display: inline-block !important;
                    background: ${btn.color} !important;
                    color: white !important;
                    padding: 12px 24px !important;
                    margin: 5px !important;
                    border-radius: 8px !important;
                    text-decoration: none !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    position: relative !important;
                    z-index: 10000 !important;
                `;
                link.textContent = btn.label;
                wrapper.appendChild(link);
            }
        });
        
        // Add copy button
        const copyBtn = document.createElement('button');
        copyBtn.style.cssText = `
            display: inline-block !important;
            background: #666 !important;
            color: white !important;
            padding: 12px 24px !important;
            margin: 5px !important;
            border: none !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 16px !important;
            cursor: pointer !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 10000 !important;
        `;
        copyBtn.textContent = '🔗 Copy Link';
        copyBtn.onclick = function() {
            navigator.clipboard.writeText(window.location.href).then(function() {
                alert('Link copied!');
            }).catch(function() {
                alert('Failed to copy link');
            });
        };
        wrapper.appendChild(copyBtn);
        
        // Add wrapper to container
        container.appendChild(wrapper);
        
        // Force display after a small delay
        setTimeout(function() {
            container.style.display = 'block !important';
            wrapper.style.display = 'block !important';
        }, 10);
        
        console.log('[ShareSimple] Buttons rendered:', wrapper.children.length);
    }
    
    // Expose globally for testing
    window.renderSimpleShareButtons = renderButtons;
})();