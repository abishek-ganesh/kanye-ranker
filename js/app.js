/**
 * Kanye Ranker - An ELO-based song ranking application
 * Created by Abishek Ganesh
 * 
 * Main application logic
 */
class KanyeRankerApp {
    constructor() {
        console.log('KanyeRankerApp constructor called');
        
        try {
            this.ui = new UI();
            console.log('UI initialized');
        } catch (error) {
            console.error('Failed to initialize UI:', error);
            throw error;
        }
        
        try {
            this.elo = new EloRating(32);
            console.log('EloRating initialized');
        } catch (error) {
            console.error('Failed to initialize EloRating:', error);
            throw error;
        }
        
        // Share system removed per user request
        // try {
        //     this.share = new KanyeRankerShare();
        //     console.log('Share system initialized');
        // } catch (error) {
        //     console.error('Failed to initialize share system:', error);
        // }
        
        this.songs = [];
        this.albums = new Map();
        this.songRatings = new Map();
        this.pairings = [];
        this.currentPairIndex = 0;
        this.sessionStartTime = Date.now();
        this.minComparisons = 50;
        this.maxComparisons = 150;
        this.isProcessingChoice = false;
        this.ratingSnapshots = {};
        this.backButton = null;
        
        // Exploration/Exploitation tracking
        this.userFavorites = new Set(); // Track songs user has chosen as winners
        this.explorationPhase = 'popular'; // 'popular', 'mixed', 'exploitation'
        
        // Dynamic pairing properties
        this.lastWinnerId = null; // Track the last winner for carry-over
        this.consecutiveWins = 0; // Track consecutive wins by the same song
        this.carryOverProbability = 0.75; // 75% chance to carry over winner
        this.comparisonsSinceBreak = 0; // Track comparisons for fatigue prevention
        this.useDynamicPairing = true; // Flag to use new dynamic system
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing KanyeRankerApp...');
            
            // Track initial page view
            if (window.analytics) {
                window.analytics.trackPageView('Landing Page', {
                    referrer: document.referrer,
                    user_agent: navigator.userAgent
                });
            }
            
            await this.loadData();
            console.log('Data loaded successfully');
            
            this.attachEventListeners();
            console.log('Event listeners attached');
            
            // Share system removed per user request
            // if (this.share) {
            //     this.share.init(this);
            //     console.log('Share system event listeners attached');
            // }
            
            // Initialize back button
            this.backButton = new BackButtonManager(this);
            console.log('Back button initialized');
            
            // Share functionality removed per user request
            // if (this.share) {
            //     const sharedSongIds = this.share.parseShareUrl();
            //     if (sharedSongIds) {
            //         await this.share.displaySharedResults(sharedSongIds);
            //         return;
            //     }
            // }
            
            // Session saving removed - users start fresh each time
            
            console.log('App initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
            this.ui.showError('Failed to initialize app: ' + error.message);
            if (window.analytics) {
                window.analytics.trackError(error.message, 'app_init');
            }
            throw error;
        }
    }
    
    async loadData() {
        try {
            // Ensure KanyeMessages is loaded and has the method
            const loadingMessage = (window.KanyeMessages && typeof window.KanyeMessages.getRandomMessage === 'function') ? 
                window.KanyeMessages.getRandomMessage('loading') : 
                'Loading song database...';
            this.ui.showOverlay(loadingMessage);
            console.log('Fetching data/songs.json...');
            const response = await fetch('data/songs.json');
            console.log('Fetch response:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Parsed data:', data);
            
            if (!data.songs) {
                throw new Error('No songs array found in data');
            }
            
            this.songs = data.songs;
            console.log(`Loaded ${this.songs.length} songs`);
            
            data.albums.forEach(album => {
                this.albums.set(album.id, album);
            });
            console.log(`Loaded ${this.albums.size} albums`);
            
            this.songs.forEach(song => {
                this.songRatings.set(song.id, song.initialRating);
            });
            
            this.ui.hideOverlay();
            
        } catch (error) {
            console.error('Error loading data:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            this.ui.hideOverlay();
            
            // Check if this is a CORS error from file:// protocol
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.ui.showError('Failed to load song data. Please run a local server (e.g., python -m http.server) or use a web server to access this app.');
            } else {
                this.ui.showError(`Failed to load song data: ${error.message}. Please refresh the page.`);
            }
            
            // Initialize empty arrays to prevent further errors
            this.songs = [];
            this.albums = new Map();
        }
    }
    
