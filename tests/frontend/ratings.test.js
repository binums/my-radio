/**
 * @jest-environment jsdom
 */

const {
  submitRating,
  getRatingCounts,
  getUserRating,
  updateRatingDisplay,
  updateRatingButtonStates,
  validateRatingInput,
} = require('../../public/app.module');

describe('Rating System Frontend', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    document.body.innerHTML = `
      <button id="thumbsUpBtn" class="rating-button"></button>
      <button id="thumbsDownBtn" class="rating-button"></button>
      <span id="thumbsUpCount">0</span>
      <span id="thumbsDownCount">0</span>
    `;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submitRating', () => {
    test('should submit thumbs up rating successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          rating: { artist: 'Test Artist', title: 'Test Song', rating: 1 },
        }),
      });

      const result = await submitRating('Test Artist', 'Test Song', 1, 'fingerprint123');

      expect(global.fetch).toHaveBeenCalledWith('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artist: 'Test Artist',
          title: 'Test Song',
          rating: 1,
          userFingerprint: 'fingerprint123',
        }),
      });
      expect(result.success).toBe(true);
    });

    test('should submit thumbs down rating successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          rating: { rating: -1 },
        }),
      });

      const result = await submitRating('Test Artist', 'Test Song', -1, 'fingerprint123');

      expect(result.success).toBe(true);
      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.rating).toBe(-1);
    });

    test('should throw error on failed submission', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          message: 'Database error',
        }),
      });

      await expect(
        submitRating('Test Artist', 'Test Song', 1, 'fingerprint123')
      ).rejects.toThrow('Database error');
    });

    test('should throw generic error if no message provided', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      });

      await expect(
        submitRating('Test Artist', 'Test Song', 1, 'fingerprint123')
      ).rejects.toThrow('Failed to submit rating');
    });

    test('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        submitRating('Test Artist', 'Test Song', 1, 'fingerprint123')
      ).rejects.toThrow('Network error');
    });
  });

  describe('getRatingCounts', () => {
    test('should fetch rating counts for a song', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          artist: 'Test Artist',
          title: 'Test Song',
          thumbsUp: 5,
          thumbsDown: 2,
        }),
      });

      const result = await getRatingCounts('Test Artist', 'Test Song');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ratings/Test%20Artist/Test%20Song'
      );
      expect(result.thumbsUp).toBe(5);
      expect(result.thumbsDown).toBe(2);
    });

    test('should handle special characters in artist/title', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          thumbsUp: 0,
          thumbsDown: 0,
        }),
      });

      await getRatingCounts("Artist's Name", 'Song & Title');

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/ratings/Artist's%20Name/Song%20%26%20Title"
      );
    });

    test('should return zero counts for unrated song', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          thumbsUp: 0,
          thumbsDown: 0,
        }),
      });

      const result = await getRatingCounts('Unknown Artist', 'Unknown Song');

      expect(result.thumbsUp).toBe(0);
      expect(result.thumbsDown).toBe(0);
    });
  });

  describe('getUserRating', () => {
    test('should fetch user rating when exists', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          hasRated: true,
          rating: 1,
        }),
      });

      const result = await getUserRating('Test Artist', 'Test Song', 'fingerprint123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ratings/Test%20Artist/Test%20Song/user/fingerprint123'
      );
      expect(result.hasRated).toBe(true);
      expect(result.rating).toBe(1);
    });

    test('should return hasRated false when user has not rated', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          hasRated: false,
          rating: null,
        }),
      });

      const result = await getUserRating('Test Artist', 'Test Song', 'fingerprint123');

      expect(result.hasRated).toBe(false);
      expect(result.rating).toBeNull();
    });
  });

  describe('updateRatingDisplay', () => {
    test('should update rating count displays', () => {
      updateRatingDisplay(10, 5);

      expect(document.getElementById('thumbsUpCount').textContent).toBe('10');
      expect(document.getElementById('thumbsDownCount').textContent).toBe('5');
    });

    test('should handle zero counts', () => {
      updateRatingDisplay(0, 0);

      expect(document.getElementById('thumbsUpCount').textContent).toBe('0');
      expect(document.getElementById('thumbsDownCount').textContent).toBe('0');
    });

    test('should handle missing elements gracefully', () => {
      document.body.innerHTML = '';

      expect(() => updateRatingDisplay(10, 5)).not.toThrow();
    });
  });

  describe('updateRatingButtonStates', () => {
    test('should highlight thumbs up button when user rated up', () => {
      const userRating = { hasRated: true, rating: 1 };

      updateRatingButtonStates(userRating);

      const thumbsUpBtn = document.getElementById('thumbsUpBtn');
      const thumbsDownBtn = document.getElementById('thumbsDownBtn');

      expect(thumbsUpBtn.classList.contains('active')).toBe(true);
      expect(thumbsDownBtn.classList.contains('active')).toBe(false);
    });

    test('should highlight thumbs down button when user rated down', () => {
      const userRating = { hasRated: true, rating: -1 };

      updateRatingButtonStates(userRating);

      const thumbsUpBtn = document.getElementById('thumbsUpBtn');
      const thumbsDownBtn = document.getElementById('thumbsDownBtn');

      expect(thumbsUpBtn.classList.contains('active')).toBe(false);
      expect(thumbsDownBtn.classList.contains('active')).toBe(true);
    });

    test('should reset buttons when user has not rated', () => {
      // First set both to active
      document.getElementById('thumbsUpBtn').classList.add('active');
      document.getElementById('thumbsDownBtn').classList.add('active');

      const userRating = { hasRated: false, rating: null };

      updateRatingButtonStates(userRating);

      const thumbsUpBtn = document.getElementById('thumbsUpBtn');
      const thumbsDownBtn = document.getElementById('thumbsDownBtn');

      expect(thumbsUpBtn.classList.contains('active')).toBe(false);
      expect(thumbsDownBtn.classList.contains('active')).toBe(false);
    });

    test('should enable buttons', () => {
      document.getElementById('thumbsUpBtn').disabled = true;
      document.getElementById('thumbsDownBtn').disabled = true;

      updateRatingButtonStates({ hasRated: false });

      expect(document.getElementById('thumbsUpBtn').disabled).toBe(false);
      expect(document.getElementById('thumbsDownBtn').disabled).toBe(false);
    });

    test('should handle missing buttons gracefully', () => {
      document.body.innerHTML = '';

      expect(() => updateRatingButtonStates({ hasRated: true, rating: 1 })).not.toThrow();
    });

    test('should handle null userRating', () => {
      expect(() => updateRatingButtonStates(null)).not.toThrow();
    });
  });

  describe('validateRatingInput', () => {
    test('should validate correct input', () => {
      const result = validateRatingInput('Artist', 'Song', 1, 'fingerprint');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject missing artist', () => {
      const result = validateRatingInput('', 'Song', 1, 'fingerprint');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No song currently playing');
    });

    test('should reject missing title', () => {
      const result = validateRatingInput('Artist', '', 1, 'fingerprint');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No song currently playing');
    });

    test('should reject invalid rating value', () => {
      const result = validateRatingInput('Artist', 'Song', 5, 'fingerprint');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Rating must be 1 or -1');
    });

    test('should reject missing fingerprint', () => {
      const result = validateRatingInput('Artist', 'Song', 1, '');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('User fingerprint not available');
    });

    test('should accept rating -1', () => {
      const result = validateRatingInput('Artist', 'Song', -1, 'fingerprint');

      expect(result.valid).toBe(true);
    });

    test('should accept rating 1', () => {
      const result = validateRatingInput('Artist', 'Song', 1, 'fingerprint');

      expect(result.valid).toBe(true);
    });
  });
});
