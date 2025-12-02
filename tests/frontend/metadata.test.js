/**
 * @jest-environment jsdom
 */

const {
  fetchMetadata,
  updateNowPlayingDisplay,
  updateQualityDisplay,
  updateAlbumArt,
  updateRecentlyPlayed,
  formatElapsedTime,
} = require('../../public/app.module');

describe('Metadata and Display Module', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchMetadata', () => {
    test('should fetch metadata from URL', async () => {
      const mockData = {
        artist: 'Test Artist',
        title: 'Test Song',
        album: 'Test Album',
        date: '2023',
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await fetchMetadata('https://example.com/metadata.json');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/metadata.json');
      expect(result).toEqual(mockData);
    });

    test('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchMetadata('https://example.com/metadata.json')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('updateNowPlayingDisplay', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="currentArtist"></div>
        <div id="currentTitle"></div>
        <div id="currentAlbum"></div>
      `;
    });

    test('should update now playing display with all data', () => {
      const data = {
        artist: 'The Beatles',
        title: 'Hey Jude',
        album: 'The Beatles 1967-1970',
        date: '1968',
      };

      updateNowPlayingDisplay(data);

      expect(document.getElementById('currentArtist').textContent).toBe('The Beatles');
      expect(document.getElementById('currentTitle').textContent).toBe('Hey Jude (1968)');
      expect(document.getElementById('currentAlbum').textContent).toBe(
        'The Beatles 1967-1970'
      );
    });

    test('should handle missing year', () => {
      const data = {
        artist: 'Artist',
        title: 'Song',
        album: 'Album',
      };

      updateNowPlayingDisplay(data);

      expect(document.getElementById('currentTitle').textContent).toBe('Song');
    });

    test('should use defaults for missing data', () => {
      const data = {};

      updateNowPlayingDisplay(data);

      expect(document.getElementById('currentArtist').textContent).toBe('Unknown Artist');
      expect(document.getElementById('currentTitle').textContent).toBe('Unknown Title');
      expect(document.getElementById('currentAlbum').textContent).toBe('');
    });

    test('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = '';

      expect(() => updateNowPlayingDisplay({ artist: 'Test' })).not.toThrow();
    });
  });

  describe('updateQualityDisplay', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="sourceQuality"></div>
        <div id="streamQuality"></div>
      `;
    });

    test('should update quality display with provided data', () => {
      const data = {
        source_quality: '24-bit 192kHz',
        stream_quality: '96kHz FLAC',
      };

      updateQualityDisplay(data);

      expect(document.getElementById('sourceQuality').textContent).toBe(
        'Source quality: 24-bit 192kHz'
      );
      expect(document.getElementById('streamQuality').textContent).toBe(
        'Stream quality: 96kHz FLAC'
      );
    });

    test('should use default values when data missing', () => {
      const data = {};

      updateQualityDisplay(data);

      expect(document.getElementById('sourceQuality').textContent).toBe(
        'Source quality: 16-bit 44.1kHz'
      );
      expect(document.getElementById('streamQuality').textContent).toBe(
        'Stream quality: 48kHz FLAC / HLS Lossless'
      );
    });

    test('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = '';

      expect(() => updateQualityDisplay({})).not.toThrow();
    });
  });

  describe('updateAlbumArt', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <img id="albumArt" src="" />
      `;
    });

    test('should update album art with cache busting', () => {
      const coverUrl = 'https://example.com/cover.jpg';
      const beforeUpdate = Date.now();

      updateAlbumArt(coverUrl);

      const albumArt = document.getElementById('albumArt');
      expect(albumArt.src).toContain('https://example.com/cover.jpg?');

      // Extract timestamp
      const timestamp = parseInt(albumArt.src.split('?')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeUpdate);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should handle missing albumArt element', () => {
      document.body.innerHTML = '';

      expect(() => updateAlbumArt('https://example.com/cover.jpg')).not.toThrow();
    });
  });

  describe('updateRecentlyPlayed', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="trackList"></div>
      `;
    });

    test('should display recently played tracks', () => {
      const data = {
        prev_artist_1: 'Artist 1',
        prev_title_1: 'Song 1',
        prev_artist_2: 'Artist 2',
        prev_title_2: 'Song 2',
        prev_artist_3: 'Artist 3',
        prev_title_3: 'Song 3',
      };

      updateRecentlyPlayed(data);

      const trackList = document.getElementById('trackList');
      const tracks = trackList.querySelectorAll('.recent-track');

      expect(tracks.length).toBe(3);
      expect(tracks[0].querySelector('.recent-track-artist').textContent).toBe('Artist 1:');
      expect(tracks[0].querySelector('.recent-track-title').textContent).toBe('Song 1');
      expect(tracks[1].querySelector('.recent-track-artist').textContent).toBe('Artist 2:');
      expect(tracks[2].querySelector('.recent-track-artist').textContent).toBe('Artist 3:');
    });

    test('should handle all 5 previous tracks', () => {
      const data = {
        prev_artist_1: 'Artist 1',
        prev_title_1: 'Song 1',
        prev_artist_2: 'Artist 2',
        prev_title_2: 'Song 2',
        prev_artist_3: 'Artist 3',
        prev_title_3: 'Song 3',
        prev_artist_4: 'Artist 4',
        prev_title_4: 'Song 4',
        prev_artist_5: 'Artist 5',
        prev_title_5: 'Song 5',
      };

      updateRecentlyPlayed(data);

      const tracks = document.getElementById('trackList').querySelectorAll('.recent-track');
      expect(tracks.length).toBe(5);
    });

    test('should skip missing tracks', () => {
      const data = {
        prev_artist_1: 'Artist 1',
        prev_title_1: 'Song 1',
        // prev_2 missing
        prev_artist_3: 'Artist 3',
        prev_title_3: 'Song 3',
      };

      updateRecentlyPlayed(data);

      const tracks = document.getElementById('trackList').querySelectorAll('.recent-track');
      expect(tracks.length).toBe(2);
    });

    test('should clear existing tracks before updating', () => {
      document.getElementById('trackList').innerHTML = '<div>Old content</div>';

      updateRecentlyPlayed({
        prev_artist_1: 'Artist 1',
        prev_title_1: 'Song 1',
      });

      const trackList = document.getElementById('trackList');
      expect(trackList.textContent).not.toContain('Old content');
      expect(trackList.querySelectorAll('.recent-track').length).toBe(1);
    });

    test('should handle missing trackList element', () => {
      document.body.innerHTML = '';

      expect(() => updateRecentlyPlayed({})).not.toThrow();
    });

    test('should handle empty data', () => {
      updateRecentlyPlayed({});

      const trackList = document.getElementById('trackList');
      expect(trackList.innerHTML).toBe('');
    });
  });

  describe('formatElapsedTime', () => {
    test('should format seconds less than 60', () => {
      expect(formatElapsedTime(0)).toBe('0:00');
      expect(formatElapsedTime(5)).toBe('0:05');
      expect(formatElapsedTime(30)).toBe('0:30');
      expect(formatElapsedTime(59)).toBe('0:59');
    });

    test('should format minutes and seconds', () => {
      expect(formatElapsedTime(60)).toBe('1:00');
      expect(formatElapsedTime(65)).toBe('1:05');
      expect(formatElapsedTime(125)).toBe('2:05');
      expect(formatElapsedTime(599)).toBe('9:59');
    });

    test('should format hours as minutes', () => {
      expect(formatElapsedTime(3600)).toBe('60:00');
      expect(formatElapsedTime(3665)).toBe('61:05');
    });

    test('should pad seconds with zero', () => {
      expect(formatElapsedTime(61)).toBe('1:01');
      expect(formatElapsedTime(120)).toBe('2:00');
      expect(formatElapsedTime(305)).toBe('5:05');
    });
  });
});