    attachEventListeners() {
        console.log('Attaching event listeners...');
        
        // Core buttons
        if (this.ui.elements.startButton) {
            this.ui.elements.startButton.addEventListener('click', () => {
                console.log('Start button clicked');
                this.startRanking();
            });
            console.log('Start button listener attached');
        }
        
        if (this.ui.elements.skipButton) {
            this.ui.elements.skipButton.addEventListener('click', () => {
                console.log('Skip button clicked');
                this.skipComparison();
            });
            console.log('Skip button listener attached');
        }
        
        if (this.ui.elements.showResultsButton) {
            this.ui.elements.showResultsButton.addEventListener('click', () => {
                console.log('Show results button clicked');
                
                // Track early exit
                if (window.analytics) {
                    const totalPossible = this.useDynamicPairing ? 
                        Math.max(this.minComparisons, this.pairings.length + 10) : 
                        this.pairings.length;
                    window.analytics.trackEarlyExit(
                        this.elo.getCompletedComparisons(),
                        totalPossible
                    );
                }
                
                this.showResults();
            });
            console.log('Show results button listener attached');
        }
        
        if (this.ui.elements.restartButton) {
            this.ui.elements.restartButton.addEventListener('click', () => {
                console.log('Restart button clicked');
                this.restart();
            });
        }
        
        // Continue ranking button
        const continueRankingBtn = document.getElementById('continue-ranking');
        if (continueRankingBtn) {
            continueRankingBtn.addEventListener('click', () => {
                console.log('Continue ranking button clicked');
                this.continueRanking();
            });
        }
        
        // Export buttons
        if (this.ui.elements.exportSongsImageButton) {
            this.ui.elements.exportSongsImageButton.addEventListener('click', () => {
                console.log('Export songs image button clicked');
                this.exportSongsImage();
            });
        }
        
        if (this.ui.elements.exportAlbumsImageButton) {
            this.ui.elements.exportAlbumsImageButton.addEventListener('click', () => {
                console.log('Export albums image button clicked');
                this.exportAlbumsImage();
            });
        }
        
        // Song choice buttons
        if (this.ui.elements.songCards.a.chooseBtn) {
            this.ui.elements.songCards.a.chooseBtn.addEventListener('click', () => {
                console.log('Choose A button clicked');
                this.chooseSong('a');
            });
            console.log('Choose A button listener attached');
        } else {
            console.error('Choose A button not found!');
        }
        
        if (this.ui.elements.songCards.b.chooseBtn) {
            this.ui.elements.songCards.b.chooseBtn.addEventListener('click', () => {
                console.log('Choose B button clicked');
                this.chooseSong('b');
            });
            console.log('Choose B button listener attached');
        } else {
            console.error('Choose B button not found!');
        }
        
        // Make entire song cards clickable
        if (this.ui.elements.songCards.a.container) {
            this.ui.elements.songCards.a.container.style.cursor = 'pointer';
            this.ui.elements.songCards.a.container.addEventListener('click', (e) => {
                // Don't trigger if clicking on links or preview button
                if (e.target.tagName === 'A' || e.target.classList.contains('preview-btn')) {
                    return;
                }
                console.log('Song card A clicked');
                this.chooseSong('a');
            });
            console.log('Song card A click listener attached');
        }
        
        if (this.ui.elements.songCards.b.container) {
            this.ui.elements.songCards.b.container.style.cursor = 'pointer';
            this.ui.elements.songCards.b.container.addEventListener('click', (e) => {
                // Don't trigger if clicking on links or preview button
                if (e.target.tagName === 'A' || e.target.classList.contains('preview-btn')) {
                    return;
                }
                console.log('Song card B clicked');
                this.chooseSong('b');
            });
            console.log('Song card B click listener attached');
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Add external link tracking
        document.addEventListener('click', (e) => {
            // Track YouTube link clicks
            if (e.target.id && (e.target.id === 'youtube-a' || e.target.id === 'youtube-b')) {
                const songCard = e.target.closest('.song-card');
                const songTitle = songCard?.querySelector('.song-title')?.textContent || '';
                const albumName = songCard?.querySelector('.album-name')?.textContent || '';
                
                if (window.analytics) {
                    window.analytics.trackExternalLinkClick('youtube', songTitle, albumName);
                }
            }
            
            // Track Lyrics link clicks
            if (e.target.id && (e.target.id === 'lyrics-a' || e.target.id === 'lyrics-b')) {
                const songCard = e.target.closest('.song-card');
                const songTitle = songCard?.querySelector('.song-title')?.textContent || '';
                const albumName = songCard?.querySelector('.album-name')?.textContent || '';
                
                if (window.analytics) {
                    window.analytics.trackExternalLinkClick('lyrics', songTitle, albumName);
                }
            }
        });
        
        console.log('All event listeners attached');
    }
    
    
    startRanking() {
        console.log('Starting ranking...');
        console.log('Songs loaded:', this.songs.length);
        console.log('Albums loaded:', this.albums.size);
        
        // Track page view for comparison screen
        if (window.analytics) {
            window.analytics.trackPageView('Comparison Screen');
            window.analytics.trackRankingStarted();
        }
        
        if (this.songs.length === 0) {
            this.ui.showError('No songs loaded. Please refresh the page.');
            return;
        }
        
        // Clear any previous comparison history for a fresh start
        this.elo = new EloRating(32);
        this.currentPairIndex = 0;
        
        // Clear any cached data that might have old paths
        localStorage.removeItem('albumCache');
        localStorage.removeItem('songsCache');
        // Clear ALL localStorage to eliminate any cached old album paths
        Object.keys(localStorage).forEach(key => {
            if (key.includes('album') || key.includes('vultures') || key.includes('cover')) {
                localStorage.removeItem(key);
            }
        });
        
        this.generatePairings();
        if (this.pairings.length === 0) {
            this.ui.showError('Failed to generate pairings. Please refresh the page.');
            return;
        }
        
        console.log(`Generated ${this.pairings.length} pairings`);
        console.log('First 5 pairings:');
        this.pairings.slice(0, 5).forEach((pair, i) => {
            const songA = this.songs.find(s => s.id === pair[0]);
            const songB = this.songs.find(s => s.id === pair[1]);
            console.log(`${i + 1}: "${songA?.title}" (${(songA?.spotifyStreams || 0).toLocaleString()} streams) vs "${songB?.title}" (${(songB?.spotifyStreams || 0).toLocaleString()} streams)`);
        });
        
        // Add delay to ensure DOM is ready
        setTimeout(() => {
            this.ui.showScreen('comparison');
            // Initialize the completed comparisons display to 0
            if (this.ui.elements.completedComparisons) {
                this.ui.elements.completedComparisons.textContent = '0';
            }
            setTimeout(() => {
                // Ensure album colors are loaded
                if (!window.getAlbumColors && window.AlbumColors) {
                    window.getAlbumColors = window.AlbumColors.getColors;
                }
                this.showNextComparison();
            }, 200);
        }, 100);
    }
    
    initializeSongTiers() {
        const songIds = Array.from(this.songRatings.keys());
        console.log(`Initializing song tiers for ${songIds.length} songs`);
        
        // Define Kanye's most popular albums that should appear more often
        // Added 'grad' (Graduation) and 'cruel' (Cruel Summer) to the list per user request
        const popularAlbumIds = ['cd', 'lr', 'grad', '808s', 'mbdtf', 'wtt', 'cruel', 'yeezus', 'tlop'];
        
        // Sort ALL songs by spotifyStreams to get ACTUAL popularity ranking
        const songsWithStreams = this.songs
            .filter(song => songIds.includes(song.id))
            .map(song => ({
                id: song.id,
                title: song.title,
                albumId: song.albumId,
                spotifyStreams: song.spotifyStreams || 0,
                spotifyRank: song.spotifyRank || 999,
                isFromPopularAlbum: popularAlbumIds.includes(song.albumId),
                song: song
            }))
            .sort((a, b) => {
                // Sort by actual Spotify streams (higher is better)
                return b.spotifyStreams - a.spotifyStreams;
            });
        
        // Create different tiers of songs by ACTUAL stream count
        const top20Songs = songsWithStreams.slice(0, 20);
        const top50Songs = songsWithStreams.slice(0, 50);
        const top100Songs = songsWithStreams.slice(0, 100);
        
        // Also create a special tier for moderately popular songs from classic albums
        const classicAlbumSongs = songsWithStreams
            .filter(s => s.isFromPopularAlbum && s.spotifyStreams > 10000000)
            .slice(0, 80); // Top 80 songs from classic albums
        
        // Create Sets for O(1) lookup to strictly enforce tier boundaries
        this.top20SongIds = new Set(top20Songs.map(s => s.id));
        this.top50SongIds = new Set(top50Songs.map(s => s.id));
        this.top100SongIds = new Set(top100Songs.map(s => s.id));
        this.classicAlbumSongIds = new Set(classicAlbumSongs.map(s => s.id));
        this.allSongIds = new Set(songIds);
        
        // Also keep arrays for random selection
        this.top20Array = Array.from(this.top20SongIds);
        this.top50Array = Array.from(this.top50SongIds);
        this.top100Array = Array.from(this.top100SongIds);
        this.classicAlbumArray = Array.from(this.classicAlbumSongIds);
        this.allSongsArray = songIds;
        
        console.log(`Song tiers: Top 20: ${top20Songs.length}, Top 50: ${top50Songs.length}, Top 100: ${top100Songs.length}`);
        console.log(`Classic album songs: ${classicAlbumSongs.length} songs from ${popularAlbumIds.join(', ')}`);
        
        console.log('=== TOP 20 SONGS FOR EARLY COMPARISONS ===');
        top20Songs.forEach((s, i) => {
            const album = this.albums.get(s.albumId);
            console.log(`${i + 1}. "${s.title}" (${album?.name}) - Streams: ${s.spotifyStreams.toLocaleString()}`);
        });
        console.log('=== END TOP 20 ===');
        
        // Track shown songs
        this.shownSongs = new Set();
        
        // Create a list of top mainstream songs from each album for early comparisons
        this.albumTopSongs = new Map();
        const allAlbumIds = [...new Set(this.songs.map(s => s.albumId))];
        
        // Define songs to exclude from early comparisons (deep cuts, interludes, etc.)
        const excludedSongs = new Set([
            'Frank\'s Track', 'Skit #1', 'Skit #2', 'Skit #3', 'Skit #4', 
            'Intro', 'Outro', 'Interlude', 'I Love Kanye', 'Low Lights',
            'Pt. 2', 'Silver Surfer Intermission', 'Facts (Charlie Heat Version)',
            'Freestyle 4', '30 Hours', 'Feedback', 'Highlights'
        ]);
        
        allAlbumIds.forEach(albumId => {
            // Filter to get only mainstream songs (very high streams, not deep cuts)
            const albumSongs = songsWithStreams
                .filter(s => s.albumId === albumId && 
                            s.spotifyStreams > 150000000 && // Increased to 150M streams
                            !excludedSongs.has(s.title) &&
                            !s.title.toLowerCase().includes('skit') &&
                            !s.title.toLowerCase().includes('interlude') &&
                            !s.title.toLowerCase().includes('freestyle'))
                .slice(0, 3); // Get top 3 to ensure we have good options
            
            // If we don't have enough mainstream songs, get the absolute top songs
            const finalSongs = albumSongs.length >= 2 ? albumSongs.slice(0, 2) : 
                               songsWithStreams
                                   .filter(s => s.albumId === albumId && !excludedSongs.has(s.title))
                                   .slice(0, 2);
            
            if (finalSongs.length > 0) {
                this.albumTopSongs.set(albumId, finalSongs.map(s => s.id));
                console.log(`Album ${albumId}: ${finalSongs.map(s => s.title).join(', ')}`);
            }
        });
        
        // Flatten all top album songs into a single array
        this.allAlbumTopSongs = Array.from(this.albumTopSongs.values()).flat();
        
        console.log(`Albums with top songs: ${this.albumTopSongs.size}`);
        console.log(`Total album top songs: ${this.allAlbumTopSongs.length}`);
        
        // Track which albums have been shown
        this.shownAlbums = new Set();
    }
    
    getCurrentPhase() {
        const completedComparisons = this.elo.getCompletedComparisons();
        // Phase 1: First 15 comparisons - strictly top 20 most popular songs
        if (completedComparisons < 15) return { phase: 1, pool: this.top20Array, poolName: 'top20' };
        // Phase 2: Next 15 comparisons - expand to top 50
        if (completedComparisons < 30) return { phase: 2, pool: this.top50Array, poolName: 'top50' };
        // Phase 3: Next 20 comparisons - top 100 
        if (completedComparisons < 50) return { phase: 3, pool: this.top100Array, poolName: 'top100' };
        // Phase 4: General pool
        if (completedComparisons < 80) return { phase: 4, pool: this.allSongsArray, poolName: 'all' };
        // Phase 5: Finals mode for refining top rankings
        return { phase: 5, pool: this.allSongsArray, poolName: 'finals' };
    }
    
    shouldCarryOverWinner() {
        // Check fatigue prevention rules
        if (this.consecutiveWins >= 3) {
            console.log('Forcing new pair: Same song won 3 times in a row');
            return false;
        }
        
        if (this.comparisonsSinceBreak >= 7) {
            console.log('Forcing new pair: Mental break after 7 comparisons');
            return false;
        }
        
        // Otherwise use probability
        return Math.random() < this.carryOverProbability;
    }
    
    selectOpponentForWinner(winnerId, candidatePool) {
        const winnerRating = this.songRatings.get(winnerId);
        const candidates = candidatePool.filter(id => 
            id !== winnerId && 
            !this.elo.hasBeenCompared(winnerId, id) &&
            !this.elo.shouldSkipPairing(winnerId, id)
        );
        
        if (candidates.length === 0) {
            console.log('No valid opponents for winner, will select new pair');
            return null;
        }
        
        // Sort candidates by rating difference (prefer similar ratings)
        const candidatesWithScores = candidates.map(id => {
            const rating = this.songRatings.get(id);
            const ratingDiff = Math.abs(winnerRating - rating);
            const comparisonCount = this.elo.getComparisonCount(id);
            
            // Prefer songs with similar ratings and fewer comparisons
            const score = 1000 - ratingDiff - comparisonCount * 20;
            
            return { id, score, ratingDiff };
        }).sort((a, b) => b.score - a.score);
        
        // Select from top candidates with some randomness
        const topCandidates = candidatesWithScores.slice(0, 5);
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        console.log(`Selected opponent for winner: rating diff = ${selected.ratingDiff}`);
        return selected.id;
    }
    
    selectNewPair(candidatePool) {
        const poolSize = candidatePool.length;
        let attempts = 0;
        const maxAttempts = 100;
        
        // Define albums to deprioritize
        const deprioritizedAlbums = ['v1', 'donda', 'donda2', 'v2'];
        
        // Create a weighted pool that deprioritizes newer albums
        const weightedPool = candidatePool.map(songId => {
            const song = this.songs.find(s => s.id === songId);
            const isDeprioritized = song && deprioritizedAlbums.includes(song.albumId);
            // Give deprioritized albums only 20% weight
            return { songId, weight: isDeprioritized ? 0.2 : 1.0 };
        });
        
        // Helper function to select from weighted pool
        const selectWeighted = () => {
            const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const item of weightedPool) {
                random -= item.weight;
                if (random <= 0) {
                    return item.songId;
                }
            }
            return weightedPool[weightedPool.length - 1].songId;
        };
        
        while (attempts < maxAttempts) {
            const songIdA = selectWeighted();
            let songIdB = selectWeighted();
            
            while (songIdB === songIdA) {
                songIdB = selectWeighted();
            }
            
            if (!this.elo.hasBeenCompared(songIdA, songIdB) && 
                !this.elo.shouldSkipPairing(songIdA, songIdB)) {
                
                // Track shown songs
                this.shownSongs.add(songIdA);
                this.shownSongs.add(songIdB);
                
                return [songIdA, songIdB];
            }
            
            attempts++;
        }
        
        console.warn('Could not find valid new pair after', maxAttempts, 'attempts');
        return null;
    }
    
