/**
 * Google Analytics 4 Integration for Kanye Ranker
 * Tracks user interactions and behavior without requiring backend
 */

class Analytics {
    constructor() {
        this.isEnabled = typeof gtag !== 'undefined';
        this.sessionStartTime = Date.now();
        this.comparisonStartTime = null;
        this.pageViewTime = Date.now();
        
        if (!this.isEnabled) {
            console.warn('Google Analytics not loaded - analytics disabled');
        } else {
            console.log('Google Analytics initialized');
            this.initializeUserProperties();
        }
    }

    // Initialize user properties
    initializeUserProperties() {
        if (!this.isEnabled) return;
        
        // Set user properties
        gtag('set', 'user_properties', {
            app_version: '1.0.0',
            theme_preference: localStorage.getItem('theme') || 'light'
        });
    }

    // Track custom events with enhanced parameters
    track(eventName, parameters = {}) {
        if (!this.isEnabled) return;
        
        // Log in development
        if (window.location.hostname === 'localhost') {
            console.log('Analytics Event:', eventName, parameters);
        }
        
        // Add common parameters
        const enhancedParams = {
            ...parameters,
            timestamp: new Date().toISOString(),
            session_duration: Math.round((Date.now() - this.sessionStartTime) / 1000),
            page_time: Math.round((Date.now() - this.pageViewTime) / 1000)
        };
        
        gtag('event', eventName, enhancedParams);
    }

    // Track page views with custom parameters
    trackPageView(pageName, additionalParams = {}) {
        this.pageViewTime = Date.now();
        this.track('page_view', {
            page_title: pageName,
            page_location: window.location.href,
            page_path: window.location.pathname,
            ...additionalParams
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

    // Session tracking removed - no longer saving/loading sessions

    trackError(errorMessage, errorLocation) {
        this.track('error_occurred', {
            event_category: 'error',
            error_message: errorMessage,
            error_location: errorLocation
        });
    }

    // Track song preview interactions
    trackSongPreviewed(songTitle, albumName, previewSource = 'button') {
        this.track('song_previewed', {
            event_category: 'engagement',
            event_label: 'preview',
            song_title: songTitle,
            album_name: albumName,
            preview_source: previewSource
        });
    }

    // Track external link clicks
    trackExternalLinkClick(linkType, songTitle, albumName) {
        this.track('external_link_clicked', {
            event_category: 'external_links',
            event_label: linkType,
            link_type: linkType,
            song_title: songTitle,
            album_name: albumName
        });
    }

    // Track detailed song comparison
    trackSongComparison(winner, loser, comparisonNumber, timeTaken) {
        this.track('song_compared', {
            event_category: 'gameplay',
            event_label: 'comparison',
            winner_song: winner.title,
            winner_album: winner.album,
            loser_song: loser.title,
            loser_album: loser.album,
            comparison_number: comparisonNumber,
            time_taken_seconds: timeTaken
        });
    }

    // Track early exit
    trackEarlyExit(comparisonNumber, totalComparisons) {
        this.track('ranking_early_exit', {
            event_category: 'engagement',
            event_label: 'early_exit',
            comparisons_completed: comparisonNumber,
            total_possible: totalComparisons,
            completion_rate: Math.round((comparisonNumber / totalComparisons) * 100)
        });
    }

    // Track user timing for comparisons
    startComparisonTimer() {
        this.comparisonStartTime = Date.now();
    }

    endComparisonTimer() {
        if (this.comparisonStartTime) {
            const duration = Date.now() - this.comparisonStartTime;
            this.comparisonStartTime = null;
            return Math.round(duration / 1000); // Return seconds
        }
        return 0;
    }

    // Track results interaction
    trackResultsInteraction(action, details = {}) {
        this.track('results_interaction', {
            event_category: 'results',
            event_label: action,
            action: action,
            ...details
        });
    }

    // Track album performance
    trackAlbumRanking(albumRankings) {
        this.track('album_rankings_generated', {
            event_category: 'results',
            event_label: 'album_rankings',
            top_album: albumRankings[0]?.name || 'Unknown',
            top_3_albums: albumRankings.slice(0, 3).map(a => a.name).join(', ')
        });
    }

    // Track user preferences
    trackUserPreference(preference, value) {
        this.track('user_preference_changed', {
            event_category: 'preferences',
            preference_type: preference,
            preference_value: value
        });
        
        // Update user properties
        gtag('set', 'user_properties', {
            [preference]: value
        });
    }

    // Track performance metrics
    trackPerformanceMetric(metricName, value, unit = 'ms') {
        if (!this.isEnabled) return;
        
        // Use GA4's recommended approach for performance tracking
        gtag('event', 'timing_complete', {
            name: metricName,
            value: Math.round(value),
            event_category: 'performance',
            event_label: unit
        });
    }
}

// Initialize analytics as soon as script loads
window.analytics = new Analytics();

// Also make available as a module export if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Analytics;
}