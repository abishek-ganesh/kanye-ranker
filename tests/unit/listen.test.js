/**
 * Tests for the results-screen listening helpers: per-song Spotify links and
 * the "Copy tracklist" text that playlist import tools (TuneMyMusic, Soundiiz) read.
 */

const fs = require('fs');
const path = require('path');

const songsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/songs.json'), 'utf8')
);
const { spotifyTrackUrl, formatTracklist } = window.KanyeUtils;

describe('spotifyTrackUrl', () => {
  test('turns a track URI into an open.spotify.com link', () => {
    expect(spotifyTrackUrl('spotify:track:4EWCNWgDS8707fNSZ1oaA5'))
      .toBe('https://open.spotify.com/track/4EWCNWgDS8707fNSZ1oaA5');
  });

  test.each([undefined, null, '', 'spotify:album:abc', 'https://evil.example/track/x', 'spotify:track:"><script>'])(
    'returns null for %p',
    uri => expect(spotifyTrackUrl(uri)).toBeNull()
  );

  test('every song in songs.json has a usable Spotify link', () => {
    const missing = songsData.songs.filter(s => !spotifyTrackUrl(s.spotifyUri)).map(s => s.title);
    expect(missing).toEqual([]);
  });
});

describe('formatTracklist', () => {
  test('one "Kanye West - Title" line per song, in rank order, uncensored', () => {
    const songs = [{ title: 'Runaway' }, { title: 'Niggas in Paris' }, { title: 'Flashing Lights' }];
    expect(formatTracklist(songs)).toBe(
      'Kanye West - Runaway\nKanye West - Niggas in Paris\nKanye West - Flashing Lights'
    );
  });

  test('empty list gives empty text', () => {
    expect(formatTracklist([])).toBe('');
  });
});

describe('UI.copyTracklist', () => {
  const copyTracklist = window.UI.prototype.copyTracklist;

  function context(songs) {
    return { displayedTopSongs: songs, showSuccess: jest.fn(), showError: jest.fn() };
  }

  beforeEach(() => {
    navigator.clipboard.writeText.mockReset();
    window.analytics.trackTracklistCopied = jest.fn();
  });

  test('copies the displayed Top 10 and tracks it', async () => {
    navigator.clipboard.writeText.mockResolvedValue();
    const ctx = context([{ title: 'Runaway' }, { title: 'Stronger' }]);

    await expect(copyTracklist.call(ctx)).resolves.toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Kanye West - Runaway\nKanye West - Stronger');
    expect(ctx.showSuccess).toHaveBeenCalled();
    expect(window.analytics.trackTracklistCopied).toHaveBeenCalledWith(2);
  });

  test('falls back to execCommand when the Clipboard API is blocked', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('denied'));
    document.execCommand = jest.fn(() => true);
    const ctx = context([{ title: 'Runaway' }]);

    await expect(copyTracklist.call(ctx)).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    expect(ctx.showSuccess).toHaveBeenCalled();
  });

  test('shows an error and does not track when both copy paths fail', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('denied'));
    document.execCommand = jest.fn(() => false);
    const ctx = context([{ title: 'Runaway' }]);

    await expect(copyTracklist.call(ctx)).resolves.toBe(false);
    expect(ctx.showError).toHaveBeenCalled();
    expect(window.analytics.trackTracklistCopied).not.toHaveBeenCalled();
  });

  test('does nothing before results are shown', async () => {
    const ctx = context(undefined);
    await expect(copyTracklist.call(ctx)).resolves.toBe(false);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