    shouldDoCrossTierChallenge() {
        const completedComparisons = this.elo.getCompletedComparisons();
        
        // Cross-tier challenges every 10 comparisons after the first 20
        if (completedComparisons >= 20 && completedComparisons % 10 === 0) {
            console.log('Time for a cross-tier challenge round!');
            return true;
        }
        return false;
    }
    
    generateCrossTierChallenge() {
        // Get current top 10 songs with confidence scores
        const rankedSongs = this.songs
            .map(song => ({
                id: song.id,
                rating: this.songRatings.get(song.id),
                comparisonCount: this.elo.getComparisonCount(song.id),
                confidence: this.elo.getRatingConfidence(song.id),
                avgOpponentRating: this.elo.getAverageOpponentRating(song.id, this.songRatings)
            }))
            .sort((a, b) => b.rating - a.rating);
        
        const top10 = rankedSongs.slice(0, 10);
        const nextTier = rankedSongs.slice(10, 30); // Songs ranked 11-30
        const lowerTier = rankedSongs.slice(30, 60); // Songs ranked 31-60
        
        // Pick a top 10 song with lowest confidence or weakest schedule
        const lowConfidenceTop10 = top10
            .map(song => ({
                ...song,
                // Prioritize songs with low confidence OR weak strength of schedule
                priority: (1 - song.confidence) + (1500 - song.avgOpponentRating) / 500
            }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 3); // Get 3 highest priority for testing
        
        if (lowConfidenceTop10.length === 0) return null;
        
        const topSong = lowConfidenceTop10[Math.floor(Math.random() * lowConfidenceTop10.length)];
        console.log(`Selected top 10 song for challenge: Confidence ${(topSong.confidence * 100).toFixed(1)}%, Avg opponent: ${topSong.avgOpponentRating.toFixed(0)}`);
        
        // Pick challenger from next tier (60%) or lower tier (40%)
        let challenger;
        if (Math.random() < 0.6 && nextTier.length > 0) {
            // Challenger from ranks 11-30 - prefer higher rated ones
            const challengers = nextTier
                .filter(song => !this.elo.hasBeenCompared(topSong.id, song.id))
                .slice(0, 10); // Top 10 from this tier
            
            if (challengers.length > 0) {
                challenger = challengers[Math.floor(Math.random() * Math.min(5, challengers.length))];
            }
        }
        
        if (!challenger && lowerTier.length > 0) {
            // Challenger from ranks 31-60 - pick exceptionally high confidence ones
            const strongChallengers = lowerTier
                .filter(song => 
                    !this.elo.hasBeenCompared(topSong.id, song.id) &&
                    song.confidence > 0.7 // Only very confident lower-tier songs
                )
                .slice(0, 5);
            
            if (strongChallengers.length > 0) {
                challenger = strongChallengers[Math.floor(Math.random() * strongChallengers.length)];
            } else {
                // Fallback to any challenger
                const anyChallengers = lowerTier.filter(song => 
                    !this.elo.hasBeenCompared(topSong.id, song.id)
                );
                if (anyChallengers.length > 0) {
                    challenger = anyChallengers[Math.floor(Math.random() * Math.min(10, anyChallengers.length))];
                }
            }
        }
        
        if (challenger) {
            const topRank = rankedSongs.indexOf(topSong) + 1;
            const challengerRank = rankedSongs.indexOf(challenger) + 1;
            console.log(`Cross-tier challenge: #${topRank} (conf: ${(topSong.confidence * 100).toFixed(1)}%) vs #${challengerRank} (conf: ${(challenger.confidence * 100).toFixed(1)}%)`);
            return [topSong.id, challenger.id];
        }
        
        return null;
    }
    
    generateFinalsPairing() {
        // In finals mode, focus on the top 20 songs
        const rankedSongs = this.songs
            .map(song => ({
                id: song.id,
                rating: this.songRatings.get(song.id),
                comparisonCount: this.elo.getComparisonCount(song.id),
                winRate: this.elo.getWinRate(song.id)
            }))
            .sort((a, b) => b.rating - a.rating);
        
        const top20 = rankedSongs.slice(0, 20);
        
        // Strategy for finals:
        // 70% - Top 10 vs Top 10 (refine exact order)
        // 20% - Top 10 vs 11-20 (validate top 10)
        // 10% - Wildcard from 21-40 vs Top 20
        
        const strategy = Math.random();
        let pair = null;
        
        if (strategy < 0.7) {
            // Top 10 vs Top 10
            const top10 = top20.slice(0, 10);
            pair = this.selectPairFromPool(top10.map(s => s.id));
            if (pair) {
                console.log('Finals: Top 10 vs Top 10 matchup');
            }
        }
        
        if (!pair && strategy < 0.9) {
            // Top 10 vs 11-20
            const top10 = top20.slice(0, 10);
            const next10 = top20.slice(10, 20);
            
            if (top10.length > 0 && next10.length > 0) {
                const song1 = top10[Math.floor(Math.random() * top10.length)];
                const candidates = next10.filter(s => !this.elo.hasBeenCompared(song1.id, s.id));
                
                if (candidates.length > 0) {
                    const song2 = candidates[Math.floor(Math.random() * candidates.length)];
                    pair = [song1.id, song2.id];
                    console.log('Finals: Top 10 vs 11-20 validation');
                }
            }
        }
        
        if (!pair) {
            // Wildcard challenge
            const wildcards = rankedSongs.slice(20, 40);
            const topCandidates = top20;
            
            if (wildcards.length > 0 && topCandidates.length > 0) {
                const wildcard = wildcards[Math.floor(Math.random() * wildcards.length)];
                const candidates = topCandidates.filter(s => !this.elo.hasBeenCompared(wildcard.id, s.id));
                
                if (candidates.length > 0) {
                    const opponent = candidates[Math.floor(Math.random() * candidates.length)];
                    pair = [wildcard.id, opponent.id];
                    console.log('Finals: Wildcard challenge');
                }
            }
        }
        
        return pair;
    }
    
    selectPairFromPool(songIds) {
        const maxAttempts = 50;
        let attempts = 0;
        
        while (attempts < maxAttempts && songIds.length >= 2) {
            const idx1 = Math.floor(Math.random() * songIds.length);
            let idx2 = Math.floor(Math.random() * songIds.length);
            
            while (idx2 === idx1) {
                idx2 = Math.floor(Math.random() * songIds.length);
            }
            
            const id1 = songIds[idx1];
            const id2 = songIds[idx2];
            
            if (!this.elo.hasBeenCompared(id1, id2) && !this.elo.shouldSkipPairing(id1, id2)) {
                return [id1, id2];
            }
            
            attempts++;
        }
        
        return null;
    }
    
    generateNextPairing() {
        const { phase, pool, poolName } = this.getCurrentPhase();
        const completedComparisons = this.elo.getCompletedComparisons();
        console.log(`Generating pairing for phase ${phase} (${poolName} pool), comparison #${completedComparisons + 1}`);
        
        // BALANCED APPROACH: Mix popular songs with album diversity in first 40 comparisons
        if (completedComparisons < 40) {
            // Check which albums haven't been shown yet
            const unshownAlbums = [];
            for (const [albumId, songIds] of this.albumTopSongs) {
                if (!this.shownAlbums.has(albumId)) {
                    unshownAlbums.push(albumId);
                }
            }
            
            // For first 10 comparisons: 90% popular songs, 10% album diversity
            // For comparisons 11-20: 70% popular songs, 30% album diversity
            // For comparisons 21-40: 50% popular songs, 50% album diversity
            const albumDiversityChance = completedComparisons < 10 ? 0.1 : 
                                         (completedComparisons < 20 ? 0.3 : 0.5);
            
            // If we have unshown albums and roll for diversity, show them
            if (unshownAlbums.length > 0 && Math.random() < albumDiversityChance) {
                const albumToShow = unshownAlbums[Math.floor(Math.random() * unshownAlbums.length)];
                const albumSongIds = this.albumTopSongs.get(albumToShow);
                
                if (albumSongIds && albumSongIds.length > 0) {
                    // Get the most popular song from this album that hasn't been shown
                    const songId = albumSongIds[0]; // First song is most popular
                    
                    // Pair with another popular song for quality comparison
                    const popularCandidates = this.top50Array.filter(id => 
                        id !== songId && 
                        !this.elo.hasBeenCompared(songId, id) &&
                        !this.elo.shouldSkipPairing(songId, id)
                    );
                    
                    if (popularCandidates.length > 0) {
                        const opponentId = popularCandidates[Math.floor(Math.random() * Math.min(20, popularCandidates.length))];
                        this.shownAlbums.add(albumToShow);
                        
                        // Also track the opponent's album
                        const opponentSong = this.songs.find(s => s.id === opponentId);
                        if (opponentSong) {
                            this.shownAlbums.add(opponentSong.albumId);
                        }
                        
                        const album = this.albums.get(albumToShow);
                        console.log(`Album diversity pairing: Showing "${album?.name}" (${albumToShow})`);
                        this.comparisonsSinceBreak++;
                        return [songId, opponentId];
                    }
                }
            }
        }
        
        // Special handling for finals mode
        if (poolName === 'finals') {
            const finalsPair = this.generateFinalsPairing();
            if (finalsPair) {
                this.comparisonsSinceBreak++;
                return finalsPair;
            }
        }
        
        // Check if we should do a cross-tier challenge (not in finals mode)
        if (poolName !== 'finals' && this.shouldDoCrossTierChallenge()) {
            const challengePair = this.generateCrossTierChallenge();
            if (challengePair) {
                console.log('Generated cross-tier challenge pairing');
                this.comparisonsSinceBreak++;
                return challengePair;
            }
        }
        
        // Increase chance to include songs from classic albums in all phases
        // Phase 1: 40% chance, Phase 2-3: 50% chance, Phase 4: 45% chance
        const classicAlbumChance = phase === 1 ? 0.4 : (phase <= 3 ? 0.5 : 0.45);
        if (phase <= 4 && Math.random() < classicAlbumChance) {
            const classicPair = this.generateClassicAlbumPairing();
            if (classicPair) {
                console.log('Generated classic album pairing');
                this.comparisonsSinceBreak++;
                return classicPair;
            }
        }
        
        // Check if we should carry over the winner
        if (this.lastWinnerId && this.shouldCarryOverWinner()) {
            const opponentId = this.selectOpponentForWinner(this.lastWinnerId, pool);
            
            if (opponentId) {
                console.log('Carrying over winner to next comparison');
                this.comparisonsSinceBreak++;
                this.shownSongs.add(opponentId);
                return [this.lastWinnerId, opponentId];
            }
        }
        
        // Reset counters when not carrying over
        this.consecutiveWins = 0;
        this.comparisonsSinceBreak = 0;
        
        // Generate a new pair
        const newPair = this.selectNewPair(pool);
        
        if (newPair) {
            console.log('Generated new pair');
            this.comparisonsSinceBreak++;
            return newPair;
        }
        
        // Fallback: if we can't find a pair in the current pool, expand the pool
        console.warn(`No valid pairs in ${poolName} pool, expanding search`);
        
        // Try with all songs
        const fallbackPair = this.selectNewPair(this.allSongsArray);
        if (fallbackPair) {
            this.comparisonsSinceBreak++;
            return fallbackPair;
        }
        
        console.error('Could not generate any valid pairing!');
        return null;
    }
    
    generateClassicAlbumPairing() {
        // Generate a pairing that includes at least one song from classic albums
        const classicSongs = this.classicAlbumArray;
        if (classicSongs.length < 2) return null;
        
        // Define albums to deprioritize
        const deprioritizedAlbums = ['v1', 'donda', 'donda2', 'v2'];
        
        // 70% chance to pair two classic album songs together (increased from 50%)
        if (Math.random() < 0.7) {
            const pair = this.selectPairFromPool(classicSongs);
            if (pair) {
                const song1 = this.songs.find(s => s.id === pair[0]);
                const song2 = this.songs.find(s => s.id === pair[1]);
                const album1 = this.albums.get(song1?.albumId);
                const album2 = this.albums.get(song2?.albumId);
                console.log(`Classic album matchup: "${song1?.title}" (${album1?.name}) vs "${song2?.title}" (${album2?.name})`);
                return pair;
            }
        }
        
        // Otherwise pair a classic album song with any other song (but deprioritize newer albums)
        const classicSongId = classicSongs[Math.floor(Math.random() * classicSongs.length)];
        const { pool } = this.getCurrentPhase();
        let candidates = pool.filter(id => 
            id !== classicSongId && 
            !this.elo.hasBeenCompared(classicSongId, id) &&
            !this.elo.shouldSkipPairing(classicSongId, id)
        );
        
        // Filter out songs from deprioritized albums 80% of the time
        if (Math.random() < 0.8) {
            const filteredCandidates = candidates.filter(id => {
                const song = this.songs.find(s => s.id === id);
                return song && !deprioritizedAlbums.includes(song.albumId);
            });
            if (filteredCandidates.length > 0) {
                candidates = filteredCandidates;
            }
        }
        
        if (candidates.length > 0) {
            const opponentId = candidates[Math.floor(Math.random() * candidates.length)];
            return [classicSongId, opponentId];
        }
        
        return null;
    }
    
    generatePairings() {
        // Initialize the tier system
        this.initializeSongTiers();
        
        if (!this.useDynamicPairing) {
            // Use the old pre-generated system
            this.generateAllPairingsLegacy();
            return;
        }
        
        // For dynamic pairing, just generate the first pairing
        this.pairings = [];
        const firstPair = this.generateNextPairing();
        if (firstPair) {
            this.pairings.push(firstPair);
            console.log('Generated first pairing dynamically');
        } else {
            console.error('Failed to generate first pairing');
        }
    }
    
    generateAllPairingsLegacy() {
        // Legacy pre-generated pairing system
        this.initializeSongTiers();
        
        const songIds = Array.from(this.songRatings.keys());
        const songsWithStreams = this.songs
            .filter(song => songIds.includes(song.id))
            .map(song => ({
                id: song.id,
                title: song.title,
                spotifyStreams: song.spotifyStreams || 0,
                spotifyRank: song.spotifyRank || 999,
                song: song
            }))
            .sort((a, b) => b.spotifyStreams - a.spotifyStreams);
        
        const top20Songs = songsWithStreams.slice(0, 20);
        const top50Songs = songsWithStreams.slice(0, 50);
        const top100Songs = songsWithStreams.slice(0, 100);
        
        const top20SongIds = new Set(top20Songs.map(s => s.id));
        const top50SongIds = new Set(top50Songs.map(s => s.id));
        const top100SongIds = new Set(top100Songs.map(s => s.id));
        
        const top20Array = Array.from(top20SongIds);
        const top50Array = Array.from(top50SongIds);
        const top100Array = Array.from(top100SongIds);
        
        console.log(`Song tiers: Top 20: ${top20Songs.length}, Top 50: ${top50Songs.length}, Top 100: ${top100Songs.length}`);
        
        const totalPairings = this.minComparisons + Math.floor(Math.random() * (this.maxComparisons - this.minComparisons));
        console.log(`Target number of pairings: ${totalPairings}`);
        
        this.pairings = [];
        const recentPairs = new Map();
        
        // Phase 1: Top 20 songs only (comparisons 0-14)
        const phase1End = 15;
        // Phase 2: Top 50 songs (comparisons 15-29)
        const phase2End = 30;
        // Phase 3: Top 100 songs (comparisons 30-49)
        const phase3End = 50;
        // Phase 4: All songs with user preference weighting (50+)
        
        let pairingIndex = 0;
        
        // PHASE 1: Generate pairings ONLY from top 20 songs
        console.log('\nPHASE 1: Generating comparisons 1-15 from top 20 songs only');
        while (pairingIndex < phase1End && pairingIndex < totalPairings) {
            let bestPair = null;
            let bestScore = -Infinity;
            
            for (let attempt = 0; attempt < 100; attempt++) {
                const indexA = Math.floor(Math.random() * top20Array.length);
                let indexB = Math.floor(Math.random() * top20Array.length);
                
                while (indexB === indexA) {
                    indexB = Math.floor(Math.random() * top20Array.length);
                }
                
                const songIdA = top20Array[indexA];
                const songIdB = top20Array[indexB];
                
                // STRICT VALIDATION - these MUST be in top 20
                if (!top20SongIds.has(songIdA) || !top20SongIds.has(songIdB)) {
                    console.error(`CRITICAL ERROR: Non-top-20 song in phase 1!`);
                    continue;
                }
                
                if (this.elo.hasBeenCompared(songIdA, songIdB)) continue;
                if (this.elo.shouldSkipPairing(songIdA, songIdB)) continue;
                
                const ratingA = this.songRatings.get(songIdA);
                const ratingB = this.songRatings.get(songIdB);
                const ratingDiff = Math.abs(ratingA - ratingB);
                
                const pairKey = [songIdA, songIdB].sort().join('-');
                const lastSeen = recentPairs.get(pairKey) || -Infinity;
                const recency = pairingIndex - lastSeen;
                
                const score = 1000 - ratingDiff + recency * 10;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPair = [songIdA, songIdB];
                }
            }
            
            if (bestPair) {
                this.pairings.push(bestPair);
                const pairKey = bestPair.sort().join('-');
                recentPairs.set(pairKey, pairingIndex);
                pairingIndex++;
                
                if (pairingIndex <= 3) {
                    const songA = this.songs.find(s => s.id === bestPair[0]);
                    const songB = this.songs.find(s => s.id === bestPair[1]);
                    console.log(`Comparison ${pairingIndex}: "${songA?.title}" vs "${songB?.title}"`);
                }
            } else {
                console.warn('Could not find valid pair in phase 1, moving to phase 2');
                break;
            }
        }
        
        // PHASE 2: Top 50 songs ONLY (with smart inclusion of user preferences)
        console.log('\nPHASE 2: Generating comparisons 16-30 from top 50 songs only');
        while (pairingIndex < phase2End && pairingIndex < totalPairings) {
            let bestPair = null;
            let bestScore = -Infinity;
            
            // Get user's highly-rated songs that are STRICTLY in top 50
            const highlyRatedInTop50 = Array.from(this.songRatings.entries())
                .filter(([id, rating]) => rating > 1550 && top50SongIds.has(id))
                .map(([id]) => id);
            
            // 30% chance to prioritize a highly-rated song IF it's in top 50
            const includeHighRated = highlyRatedInTop50.length > 0 && Math.random() < 0.30;
            
            if (pairingIndex === phase1End) {
                console.log(`Phase 2: Found ${highlyRatedInTop50.length} highly-rated songs that are in top 50`);
            }
            
            for (let attempt = 0; attempt < 100; attempt++) {
                let songIdA, songIdB;
                
                if (includeHighRated && highlyRatedInTop50.length > 0) {
                    // Pick one highly-rated song from top 50 and another from top 50
                    songIdA = highlyRatedInTop50[Math.floor(Math.random() * highlyRatedInTop50.length)];
                    
                    // For songB, pick from top 50 excluding songA
                    const top50Excluding = top50Array.filter(id => id !== songIdA);
                    songIdB = top50Excluding[Math.floor(Math.random() * top50Excluding.length)];
                } else {
                    // Pick two random songs from top 50
                    const indexA = Math.floor(Math.random() * top50Array.length);
                    let indexB = Math.floor(Math.random() * top50Array.length);
                    
                    while (indexB === indexA) {
                        indexB = Math.floor(Math.random() * top50Array.length);
                    }
                    
                    songIdA = top50Array[indexA];
                    songIdB = top50Array[indexB];
                }
                
                // STRICT VALIDATION - both songs MUST be in top 50
                if (!top50SongIds.has(songIdA) || !top50SongIds.has(songIdB)) {
                    const songA = this.songs.find(s => s.id === songIdA);
                    const songB = this.songs.find(s => s.id === songIdB);
                    console.error(`CRITICAL ERROR in Phase 2: Non-top-50 song detected!`);
                    console.error(`Song A: "${songA?.title}" (${songA?.spotifyStreams?.toLocaleString()} streams)`);
                    console.error(`Song B: "${songB?.title}" (${songB?.spotifyStreams?.toLocaleString()} streams)`);
                    continue;
                }
                
                if (this.elo.hasBeenCompared(songIdA, songIdB)) continue;
                if (this.elo.shouldSkipPairing(songIdA, songIdB)) continue;
                
                const ratingA = this.songRatings.get(songIdA);
                const ratingB = this.songRatings.get(songIdB);
                const ratingDiff = Math.abs(ratingA - ratingB);
                
                const pairKey = [songIdA, songIdB].sort().join('-');
                const lastSeen = recentPairs.get(pairKey) || -Infinity;
                const recency = pairingIndex - lastSeen;
                
                // Bonus for including highly-rated songs
                const highRatedBonus = includeHighRated && 
                    (highlyRatedInTop50.includes(songIdA) || highlyRatedInTop50.includes(songIdB)) ? 100 : 0;
                
                const score = 1000 - ratingDiff + recency * 10 + highRatedBonus;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPair = [songIdA, songIdB];
                }
            }
            
            if (bestPair) {
                // Final validation before adding
                if (!top50SongIds.has(bestPair[0]) || !top50SongIds.has(bestPair[1])) {
                    console.error('CRITICAL: About to add non-top-50 pair in phase 2!');
                    continue;
                }
                
                this.pairings.push(bestPair);
                const pairKey = bestPair.sort().join('-');
                recentPairs.set(pairKey, pairingIndex);
                pairingIndex++;
                
                // Log some comparisons for debugging
                if (pairingIndex === 20 || pairingIndex === 23 || pairingIndex === 25) {
                    const songA = this.songs.find(s => s.id === bestPair[0]);
                    const songB = this.songs.find(s => s.id === bestPair[1]);
                    console.log(`Comparison ${pairingIndex}: "${songA?.title}" (${songA?.spotifyStreams?.toLocaleString()}) vs "${songB?.title}" (${songB?.spotifyStreams?.toLocaleString()})`);
                }
            } else {
                console.warn('Could not find valid pair in phase 2');
                pairingIndex++;
            }
        }
        
