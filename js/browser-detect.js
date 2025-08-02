// Browser Detection for CSS targeting
(function() {
    const userAgent = navigator.userAgent.toLowerCase();
    const body = document.body;
    
    // Detect browsers
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isChrome = /chrome/.test(userAgent) && /google inc/.test(navigator.vendor.toLowerCase());
    const isFirefox = userAgent.indexOf('firefox') > -1;
    const isEdge = userAgent.indexOf('edge') > -1 || userAgent.indexOf('edg/') > -1;
    
    // Detect mobile
    const isMobile = /mobile|android|iphone|ipad|ipod/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    // Add classes
    if (isSafari) body.classList.add('browser-safari');
    if (isChrome) body.classList.add('browser-chrome');
    if (isFirefox) body.classList.add('browser-firefox');
    if (isEdge) body.classList.add('browser-edge');
    
    if (isMobile) {
        body.classList.add('is-mobile');
        if (isIOS) body.classList.add('is-ios');
        if (isAndroid) body.classList.add('is-android');
    } else {
        body.classList.add('is-desktop');
    }
    
    // Add touch capability class
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        body.classList.add('has-touch');
    }
})();