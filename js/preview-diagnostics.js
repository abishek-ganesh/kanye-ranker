// Preview Diagnostics Tool
(function() {
    console.log('[Preview Diagnostics] Starting diagnostic checks...');
    
    // Check 1: Browser autoplay policy
    function checkAutoplayPolicy() {
        const testVideo = document.createElement('video');
        testVideo.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAA';
        testVideo.muted = false;
        
        const canPlay = testVideo.play().then(() => {
            console.log('✅ Autoplay with sound: ALLOWED');
            testVideo.remove();
            return true;
        }).catch((e) => {
            console.log('❌ Autoplay with sound: BLOCKED', e.message);
            
            // Try muted autoplay
            testVideo.muted = true;
            return testVideo.play().then(() => {
                console.log('⚠️ Autoplay muted: ALLOWED (sound blocked by browser)');
                testVideo.remove();
                return false;
            }).catch((e2) => {
                console.log('❌ All autoplay: BLOCKED', e2.message);
                testVideo.remove();
                return false;
            });
        });
        
        return canPlay;
    }
    
    // Check 2: YouTube API availability
    function checkYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            console.log('✅ YouTube API: LOADED');
            return true;
        } else {
            console.log('❌ YouTube API: NOT LOADED');
            return false;
        }
    }
    
    // Check 3: Network connectivity to YouTube
    function checkYouTubeConnectivity() {
        const img = new Image();
        img.src = 'https://i.ytimg.com/favicon.ico?' + Date.now();
        
        return new Promise((resolve) => {
            img.onload = () => {
                console.log('✅ YouTube connectivity: OK');
                resolve(true);
            };
            img.onerror = () => {
                console.log('❌ YouTube connectivity: FAILED');
                resolve(false);
            };
        });
    }
    
    // Check 4: Content Security Policy
    function checkCSP() {
        // Try to create an iframe
        const testFrame = document.createElement('iframe');
        testFrame.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
        testFrame.style.display = 'none';
        document.body.appendChild(testFrame);
        
        setTimeout(() => {
            try {
                // If we can access the iframe, CSP is likely OK
                const doc = testFrame.contentDocument || testFrame.contentWindow.document;
                console.log('⚠️ CSP check: INCONCLUSIVE');
            } catch (e) {
                // This is actually expected for cross-origin
                console.log('✅ CSP: Likely OK (cross-origin block is normal)');
            }
            testFrame.remove();
        }, 1000);
    }
    
    // Check 5: Event listeners
    function checkEventListeners() {
        setTimeout(() => {
            const songCards = document.querySelectorAll('.song-card');
            if (songCards.length > 0) {
                console.log(`✅ Song cards found: ${songCards.length}`);
                
                // Check if hover events work
                const testCard = songCards[0];
                if (testCard) {
                    const hasListeners = getEventListeners ? getEventListeners(testCard) : null;
                    if (hasListeners) {
                        console.log('Event listeners:', hasListeners);
                    } else {
                        console.log('⚠️ Cannot inspect event listeners (browser limitation)');
                    }
                }
            } else {
                console.log('⚠️ No song cards found yet');
            }
        }, 2000);
    }
    
    // Check 6: Audio context
    function checkAudioContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const context = new AudioContext();
            
            if (context.state === 'suspended') {
                console.log('⚠️ AudioContext: SUSPENDED (requires user interaction)');
                
                // Try to resume on click
                document.addEventListener('click', () => {
                    context.resume().then(() => {
                        console.log('✅ AudioContext: RESUMED after user interaction');
                    });
                }, { once: true });
            } else {
                console.log('✅ AudioContext: ACTIVE');
            }
            
            return context.state;
        } catch (e) {
            console.log('❌ AudioContext: FAILED', e.message);
            return 'failed';
        }
    }
    
    // Run all diagnostics
    async function runDiagnostics() {
        console.log('\n🔍 RUNNING PREVIEW DIAGNOSTICS...\n');
        
        const results = {
            autoplay: await checkAutoplayPolicy(),
            youtubeAPI: checkYouTubeAPI(),
            connectivity: await checkYouTubeConnectivity(),
            audioContext: checkAudioContext()
        };
        
        checkCSP();
        checkEventListeners();
        
        // Summary
        console.log('\n📊 DIAGNOSTIC SUMMARY:');
        console.log('====================');
        
        if (!results.autoplay) {
            console.log('\n⚠️ AUTOPLAY ISSUE DETECTED!');
            console.log('Solution: User must click play button on first video');
            console.log('Or: Enable "Allow sites to play sound" in browser settings');
        }
        
        if (!results.youtubeAPI) {
            console.log('\n⚠️ YOUTUBE API NOT LOADED!');
            console.log('Check console for script loading errors');
        }
        
        if (!results.connectivity) {
            console.log('\n⚠️ YOUTUBE CONNECTIVITY ISSUE!');
            console.log('Check network/firewall settings');
        }
        
        if (results.audioContext === 'suspended') {
            console.log('\n⚠️ AUDIO CONTEXT SUSPENDED!');
            console.log('Browser requires user interaction to play audio');
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('1. Open browser console (F12) and check for errors');
        console.log('2. Try clicking the "Test YouTube Player" button');
        console.log('3. Check if youtube.com is accessible');
        console.log('4. Try in an incognito/private window');
        console.log('5. Disable ad blockers temporarily');
        console.log('6. Check browser autoplay settings');
        
        return results;
    }
    
    // Add manual test button - DISABLED per user request
    function addManualTestButton() {
        // Button removed - diagnostics can still be run from console
        // Use window.previewDiagnostics.runDiagnostics() if needed
    }
    
    // Auto-run diagnostics after page load
    window.addEventListener('load', () => {
        setTimeout(runDiagnostics, 1000);
        addManualTestButton();
    });
    
    // Export for manual testing
    window.previewDiagnostics = {
        runDiagnostics,
        checkAutoplayPolicy,
        checkYouTubeAPI,
        checkYouTubeConnectivity,
        checkAudioContext
    };
})();