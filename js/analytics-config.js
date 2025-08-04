/**
 * Analytics Configuration
 * Handles internal traffic detection and exclusion
 */

class AnalyticsConfig {
    constructor() {
        this.isInternalTraffic = this.detectInternalTraffic();
    }

    detectInternalTraffic() {
        // Method 1: URL parameter flag
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('internal') === 'true') {
            this.setInternalFlag();
            return true;
        }

        // Method 2: LocalStorage flag
        if (localStorage.getItem('isInternalUser') === 'true') {
            return true;
        }

        // Method 3: Domain-based detection (if using local dev)
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            return true;
        }

        // Method 4: Check for debug mode in GA
        if (window.location.hash === '#debug') {
            this.setInternalFlag();
            return true;
        }

        return false;
    }

    setInternalFlag() {
        localStorage.setItem('isInternalUser', 'true');
        // Optionally set a 30-day expiry
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        localStorage.setItem('internalUserExpiry', expiry.toISOString());
    }

    clearInternalFlag() {
        localStorage.removeItem('isInternalUser');
        localStorage.removeItem('internalUserExpiry');
    }

    shouldTrackAnalytics() {
        // Check if internal user flag has expired
        const expiry = localStorage.getItem('internalUserExpiry');
        if (expiry && new Date(expiry) < new Date()) {
            this.clearInternalFlag();
            this.isInternalTraffic = false;
        }

        return !this.isInternalTraffic;
    }

    // Get debug info for testing
    getDebugInfo() {
        return {
            isInternalTraffic: this.isInternalTraffic,
            trackingEnabled: this.shouldTrackAnalytics(),
            hostname: window.location.hostname,
            hasInternalFlag: localStorage.getItem('isInternalUser') === 'true',
            flagExpiry: localStorage.getItem('internalUserExpiry')
        };
    }
}

// Initialize config
window.analyticsConfig = new AnalyticsConfig();