/**
 * Shared test fixtures for Kanye Ranker test suites
 * Used by both unit tests (Jest) and E2E tests (Playwright)
 *
 * Keep song/album data minimal but representative:
 * - Covers multiple albums/eras for era classification testing
 * - Includes spotifyStreams/spotifyRank for tier and insights testing
 * - IDs match the format used in the real songs.json
 */

const TEST_ALBUMS = [
  { id: 'cd', name: 'The College Dropout', year: 2004, trackCount: 21, type: 'studio', coverArt: 'college-dropout.jpg' },
  { id: 'mbdtf', name: 'My Beautiful Dark Twisted Fantasy', year: 2010, trackCount: 13, type: 'studio', coverArt: 'mbdtf.jpg' },
  { id: 'yeezus', name: 'Yeezus', year: 2013, trackCount: 10, type: 'studio', coverArt: 'yeezus.jpg' },
  { id: 'tlop', name: 'The Life of Pablo', year: 2016, trackCount: 20, type: 'studio', coverArt: 'life-of-pablo.jpg' },
  { id: 'donda', name: 'Donda', year: 2021, trackCount: 27, type: 'studio', coverArt: 'donda.jpg' },
  { id: 'v1', name: 'Vultures 1', year: 2024, trackCount: 16, type: 'studio', coverArt: 'vultures-1.jpg' }
];

const TEST_SONGS = [
  // College era (2004-2007)
  { id: 'jesus-walks', title: 'Jesus Walks', albumId: 'cd', spotifyStreams: 800000000, spotifyRank: 3, initialRating: 1500 },
  { id: 'through-the-wire', title: 'Through the Wire', albumId: 'cd', spotifyStreams: 500000000, spotifyRank: 8, initialRating: 1500 },
  { id: 'all-falls-down', title: 'All Falls Down', albumId: 'cd', spotifyStreams: 600000000, spotifyRank: 5, initialRating: 1500 },
  // Experimental era (2008-2013)
  { id: 'runaway', title: 'Runaway', albumId: 'mbdtf', spotifyStreams: 900000000, spotifyRank: 1, initialRating: 1500 },
  { id: 'power', title: 'POWER', albumId: 'mbdtf', spotifyStreams: 850000000, spotifyRank: 2, initialRating: 1500 },
  { id: 'all-of-the-lights', title: 'All of the Lights', albumId: 'mbdtf', spotifyStreams: 750000000, spotifyRank: 4, initialRating: 1500 },
  { id: 'black-skinhead', title: 'Black Skinhead', albumId: 'yeezus', spotifyStreams: 650000000, spotifyRank: 6, initialRating: 1500 },
  { id: 'bound-2', title: 'Bound 2', albumId: 'yeezus', spotifyStreams: 550000000, spotifyRank: 7, initialRating: 1500 },
  // Modern era (2016-2019)
  { id: 'ultralight-beam', title: 'Ultralight Beam', albumId: 'tlop', spotifyStreams: 700000000, spotifyRank: 5, initialRating: 1500 },
  { id: 'father-stretch', title: 'Father Stretch My Hands Pt. 1', albumId: 'tlop', spotifyStreams: 680000000, spotifyRank: 6, initialRating: 1500 },
  // New era (2021+)
  { id: 'jail', title: 'Jail', albumId: 'donda', spotifyStreams: 400000000, spotifyRank: 15, initialRating: 1500 },
  { id: 'off-the-grid', title: 'Off The Grid', albumId: 'donda', spotifyStreams: 450000000, spotifyRank: 12, initialRating: 1500 },
  { id: 'carnival', title: 'Carnival', albumId: 'v1', spotifyStreams: 350000000, spotifyRank: 20, initialRating: 1500 },
  { id: 'stars', title: 'Stars', albumId: 'v1', spotifyStreams: 100000000, spotifyRank: 50, initialRating: 1500 }
];

// Pre-built rating scenarios for testing results/insights
const RATING_SCENARIOS = {
  // Scenario: clear winner with varied ratings
  clearRankings: new Map([
    ['runaway', 1800],
    ['power', 1750],
    ['jesus-walks', 1700],
    ['all-falls-down', 1650],
    ['ultralight-beam', 1600],
    ['black-skinhead', 1580],
    ['bound-2', 1550],
    ['father-stretch', 1520],
    ['all-of-the-lights', 1500],
    ['through-the-wire', 1480],
    ['off-the-grid', 1450],
    ['jail', 1400],
    ['carnival', 1350],
    ['stars', 1300]
  ]),
  // Scenario: tight race at the top
  tightRace: new Map([
    ['runaway', 1550],
    ['power', 1548],
    ['jesus-walks', 1545],
    ['all-falls-down', 1542],
    ['ultralight-beam', 1540],
    ['black-skinhead', 1538],
    ['bound-2', 1535],
    ['father-stretch', 1530],
    ['all-of-the-lights', 1520],
    ['through-the-wire', 1510],
    ['off-the-grid', 1400],
    ['jail', 1380],
    ['carnival', 1350],
    ['stars', 1300]
  ]),
  // Scenario: all equal (fresh start)
  allEqual: new Map(TEST_SONGS.map(s => [s.id, 1500]))
};

// Helper: build a songRatings Map from an array of {id, rating} objects
function buildRatingsMap(ratings) {
  return new Map(Object.entries(ratings));
}

// Helper: create a mock comparison history
function buildComparisonHistory(pairs) {
  return pairs.map(([songIdA, songIdB, winnerId], i) => ({
    songIdA,
    songIdB,
    winnerId,
    timestamp: Date.now() - (pairs.length - i) * 1000
  }));
}

// Export for both Node.js (Jest) and browser (Playwright can inject)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TEST_ALBUMS,
    TEST_SONGS,
    RATING_SCENARIOS,
    buildRatingsMap,
    buildComparisonHistory
  };
}