        // PHASE 3: Top 100 songs (with increased focus on user preferences)
        console.log('\nPHASE 3: Generating comparisons 31-50 from top 100 songs only');
        while (pairingIndex < phase3End && pairingIndex < totalPairings) {
            let bestPair = null;
            let bestScore = -Infinity;
            
            // Get user's highly-rated songs that are STRICTLY in top 100
            const highlyRatedInTop100 = Array.from(this.songRatings.entries())
                .filter(([id, rating]) => rating > 1550 && top100SongIds.has(id))
                .map(([id]) => id);
            
            // 50% chance to prioritize highly-rated songs in top 100
            const includeHighRated = highlyRatedInTop100.length > 0 && Math.random() < 0.50;
            
            if (pairingIndex === phase2End) {
                console.log(`Phase 3: Found ${highlyRatedInTop100.length} highly-rated songs that are in top 100`);
            }
            
            for (let attempt = 0; attempt < 100; attempt++) {
                let songIdA, songIdB;
                
                if (includeHighRated && highlyRatedInTop100.length > 0) {
                    // Pick one highly-rated song from top 100
                    songIdA = highlyRatedInTop100[Math.floor(Math.random() * highlyRatedInTop100.length)];
                    
                    // For songB, pick from top 100 excluding songA
                    const top100Excluding = top100Array.filter(id => id !== songIdA);
                    songIdB = top100Excluding[Math.floor(Math.random() * top100Excluding.length)];
                } else {
                    // Pick two random songs from top 100
                    const indexA = Math.floor(Math.random() * top100Array.length);
                    let indexB = Math.floor(Math.random() * top100Array.length);
                    
                    while (indexB === indexA) {
                        indexB = Math.floor(Math.random() * top100Array.length);
                    }
                    
                    songIdA = top100Array[indexA];
                    songIdB = top100Array[indexB];
                }
                
                // STRICT VALIDATION - both songs MUST be in top 100
                if (!top100SongIds.has(songIdA) || !top100SongIds.has(songIdB)) {
                    console.error(`CRITICAL ERROR in Phase 3: Non-top-100 song detected!`);
                    continue;
                }
                
                if (this.elo.hasBeenCompared(songIdA, songIdB)) continue;
                if (this.elo.shouldSkipPairing(songIdA, songIdB)) continue;
                
                const ratingA = this.songRatings.get(songIdA);
                const ratingB = this.songRatings.get(songIdB);
                const ratingDiff = Math.abs(ratingA - ratingB);
                
                const pairKey = [songIdA, songIdB].sort().join('-');
                const lastSeen = recentPairs.get(pairKey) || -Infinity;
                const recency = pairingIndex - lastSeen;
                
                // Bonus for including highly-rated songs
                const highRatedBonus = includeHighRated && 
                    (highlyRatedInTop100.includes(songIdA) || highlyRatedInTop100.includes(songIdB)) ? 150 : 0;
                
                const score = 1000 - ratingDiff + recency * 10 + highRatedBonus;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPair = [songIdA, songIdB];
                }
            }
            
