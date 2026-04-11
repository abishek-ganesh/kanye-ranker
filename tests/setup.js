/**
 * Jest setup file for Kanye Ranker unit tests.
 *
 * Loads source files into the jsdom global scope so that window.EloRating,
 * window.KanyeUtils, etc. are available just like in the browser.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. Mock globals that source files depend on at parse/init time
// ---------------------------------------------------------------------------

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] ?? null),
    setItem: jest.fn((key, value) => { store[key] = String(value); }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn(i => Object.keys(store)[i] ?? null)
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock analytics (used by app.js)
window.analytics = {
  trackPageView: jest.fn(),
  trackEvent: jest.fn(),
  trackTiming: jest.fn()
};

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn(() => Promise.resolve()) },
  writable: true
});

// Mock fetch — returns test fixture data shaped like songs.json
const { TEST_SONGS, TEST_ALBUMS } = require('./fixtures/test-data');

const mockSongsJson = TEST_ALBUMS.map(album => ({
  ...album,
  songs: TEST_SONGS.filter(s => s.albumId === album.id).map(s => ({
    id: s.id,
    title: s.title,
    spotifyStreams: s.spotifyStreams,
    spotifyRank: s.spotifyRank
  }))
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockSongsJson)
  })
);

// ---------------------------------------------------------------------------
// 2. Build a minimal DOM that the UI constructor won't crash on
// ---------------------------------------------------------------------------

document.body.innerHTML = `
  <div id="landing-screen" class="screen active">
    <button id="start-ranking"></button>
  </div>
  <div id="comparison-screen" class="screen">
    <div id="current-comparison">0</div>
    <div id="progress-fill"></div>
    <div id="completed-comparisons">0</div>
    <div id="song-a" class="song-card">
      <img id="album-art-a" src="" alt="" />
      <span id="song-title-a"></span>
      <span id="album-name-a"></span>
      <span id="year-a"></span>
      <button id="preview-a"></button>
      <a id="youtube-a" href="#"></a>
      <button id="choose-a"></button>
    </div>
    <div id="song-b" class="song-card">
      <img id="album-art-b" src="" alt="" />
      <span id="song-title-b"></span>
      <span id="album-name-b"></span>
      <span id="year-b"></span>
      <button id="preview-b"></button>
      <a id="youtube-b" href="#"></a>
      <button id="choose-b"></button>
    </div>
    <button id="skip-comparison"></button>
    <button id="show-results" class="btn btn-primary btn-locked" disabled></button>
    <button id="continue-ranking"></button>
  </div>
  <div id="results-screen" class="screen">
    <div id="results-header"></div>
    <div id="results-subtitle"></div>
    <div id="top-songs"></div>
    <div id="top-albums"></div>
    <button id="restart"></button>
    <button id="export-songs-image"></button>
    <button id="export-albums-image"></button>
  </div>
  <div id="overlay" style="display:none;">
    <span id="overlay-message"></span>
  </div>
  <audio id="audio-player"></audio>
  <canvas id="export-canvas"></canvas>
  <div id="feedback-modal" style="display:none;"></div>
`;

// ---------------------------------------------------------------------------
// 3. Load source files into the jsdom global scope (order matters)
// ---------------------------------------------------------------------------

function loadSource(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  const code = fs.readFileSync(filePath, 'utf-8');
  // Use indirect eval so it runs in global scope
  const indirectEval = eval;
  indirectEval(code);
}

// elo.js has no dependencies — load first
loadSource('js/elo.js');

// utils.js defines KanyeUtils used by ui.js and app.js
loadSource('js/utils.js');

// Mock KanyeMessages (used by app.js for copy text)
window.KanyeMessages = {
  getRandomLandingSubtitle: jest.fn(() => 'Test subtitle'),
  getRandomComparisonTitle: jest.fn(() => 'Which is better?'),
  getRandomVsText: jest.fn(() => 'VS'),
  getRandomSkipText: jest.fn(() => 'Skip'),
  getResultsTitle: jest.fn(() => 'Your Top 10'),
  getResultsSubtitle: jest.fn(() => 'Nice picks')
};

// Load ui.js (needed by app.js constructor, depends on KanyeUtils + DOM)
loadSource('js/ui.js');

// Load app.js to make KanyeRankerApp class available on window.
// The class definition is safe to eval — the constructor is never called
// here because there is no auto-instantiation trigger in the source.
loadSource('js/app.js');
