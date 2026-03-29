// Spotify Playlist Creator - OAuth PKCE flow + playlist creation
(function() {
    'use strict';

    // ========================================
    // CONFIG - Update this after Spotify setup
    // ========================================
    const SPOTIFY_CLIENT_ID = '11a30b5fb40d4050a08645cdb94c1c0a';
    const REDIRECT_URI = window.location.origin + '/callback.html';
    const SCOPES = 'playlist-modify-public';

    // ========================================
    // PKCE Helpers
    // ========================================

    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return Array.from(values, v => chars[v % chars.length]).join('');
    }

    async function sha256(plain) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return crypto.subtle.digest('SHA-256', data);
    }

    function base64UrlEncode(buffer) {
        const bytes = new Uint8Array(buffer);
        let str = '';
        bytes.forEach(b => str += String.fromCharCode(b));
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    async function generateCodeChallenge(verifier) {
        const hashed = await sha256(verifier);
        return base64UrlEncode(hashed);
    }

    // ========================================
    // Auth Flow
    // ========================================

    let authPopup = null;

    async function startAuth() {
        const codeVerifier = generateRandomString(128);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateRandomString(32);

        // Store for token exchange
        sessionStorage.setItem('spotify_code_verifier', codeVerifier);
        sessionStorage.setItem('spotify_auth_state', state);

        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('scope', SCOPES);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('code_challenge', codeChallenge);

        // Open popup
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;
        authPopup = window.open(
            authUrl.toString(),
            'spotify-auth',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Check if popup was blocked
        if (!authPopup || authPopup.closed) {
            throw new Error('Popup blocked');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Auth timed out'));
            }, 120000);

            // Also watch for popup being closed without completing auth
            const popupCheck = setInterval(() => {
                if (authPopup && authPopup.closed) {
                    clearInterval(popupCheck);
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    reject(new Error('Login window closed'));
                }
            }, 500);

            function handler(event) {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type !== 'spotify-auth-callback') return;

                clearInterval(popupCheck);
                clearTimeout(timeout);
                window.removeEventListener('message', handler);

                const savedState = sessionStorage.getItem('spotify_auth_state');
                if (event.data.state !== savedState) {
                    reject(new Error('State mismatch'));
                    return;
                }

                resolve(event.data.code);
            }

            window.addEventListener('message', handler);
        });
    }

    async function exchangeCodeForToken(code) {
        const codeVerifier = sessionStorage.getItem('spotify_code_verifier');

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Token exchange failed: ${errText}`);
        }

        const data = await response.json();

        // Clean up
        sessionStorage.removeItem('spotify_code_verifier');
        sessionStorage.removeItem('spotify_auth_state');

        return data.access_token;
    }

    // ========================================
    // Spotify API Calls
    // ========================================

    async function getCurrentUserId(token) {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to get user profile');
        const data = await response.json();
        return data.id;
    }

    async function createPlaylist(token, userId, songCount) {
        const today = new Date().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });

        const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `My Kanye Top ${songCount}`,
                description: `Ranked on ${today} at kanyeranker.com`,
                public: true
            })
        });

        if (!response.ok) throw new Error('Failed to create playlist');
        return response.json();
    }

    async function addTracksToPlaylist(token, playlistId, trackUris) {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: trackUris })
        });

        if (!response.ok) throw new Error('Failed to add tracks');
        return response.json();
    }

    // ========================================
    // Main Flow
    // ========================================

    async function createSpotifyPlaylist(topSongs) {
        // Filter songs that have Spotify URIs
        const songsWithUris = topSongs.filter(s => s.spotifyUri);

        if (songsWithUris.length === 0) {
            throw new Error('None of your top songs have Spotify links. This feature is coming soon!');
        }

        // Step 1: Authenticate
        const code = await startAuth();

        // Step 2: Exchange for token
        const token = await exchangeCodeForToken(code);

        // Step 3: Get user ID
        const userId = await getCurrentUserId(token);

        // Step 4: Create playlist
        const playlist = await createPlaylist(token, userId, songsWithUris.length);

        // Step 5: Add tracks (in ranked order)
        const trackUris = songsWithUris.map(s => s.spotifyUri);
        await addTracksToPlaylist(token, playlist.id, trackUris);

        return {
            url: playlist.external_urls.spotify,
            name: playlist.name,
            trackCount: songsWithUris.length,
            skipped: topSongs.length - songsWithUris.length
        };
    }

    // ========================================
    // UI Integration
    // ========================================

    function isConfigured() {
        return SPOTIFY_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE';
    }

    function injectSpotifyBanner() {
        // Don't inject if not configured
        if (!isConfigured()) return;

        // Don't double-inject
        if (document.getElementById('spotify-playlist-banner')) return;

        const topSongs = document.getElementById('top-songs');
        if (!topSongs) return;

        const banner = document.createElement('div');
        banner.id = 'spotify-playlist-banner';
        banner.className = 'spotify-playlist-banner';
        banner.innerHTML = `
            <div class="spotify-banner-content">
                <div class="spotify-banner-left">
                    <svg class="spotify-icon" viewBox="0 0 24 24" width="32" height="32">
                        <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <div class="spotify-banner-text">
                        <strong>Listen to your Top 10</strong>
                        <span>Create a Spotify playlist with your ranked songs</span>
                    </div>
                </div>
                <button id="spotify-create-btn" class="spotify-create-btn">
                    <span class="spotify-btn-label">Create Playlist</span>
                    <span class="spotify-btn-loading" style="display:none;">
                        <span class="spotify-spinner"></span> Creating...
                    </span>
                    <span class="spotify-btn-done" style="display:none;">
                        Open in Spotify
                    </span>
                </button>
            </div>
            <div id="spotify-banner-message" class="spotify-banner-message" style="display:none;"></div>
        `;

        // Insert at the very top of the results container, before everything else
        const container = topSongs.closest('.container');
        if (container) {
            container.insertBefore(banner, container.firstChild);
        } else {
            topSongs.parentNode.insertBefore(banner, topSongs);
        }

        // Trigger slide-in animation after a frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                banner.classList.add('spotify-banner-visible');
            });
        });

        // Attach click handler
        document.getElementById('spotify-create-btn').addEventListener('click', handleCreatePlaylist);
    }

    function getTopSongsFromApp() {
        // Access the global app instance to get ranked songs with their data
        const app = window.kanyeApp;
        if (app && typeof app.getTopSongs === 'function') {
            return app.getTopSongs(10);
        }

        return [];
    }

    async function handleCreatePlaylist() {
        const btn = document.getElementById('spotify-create-btn');
        const labelEl = btn.querySelector('.spotify-btn-label');
        const loadingEl = btn.querySelector('.spotify-btn-loading');
        const doneEl = btn.querySelector('.spotify-btn-done');
        const messageEl = document.getElementById('spotify-banner-message');

        // Get top songs
        const topSongs = getTopSongsFromApp();
        if (topSongs.length === 0) {
            showMessage(messageEl, 'Could not find your ranked songs. Please try again.', 'error');
            return;
        }

        // Show loading state
        labelEl.style.display = 'none';
        loadingEl.style.display = 'inline-flex';
        btn.disabled = true;
        messageEl.style.display = 'none';

        try {
            const result = await createSpotifyPlaylist(topSongs);

            // Show success
            loadingEl.style.display = 'none';
            doneEl.style.display = 'inline';
            btn.disabled = false;
            btn.classList.add('spotify-btn-success');

            // Make button open the playlist
            btn.onclick = () => window.open(result.url, '_blank');

            let msg = `"${result.name}" created with ${result.trackCount} songs!`;
            if (result.skipped > 0) {
                msg += ` (${result.skipped} song${result.skipped > 1 ? 's' : ''} not available on Spotify)`;
            }
            showMessage(messageEl, msg, 'success');

            // Track in analytics
            if (typeof gtag === 'function') {
                gtag('event', 'spotify_playlist_created', {
                    event_category: 'engagement',
                    event_label: 'spotify_playlist',
                    value: result.trackCount
                });
            }

        } catch (err) {
            // Reset button
            loadingEl.style.display = 'none';
            labelEl.style.display = 'inline';
            btn.disabled = false;

            const messages = {
                'Popup blocked': 'Please allow popups for this site and try again.',
                'Auth timed out': 'Spotify login timed out. Please try again.',
                'Login window closed': 'Spotify login was cancelled. Try again when ready.',
                'State mismatch': 'Security check failed. Please try again.',
                'Token exchange failed': 'Could not connect to Spotify. Please try again.'
            };
            const matchedKey = Object.keys(messages).find(k => err.message.startsWith(k));
            showMessage(messageEl, matchedKey ? messages[matchedKey] : `Error: ${err.message}`, 'error');
            console.error('Spotify playlist error:', err);
        }
    }

    function showMessage(el, text, type) {
        el.textContent = text;
        el.className = `spotify-banner-message spotify-msg-${type}`;
        el.style.display = 'block';
    }

    // ========================================
    // Styles
    // ========================================

    function addStyles() {
        if (document.getElementById('spotify-playlist-styles')) return;

        const style = document.createElement('style');
        style.id = 'spotify-playlist-styles';
        style.textContent = `
            .spotify-playlist-banner {
                background: linear-gradient(135deg, #191414 0%, #1a1a2e 100%);
                border: 1px solid #1DB954;
                border-radius: 16px;
                padding: 16px 20px;
                margin: 0 auto 24px;
                max-width: 520px;
                color: #fff;
                opacity: 0;
                transform: translateY(-12px);
                transition: opacity 0.4s ease, transform 0.4s ease;
            }

            .spotify-playlist-banner.spotify-banner-visible {
                opacity: 1;
                transform: translateY(0);
            }

            .spotify-banner-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
            }

            .spotify-banner-left {
                display: flex;
                align-items: center;
                gap: 14px;
                flex: 1;
                min-width: 0;
            }

            .spotify-icon {
                flex-shrink: 0;
            }

            .spotify-banner-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }

            .spotify-banner-text strong {
                font-size: 16px;
                font-weight: 700;
                color: #fff;
            }

            .spotify-banner-text span {
                font-size: 13px;
                color: #b3b3b3;
            }

            .spotify-create-btn {
                background: #1DB954;
                color: #000;
                border: none;
                border-radius: 500px;
                padding: 12px 28px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }

            .spotify-create-btn:hover {
                background: #1ed760;
                transform: scale(1.03);
            }

            .spotify-create-btn:active {
                transform: scale(0.98);
            }

            .spotify-create-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
            }

            .spotify-create-btn.spotify-btn-success {
                background: #1DB954;
            }

            .spotify-create-btn.spotify-btn-success:hover {
                background: #1ed760;
            }

            .spotify-spinner {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid rgba(0,0,0,0.2);
                border-top-color: #000;
                border-radius: 50%;
                animation: spotify-spin 0.6s linear infinite;
            }

            @keyframes spotify-spin {
                to { transform: rotate(360deg); }
            }

            .spotify-btn-loading {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .spotify-banner-message {
                margin-top: 12px;
                padding: 10px 14px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
            }

            .spotify-msg-success {
                background: rgba(29, 185, 84, 0.15);
                color: #1DB954;
            }

            .spotify-msg-error {
                background: rgba(255, 75, 75, 0.15);
                color: #ff4b4b;
            }

            /* Dark mode compatibility - banner already dark so minimal changes */
            body.dark-mode .spotify-playlist-banner {
                border-color: #1DB95480;
            }

            /* Mobile responsive */
            @media (max-width: 600px) {
                .spotify-playlist-banner {
                    padding: 14px 16px;
                    margin: 0 auto 20px;
                    max-width: 100%;
                }

                .spotify-banner-content {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 14px;
                }

                .spotify-banner-left {
                    gap: 12px;
                }

                .spotify-icon {
                    width: 28px;
                    height: 28px;
                }

                .spotify-banner-text strong {
                    font-size: 15px;
                }

                .spotify-banner-text span {
                    font-size: 12px;
                }

                .spotify-create-btn {
                    width: 100%;
                    justify-content: center;
                    padding: 14px 28px;
                    font-size: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ========================================
    // Initialize
    // ========================================

    function init() {
        addStyles();

        // Watch for results screen becoming active
        const resultsScreen = document.getElementById('results-screen');
        if (!resultsScreen) return;

        // If already active, inject now
        if (resultsScreen.classList.contains('active')) {
            setTimeout(injectSpotifyBanner, 300);
        }

        // Watch for future activations
        const observer = new MutationObserver(function(mutations) {
            for (let mutation of mutations) {
                if (mutation.target.id === 'results-screen' &&
                    mutation.target.classList.contains('active')) {
                    setTimeout(injectSpotifyBanner, 300);
                    break;
                }
            }
        });

        observer.observe(resultsScreen, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for testing
    window.SpotifyPlaylist = {
        createPlaylist: createSpotifyPlaylist,
        isConfigured: isConfigured
    };

})();