            if (bestPair) {
                // Final validation
                if (!top100SongIds.has(bestPair[0]) || !top100SongIds.has(bestPair[1])) {
                    console.error('CRITICAL: About to add non-top-100 pair in phase 3!');
                    continue;
                }
                
                this.pairings.push(bestPair);
                const pairKey = bestPair.sort().join('-');
                recentPairs.set(pairKey, pairingIndex);
                pairingIndex++;
            } else {
                console.warn('Could not find valid pair in phase 3');
                pairingIndex++;
            }
        }
        
        // PHASE 4: All songs with strong preference for refining user's top picks
        console.log('\nPHASE 4: Generating comparisons 51+ from all songs (focus on refining top picks)');
        
        // Track which songs have been shown to the user
        const shownSongs = new Set();
        this.pairings.forEach(pair => {
            shownSongs.add(pair[0]);
            shownSongs.add(pair[1]);
        });
        
        const unshownSongs = songIds.filter(id => !shownSongs.has(id));
        console.log(`Phase 4: ${unshownSongs.length} songs haven't been shown yet`);
        
        for (let i = pairingIndex; i < totalPairings; i++) {
            let bestPair = null;
            let bestScore = -Infinity;
            
            // Get user's top-rated songs (dynamic threshold based on progress)
            const ratingThreshold = 1500 + (i - phase3End) * 2; // Gradually increase threshold
            const highlyRatedSongs = Array.from(this.songRatings.entries())
                .filter(([id, rating]) => rating > ratingThreshold)
                .sort((a, b) => b[1] - a[1]) // Sort by rating
                .slice(0, 30) // Top 30 rated songs
                .map(([id]) => id);
            
            // Strategy for phase 4:
            // - 70% chance to include a highly-rated song to refine rankings
            // - 20% chance to introduce an unshown song
            // - 10% chance for two unshown songs (discovery)
            const strategy = Math.random();
            const useHighRated = strategy < 0.70 && highlyRatedSongs.length > 0;
            const introduceNew = strategy >= 0.70 && strategy < 0.90 && unshownSongs.length > 0;
            
            for (let attempt = 0; attempt < 100; attempt++) {
                let songIdA, songIdB;
                
                if (useHighRated) {
                    // Refine rankings: highly-rated vs another song
                    songIdA = highlyRatedSongs[Math.floor(Math.random() * Math.min(10, highlyRatedSongs.length))];
                    
                    // 50% chance to compare against another highly-rated song
                    if (Math.random() < 0.5 && highlyRatedSongs.length > 1) {
                        const othersHighlyRated = highlyRatedSongs.filter(id => id !== songIdA);
                        songIdB = othersHighlyRated[Math.floor(Math.random() * othersHighlyRated.length)];
                    } else {
                        // Compare against any song
                        const otherSongs = songIds.filter(id => id !== songIdA);
                        songIdB = otherSongs[Math.floor(Math.random() * otherSongs.length)];
                    }
                } else if (introduceNew) {
                    // Introduce new song vs known song
                    songIdA = unshownSongs[Math.floor(Math.random() * unshownSongs.length)];
                    const shownSongsArray = Array.from(shownSongs);
                    songIdB = shownSongsArray[Math.floor(Math.random() * shownSongsArray.length)];
                } else if (unshownSongs.length >= 2) {
                    // Two unshown songs for discovery
                    const indexA = Math.floor(Math.random() * unshownSongs.length);
                    let indexB = Math.floor(Math.random() * unshownSongs.length);
                    while (indexB === indexA) {
                        indexB = Math.floor(Math.random() * unshownSongs.length);
                    }
                    songIdA = unshownSongs[indexA];
                    songIdB = unshownSongs[indexB];
                } else {
                    // Fallback to any two songs
                    const indexA = Math.floor(Math.random() * songIds.length);
                    let indexB = Math.floor(Math.random() * songIds.length);
                    while (indexB === indexA) {
                        indexB = Math.floor(Math.random() * songIds.length);
                    }
                    songIdA = songIds[indexA];
                    songIdB = songIds[indexB];
                }
                
                if (this.elo.hasBeenCompared(songIdA, songIdB)) continue;
                if (this.elo.shouldSkipPairing(songIdA, songIdB)) continue;
                
                const ratingA = this.songRatings.get(songIdA);
                const ratingB = this.songRatings.get(songIdB);
                const ratingDiff = Math.abs(ratingA - ratingB);
                
                const pairKey = [songIdA, songIdB].sort().join('-');
                const lastSeen = recentPairs.get(pairKey) || -Infinity;
                const recency = i - lastSeen;
                
                // Scoring bonuses
                let bonuses = 0;
                if (highlyRatedSongs.includes(songIdA) || highlyRatedSongs.includes(songIdB)) {
                    bonuses += 200; // Bonus for including highly-rated songs
                }
                if (unshownSongs.includes(songIdA) || unshownSongs.includes(songIdB)) {
                    bonuses += 50; // Small bonus for introducing new songs
                }
                
                const score = 1000 - ratingDiff + recency * 10 + bonuses;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPair = [songIdA, songIdB];
                }
            }
            
            if (bestPair) {
                this.pairings.push(bestPair);
                const pairKey = bestPair.sort().join('-');
                recentPairs.set(pairKey, i);
                
                // Update shown songs
                shownSongs.add(bestPair[0]);
                shownSongs.add(bestPair[1]);
                
                // Remove from unshown if they were there
                const idx0 = unshownSongs.indexOf(bestPair[0]);
                const idx1 = unshownSongs.indexOf(bestPair[1]);
                if (idx0 >= 0) unshownSongs.splice(idx0, 1);
                if (idx1 >= 0 && idx1 < unshownSongs.length) {
                    unshownSongs.splice(unshownSongs.indexOf(bestPair[1]), 1);
                }
            }
        }
        
        // Validate pairings and show summary
        console.log(`\\nGenerated ${this.pairings.length} total pairings`);
        console.log('Phase breakdown:');
        console.log(`- Comparisons 1-15: Top 20 songs only (most popular by streams)`);
        console.log(`- Comparisons 16-30: Top 50 songs only (30% chance of prioritizing user favorites within top 50)`);
        console.log(`- Comparisons 31-50: Top 100 songs only (50% chance of prioritizing user favorites within top 100)`);
        console.log(`- Comparisons 51+: All songs (70% include user's top picks for refinement)`);
        
        // Validate first few pairings to ensure popular songs
        console.log('\\nValidating early comparisons have popular songs:');
        for (let i = 0; i < Math.min(5, this.pairings.length); i++) {
            const [idA, idB] = this.pairings[i];
            const songA = this.songs.find(s => s.id === idA);
            const songB = this.songs.find(s => s.id === idB);
            
            if (songA?.spotifyStreams < 500000000 || songB?.spotifyStreams < 500000000) {
                console.warn(`WARNING: Comparison ${i + 1} has low-stream song:`);
                console.warn(`  ${songA?.title}: ${songA?.spotifyStreams?.toLocaleString()} streams`);
                console.warn(`  ${songB?.title}: ${songB?.spotifyStreams?.toLocaleString()} streams`);
            }
        }
    }
    
    choosePairingStrategy(pairingIndex, favoritesCount) {
        if (favoritesCount < 5) {
            return 'explore'; // Not enough favorites yet, keep exploring
        }
        
        // After we have enough favorites, use strategic mixing
        const random = Math.random();
        if (random < 0.4) {
            return 'exploit'; // 40% - Favorites vs Favorites (refine top rankings)
        } else if (random < 0.7) {
            return 'mixed'; // 30% - Favorites vs New Songs (test favorites against unknowns)
        } else {
            return 'explore'; // 30% - New Songs vs New Songs (discover new favorites)
        }
    }
    
    generateStrategicPair(strategy, favoritesArray, allSongIds) {
        const nonFavorites = allSongIds.filter(id => !this.userFavorites.has(id));
        
        switch (strategy) {
            case 'exploit':
                // Favorites vs Favorites - refine top rankings
                if (favoritesArray.length >= 2) {
                    const idxA = Math.floor(Math.random() * favoritesArray.length);
                    let idxB = Math.floor(Math.random() * favoritesArray.length);
                    while (idxB === idxA && favoritesArray.length > 1) {
                        idxB = Math.floor(Math.random() * favoritesArray.length);
                    }
                    return [favoritesArray[idxA], favoritesArray[idxB]];
                }
                return null;
                
            case 'mixed':
                // Favorites vs New Songs - test favorites against unknowns
                if (favoritesArray.length > 0 && nonFavorites.length > 0) {
                    const favoriteId = favoritesArray[Math.floor(Math.random() * favoritesArray.length)];
                    const newSongId = nonFavorites[Math.floor(Math.random() * nonFavorites.length)];
                    return [favoriteId, newSongId];
                }
                return null;
                
            case 'explore':
            default:
                // New Songs vs New Songs - discover new favorites
                if (nonFavorites.length >= 2) {
                    const idxA = Math.floor(Math.random() * nonFavorites.length);
                    let idxB = Math.floor(Math.random() * nonFavorites.length);
                    while (idxB === idxA && nonFavorites.length > 1) {
                        idxB = Math.floor(Math.random() * nonFavorites.length);
                    }
                    return [nonFavorites[idxA], nonFavorites[idxB]];
                }
                return null;
        }
    }
    
    showNextComparison() {
        // Dynamic pairing: generate next pair if needed
        if (this.useDynamicPairing) {
            // Generate next pairing if we're at the end of current pairings
            // Don't automatically show results - let the user decide
            
            // Generate next pairing if we're at the end of current pairings
            if (this.currentPairIndex >= this.pairings.length) {
                const nextPair = this.generateNextPairing();
                if (nextPair) {
                    this.pairings.push(nextPair);
                    console.log(`Generated new pairing #${this.pairings.length}`);
                } else {
                    // No more valid pairings possible
                    console.log('No more valid pairings available');
                    this.ui.showSuccess('You\'ve compared all possible song combinations!');
                    this.showResults();
                    return;
                }
            }
        } else {
            // Legacy behavior: check pre-generated pairings
            console.log(`Showing comparison ${this.currentPairIndex + 1} of ${this.pairings.length}`);
            
            if (this.currentPairIndex >= this.pairings.length) {
                // For legacy system, automatically show results when done
                this.showResults();
                return;
            }
        }
        
        const [songIdA, songIdB] = this.pairings[this.currentPairIndex];
        console.log('Current pairing IDs:', songIdA, songIdB);
        
        const songA = this.songs.find(s => s.id === songIdA);
        const songB = this.songs.find(s => s.id === songIdB);
        
        if (!songA || !songB) {
            console.error('Songs not found:', songIdA, songIdB);
            this.currentPairIndex++;
            this.showNextComparison();
            return;
        }
        
        console.log('Song A:', songA.title, 'from album', songA.albumId);
        console.log('Song B:', songB.title, 'from album', songB.albumId);
        
        songA.rating = this.songRatings.get(songIdA);
        songB.rating = this.songRatings.get(songIdB);
        
        this.ui.displayComparison(songA, songB, this.albums);
        const completedCount = this.elo.getCompletedComparisons();
        
        // Start timer for this comparison
        if (window.analytics) {
            window.analytics.startComparisonTimer();
        }
        
        // For dynamic pairing, show progress based on minimum comparisons
        if (this.useDynamicPairing) {
            const totalEstimate = Math.max(this.minComparisons, this.pairings.length + 10);
            this.ui.updateProgressBar(completedCount + 1, totalEstimate, completedCount);
        } else {
            this.ui.updateProgressBar(this.currentPairIndex + 1, this.pairings.length, completedCount);
        }
        
        // Save rating snapshot before comparison
        this.saveRatingSnapshot();
        
        // Ensure buttons are enabled for interaction
        if (!this.isProcessingChoice) {
            this.ui.enableComparisonButtons();
        }
        
        // Preload next comparison's images to prevent broken pipe errors
        this.preloadNextComparison();
    }
    
    chooseSong(side) {
        console.log(`chooseSong called with side: ${side}`);
        
        // Prevent multiple clicks
        if (this.isProcessingChoice) {
            console.log('Already processing a choice, ignoring');
            return;
        }
        
        this.isProcessingChoice = true;
        this.ui.disableComparisonButtons();
        
        // Start timing for this comparison
        const timeTaken = window.analytics ? window.analytics.endComparisonTimer() : 0;
        
        const [songIdA, songIdB] = this.pairings[this.currentPairIndex];
        const winnerId = side === 'a' ? songIdA : songIdB;
        const loserId = side === 'a' ? songIdB : songIdA;
        
        // Get song details for tracking
        const winnerSong = this.songs.find(s => s.id === winnerId);
        const loserSong = this.songs.find(s => s.id === loserId);
        const winnerAlbum = this.albums.get(winnerSong?.albumId);
        const loserAlbum = this.albums.get(loserSong?.albumId);
        
        // Track analytics with detailed comparison data
        const completedCount = this.elo.getCompletedComparisons() + 1;
        if (window.analytics) {
            window.analytics.trackComparisonMade(
                completedCount,
                this.useDynamicPairing ? Math.max(this.minComparisons, this.pairings.length + 10) : this.pairings.length
            );
            
            // Track detailed song comparison
            window.analytics.trackSongComparison(
                { title: winnerSong?.title, album: winnerAlbum?.name },
                { title: loserSong?.title, album: loserAlbum?.name },
                completedCount,
                timeTaken
            );
        }
        
        // Track user's favorite songs for exploration/exploitation
        this.userFavorites.add(winnerId);
        console.log(`User chose: "${winnerSong?.title}" (${this.userFavorites.size} favorites tracked)`);
        
        // Track winner for dynamic pairing
        if (this.useDynamicPairing) {
            if (this.lastWinnerId === winnerId) {
                this.consecutiveWins++;
            } else {
                this.consecutiveWins = 1;
            }
            this.lastWinnerId = winnerId;
            console.log(`Winner tracked for carry-over. Consecutive wins: ${this.consecutiveWins}`);
        }
        
        const winnerRating = this.songRatings.get(winnerId);
        const loserRating = this.songRatings.get(loserId);
        
        console.log(`Winner: ${winnerId} (rating: ${winnerRating})`);
        console.log(`Loser: ${loserId} (rating: ${loserRating})`);
        
        const scoreA = winnerId === songIdA ? 1 : 0;
        const { newRatingA, newRatingB } = this.elo.updateRatings(
            this.songRatings.get(songIdA),
            this.songRatings.get(songIdB),
            scoreA,
            songIdA,
            songIdB
        );
        
        this.songRatings.set(songIdA, newRatingA);
        this.songRatings.set(songIdB, newRatingB);
        
        this.elo.recordComparison(songIdA, songIdB, winnerId);
        
        // Log rating changes and K-factors
        const kA = this.elo.getDynamicK(songIdA);
        const kB = this.elo.getDynamicK(songIdB);
        console.log(`Rating changes: A: ${this.songRatings.get(songIdA)} (K=${kA}), B: ${this.songRatings.get(songIdB)} (K=${kB})`);
        
        // Check if entering finals mode
        const completedComparisons = this.elo.getCompletedComparisons();
        if (completedComparisons === 80) {
            console.log('🏆 Entering FINALS MODE! Focus on refining top 10 rankings.');
            this.ui.showSuccess('Entering Finals Mode - Refining your top picks!');
        }
        
        // Save this comparison to history
        if (this.backButton) {
            this.backButton.saveComparison(songIdA, songIdB, winnerId);
        }
        
        this.animateChoice(side);
        
        setTimeout(() => {
            this.currentPairIndex++;
            this.ui.enableComparisonButtons();
            this.isProcessingChoice = false;
            this.showNextComparison();
        }, 500);
    }
    
    skipComparison() {
        // Prevent rapid clicking
        if (this.isProcessingChoice) {
            console.log('Skip ignored - already processing');
            return;
        }
        
        this.isProcessingChoice = true;
        
        // Track analytics
        if (window.analytics) {
            window.analytics.trackComparisonSkipped(this.currentPairIndex + 1);
        }
        
        const [songIdA, songIdB] = this.pairings[this.currentPairIndex];
        this.elo.recordSkip(songIdA, songIdB);
        
        // Reset carry-over when skipping
        if (this.useDynamicPairing) {
            this.lastWinnerId = null;
            this.consecutiveWins = 0;
            console.log('Reset carry-over due to skip');
        }
        
        this.currentPairIndex++;
        
        // Small delay to prevent rapid skipping
        setTimeout(() => {
            this.showNextComparison();
            this.isProcessingChoice = false;
        }, 100);
    }
    
    animateChoice(side) {
        const chosenCard = side === 'a' ? 
            this.ui.elements.songCards.a.container : 
            this.ui.elements.songCards.b.container;
        
        chosenCard.classList.add('success');
        setTimeout(() => chosenCard.classList.remove('success'), 600);
    }
    
    showResults() {
        // Track page view for results screen
        if (window.analytics) {
            window.analytics.trackPageView('Results Screen');
        }
        
        // Check minimum comparisons
        const completedComparisons = this.elo.getCompletedComparisons();
        if (completedComparisons < 20) {
            this.ui.showError(`Please complete at least 20 comparisons for meaningful results. You've completed ${completedComparisons} so far.`);
            return;
        }
        
        const rankedSongs = this.songs
            .map(song => ({
                ...song,
                rating: this.songRatings.get(song.id)
            }))
            .sort((a, b) => b.rating - a.rating);
        
        const topSongs = rankedSongs.slice(0, 10);
        
        const albumStats = new Map();
        
        // Only count songs that have actually been compared
        rankedSongs.forEach(song => {
            const comparisonCount = this.elo.getComparisonCount(song.id);
            
            // Only include songs that have been compared at least once
            if (comparisonCount > 0) {
                if (!albumStats.has(song.albumId)) {
                    albumStats.set(song.albumId, {
                        totalRating: 0,
                        songCount: 0,
                        comparedSongCount: 0,
                        album: this.albums.get(song.albumId)
                    });
                }
                const stats = albumStats.get(song.albumId);
                stats.totalRating += song.rating;
                stats.songCount++;
                stats.comparedSongCount++;
            }
        });
        
        // Minimum threshold: album must have at least 2 compared songs to be ranked
        const minComparedSongs = 2;
        
        const topAlbums = Array.from(albumStats.values())
            .filter(stats => stats.comparedSongCount >= minComparedSongs)
            .map(stats => ({
                ...stats,
                averageRating: stats.totalRating / stats.songCount
            }))
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 5);
        
        this.ui.displayResults(topSongs, topAlbums, this.albums);
        this.ui.showScreen('results');
        
        // Track analytics
        if (window.analytics && topSongs.length > 0 && topAlbums.length > 0) {
            const topAlbum = this.albums.get(topSongs[0].albumId);
            window.analytics.trackRankingCompleted(
                completedComparisons,
                topAlbum ? topAlbum.name : 'Unknown',
                topSongs[0].title
            );
            
            // Track album rankings
            window.analytics.trackAlbumRanking(topAlbums.map(stats => ({
                name: stats.album?.name || 'Unknown',
                averageRating: stats.averageRating
            })));
        }
        
        // Update results headers with Kanye-themed messages
        if (window.KanyeMessages) {
            const headerEl = document.getElementById('results-header');
            const subtitleEl = document.getElementById('results-subtitle');
            
            if (headerEl) {
                headerEl.textContent = KanyeMessages.getRandomMessage('resultsHeader');
            }
            if (subtitleEl) {
                subtitleEl.textContent = KanyeMessages.getRandomMessage('resultsSubtitle');
            }
        }
        
        // Update the comparison count
        const totalComparisonsElement = document.getElementById('total-comparisons');
        if (totalComparisonsElement) {
            totalComparisonsElement.textContent = completedComparisons;
        }
        
        if (topSongs[0].spotifyId) {
            setTimeout(() => this.ui.playPreview(topSongs[0].spotifyId), 1000);
        }
        
        // Session saving removed - no clearing needed
    }
    
    handlePreview(event) {
        const spotifyId = event.target.dataset.spotifyId;
        if (event.target.classList.contains('playing')) {
            this.ui.stopPreview();
        } else if (spotifyId) {
            this.ui.playPreview(spotifyId);
        }
    }
    
    handleKeyPress(event) {
        // Check if feedback modal is open - if so, don't handle shortcuts
        const feedbackModal = document.getElementById('feedback-modal');
        if (feedbackModal && feedbackModal.classList.contains('show')) {
            return;
        }
        
        if (this.ui.screens.comparison.classList.contains('active')) {
            switch(event.key) {
                case 'ArrowLeft':
                case '1':
                    this.chooseSong('a');
                    break;
                case 'ArrowRight':
                case '2':
                    this.chooseSong('b');
                    break;
                case ' ':
                case 's':
                    event.preventDefault();
                    this.skipComparison();
                    break;
            }
        }
    }
    
    saveRatingSnapshot() {
        // Save current ratings state
        const snapshot = {};
        this.songRatings.forEach((rating, songId) => {
            snapshot[songId] = rating;
        });
        this.ratingSnapshots[this.currentPairIndex] = snapshot;
    }
    
    preloadNextComparison() {
        // Preload images for the next comparison to prevent broken pipe errors
        const nextIndex = this.currentPairIndex + 1;
        if (nextIndex >= this.pairings.length) return;
        
        const [nextSongIdA, nextSongIdB] = this.pairings[nextIndex];
        const nextSongA = this.songs.find(s => s.id === nextSongIdA);
        const nextSongB = this.songs.find(s => s.id === nextSongIdB);
        
        if (nextSongA && nextSongB) {
            // Create image objects to preload
            const imgA = new Image();
            const imgB = new Image();
            
            // Get album art paths from album objects
            const albumA = this.albums.get(nextSongA.albumId);
            const albumB = this.albums.get(nextSongB.albumId);
            
            const albumArtPathA = albumA && albumA.coverArt 
                ? `assets/album-covers/${albumA.coverArt}`
                : 'assets/album-covers/placeholder.svg';
            const albumArtPathB = albumB && albumB.coverArt 
                ? `assets/album-covers/${albumB.coverArt}`
                : 'assets/album-covers/placeholder.svg';
            
            // Set sources to trigger preloading
            imgA.src = albumArtPathA;
            imgB.src = albumArtPathB;
            
            // Optional: log preloading
            console.log(`Preloading images for next comparison: ${nextSongA.title} vs ${nextSongB.title}`);
        }
    }
    
    // Session methods removed - no longer saving/loading sessions
    
    restart() {
        this.songRatings.clear();
        this.songs.forEach(song => {
            this.songRatings.set(song.id, song.initialRating);
        });
        
        this.elo = new EloRating(32);
        this.pairings = [];
        this.currentPairIndex = 0;
        this.sessionStartTime = Date.now();
        this.ratingSnapshots = {};
        
        // Clear exploration/exploitation data
        this.userFavorites.clear();
        this.explorationPhase = 'popular';
        
        // Reset dynamic pairing state
        if (this.useDynamicPairing) {
            this.lastWinnerId = null;
            this.consecutiveWins = 0;
            this.comparisonsSinceBreak = 0;
        }
        
        this.ui.stopPreview();
        this.ui.showScreen('landing');
        
        // Hide the "I'm Done" button when restarting
        if (this.ui.elements.showResultsButton) {
            this.ui.elements.showResultsButton.style.display = 'none';
        }
    }
    
    async exportSongsImage() {
        const exporter = new KanyeRankerExport();
        await exporter.generateSongsImage(
            this.getTopSongs(),
            this.albums,
            this.ui.elements.exportCanvas
        );
    }
    
    async exportAlbumsImage() {
        const topAlbums = this.getTopAlbums();
        const exporter = new KanyeRankerExport();
        await exporter.generateAlbumsImage(
            topAlbums,
            this.ui.elements.exportCanvas
        );
    }
    
    copyResults() {
        const topSongs = this.getTopSongs();
        const text = topSongs
            .map((song, index) => {
                const album = this.albums.get(song.albumId);
                const albumName = album ? album.name : 'Unknown Album';
                return `${index + 1}. ${song.title} - ${albumName}`;
            })
            .join('\n');
        
        const fullText = `My Top 10 Kanye Songs:\n\n${text}\n\nRanked with Kanye Ranker`;
        
        navigator.clipboard.writeText(fullText).then(() => {
            this.ui.showSuccess('Results copied to clipboard!');
        }).catch(() => {
            this.ui.showError('Failed to copy results');
        });
    }
    
    getTopSongs() {
        return this.songs
            .map(song => ({
                ...song,
                rating: this.songRatings.get(song.id)
            }))
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10);
    }
    
    calculateAlbumStats(songs) {
        const albumStats = new Map();
        songs.forEach(song => {
            if (!albumStats.has(song.albumId)) {
                albumStats.set(song.albumId, {
                    totalRating: 0,
                    songCount: 0,
                    album: this.albums.get(song.albumId)
                });
            }
            const stats = albumStats.get(song.albumId);
            stats.totalRating += song.rating;
            stats.songCount++;
            stats.averageRating = stats.totalRating / stats.songCount;
        });
        return albumStats;
    }
    
    getTopAlbums() {
        const rankedSongs = this.songs
            .map(song => ({
                ...song,
                rating: this.songRatings.get(song.id),
                comparisonCount: this.elo.getComparisonCount(song.id)
            }));
        
        const albumStats = new Map();
        
        // Only count songs that have actually been compared
        rankedSongs.forEach(song => {
            if (song.comparisonCount > 0) {
                if (!albumStats.has(song.albumId)) {
                    albumStats.set(song.albumId, {
                        totalRating: 0,
                        songCount: 0,
                        comparedSongCount: 0,
                        album: this.albums.get(song.albumId)
                    });
                }
                const stats = albumStats.get(song.albumId);
                stats.totalRating += song.rating;
                stats.songCount++;
                stats.comparedSongCount++;
            }
        });
        
        // Minimum threshold: album must have at least 2 compared songs to be ranked
        const minComparedSongs = 2;
        
        return Array.from(albumStats.values())
            .filter(stats => stats.comparedSongCount >= minComparedSongs)
            .map(stats => ({
                ...stats,
                averageRating: stats.totalRating / stats.songCount
            }))
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 5);
    }
    
    continueRanking() {
        console.log('Continuing ranking from results screen');
        
        // Track analytics
        if (window.analytics) {
            window.analytics.trackContinueRanking(this.elo.getCompletedComparisons());
        }
        
        // Reset the "I'm Done" button threshold if user wants to continue
        this.minComparisons = this.elo.getCompletedComparisons() + 20;
        
        // Return to comparison screen
        this.ui.showScreen('comparison');
        
        // Continue with next comparison
        this.showNextComparison();
        
        // Session saving removed - no need to save
    }
}

// Make KanyeRankerApp globally available
window.KanyeRankerApp = KanyeRankerApp;

// Don't auto-initialize here - let app-init.js handle it

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    const errorMessage = `Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
    console.error(errorMessage);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});