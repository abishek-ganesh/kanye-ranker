/**
 * Google Analytics 4 Integration for Kanye Ranker
 * Tracks user interactions and behavior without requiring backend
 */

class Analytics {
    constructor() {
        this.isEnabled = typeof gtag !== 'undefined';
        if (!this.isEnabled) {
            console.warn('Google Analytics not loaded - analytics disabled');
        } else {
            console.log('Google Analytics initialized');
        }
    }

    // Track custom events
    track(eventName, parameters = {}) {
        if (!this.isEnabled) return;
        
        // Log in development
        if (window.location.hostname === 'localhost') {
            console.log('Analytics Event:', eventName, parameters);
        }
        
        gtag('event', eventName, {
            ...parameters,
            timestamp: new Date().toISOString()
        });
    }

    // Specific tracking methods
    trackRankingStarted() {
        this.track('ranking_started', {
            event_category: 'engagement',
            event_label: 'start'
        });
    }

    trackComparisonMade(comparisonNumber, totalComparisons) {
        this.track('comparison_made', {
            event_category: 'engagement',
            comparison_number: comparisonNumber,
            total_comparisons: totalComparisons,
            completion_percentage: Math.round((comparisonNumber / totalComparisons) * 100)
        });
    }

    trackComparisonSkipped(comparisonNumber) {
        this.track('comparison_skipped', {
            event_category: 'engagement',
            comparison_number: comparisonNumber
        });
    }

    trackRankingCompleted(totalComparisons, topAlbum, topSong) {
        this.track('ranking_completed', {
            event_category: 'engagement',
            event_label: 'complete',
            total_comparisons: totalComparisons,
            top_album: topAlbum,
            top_song: topSong
        });
    }

    trackSongsExported(topAlbum) {
        this.track('songs_image_exported', {
            event_category: 'export',
            event_label: 'songs',
            top_album: topAlbum
        });
    }

    trackAlbumsExported(topAlbum) {
        this.track('albums_image_exported', {
            event_category: 'export',
            event_label: 'albums',
            top_album: topAlbum
        });
    }

    trackShareClicked(platform) {
        this.track('share_clicked', {
            event_category: 'social',
            event_label: platform,
            platform: platform
        });
    }

    trackFeedbackSubmitted(hasEmail) {
        this.track('feedback_submitted', {
            event_category: 'engagement',
            event_label: 'feedback',
            has_email: hasEmail
        });
    }

    trackContinueRanking(fromComparison) {
        this.track('continue_ranking', {
            event_category: 'engagement',
            event_label: 'continue',
            from_comparison: fromComparison
        });
    }

    trackDarkModeToggled(isDarkMode) {
        this.track('dark_mode_toggled', {
            event_category: 'ui',
            event_label: isDarkMode ? 'dark' : 'light',
            is_dark_mode: isDarkMode
        });
    }

    trackSessionLoaded() {
        this.track('session_loaded', {
            event_category: 'engagement',
            event_label: 'load_session'
        });
    }

    trackError(errorMessage, errorLocation) {
        this.track('error_occurred', {
            event_category: 'error',
            error_message: errorMessage,
            error_location: errorLocation
        });
    }
}

// Initialize analytics as soon as script loads
window.analytics = new Analytics();

// Also make available as a module export if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Analytics;
}