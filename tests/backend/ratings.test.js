const request = require('supertest');
const { app, pool } = require('../../server');

describe('Rating System API Tests', () => {
  const testArtist = 'Test Artist';
  const testTitle = 'Test Song';
  const testFingerprint = 'test-fingerprint-123';

  // Clean up test data before each test
  beforeEach(async () => {
    await pool.query(
      'DELETE FROM song_ratings WHERE artist = $1 AND title = $2',
      [testArtist, testTitle]
    );
  });

  // Cleanup after all tests
  afterAll(async () => {
    await pool.query(
      'DELETE FROM song_ratings WHERE artist = $1 AND title = $2',
      [testArtist, testTitle]
    );
    await pool.end();
  });

  describe('POST /api/ratings - Submit Rating', () => {
    test('should accept valid thumbs up rating (1)', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('rating');
      expect(response.body.rating).toHaveProperty('artist', testArtist);
      expect(response.body.rating).toHaveProperty('title', testTitle);
      expect(response.body.rating).toHaveProperty('rating', 1);
    });

    test('should accept valid thumbs down rating (-1)', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: -1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.rating).toHaveProperty('rating', -1);
    });

    test('should reject invalid rating value (not 1 or -1)', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: 5,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Rating must be 1 or -1');
    });

    test('should reject missing artist field', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          title: testTitle,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('should reject missing title field', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('should reject missing rating field', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('should reject missing userFingerprint field', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('should reject non-string artist field', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: 12345,
          title: testTitle,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Artist, title, and userFingerprint must be strings');
    });

    test('should reject non-string title field', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: { name: 'Song' },
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Artist, title, and userFingerprint must be strings');
    });

    test('should reject non-string userFingerprint field', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: 1,
          userFingerprint: ['array', 'of', 'values'],
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Artist, title, and userFingerprint must be strings');
    });

    test('should reject artist exceeding 255 characters', async () => {
      const longArtist = 'A'.repeat(256);
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: longArtist,
          title: testTitle,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Artist name exceeds maximum length of 255 characters');
    });

    test('should reject title exceeding 255 characters', async () => {
      const longTitle = 'T'.repeat(256);
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: longTitle,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title exceeds maximum length of 255 characters');
    });

    test('should reject userFingerprint exceeding 255 characters', async () => {
      const longFingerprint = 'F'.repeat(256);
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: 1,
          userFingerprint: longFingerprint,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'User fingerprint exceeds maximum length of 255 characters');
    });

    test('should accept fields exactly at 255 character limit', async () => {
      const maxLengthArtist = 'A'.repeat(255);
      const maxLengthTitle = 'T'.repeat(255);
      const maxLengthFingerprint = 'F'.repeat(255);

      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: maxLengthArtist,
          title: maxLengthTitle,
          rating: 1,
          userFingerprint: maxLengthFingerprint,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Cleanup
      await pool.query(
        'DELETE FROM song_ratings WHERE artist = $1 AND title = $2',
        [maxLengthArtist, maxLengthTitle]
      );
    });

    test('should update existing user rating (upsert functionality)', async () => {
      // First rating: thumbs up
      await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      // Second rating: thumbs down (should update)
      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: testArtist,
          title: testTitle,
          rating: -1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(200);
      expect(response.body.rating).toHaveProperty('rating', -1);

      // Verify only one record exists
      const result = await pool.query(
        'SELECT COUNT(*) FROM song_ratings WHERE artist = $1 AND title = $2 AND user_fingerprint = $3',
        [testArtist, testTitle, testFingerprint]
      );
      expect(parseInt(result.rows[0].count)).toBe(1);
    });

    test('should handle special characters in artist/title', async () => {
      const specialArtist = "Artist's Name & Co.";
      const specialTitle = 'Song "Title" (Remix)';

      const response = await request(app)
        .post('/api/ratings')
        .send({
          artist: specialArtist,
          title: specialTitle,
          rating: 1,
          userFingerprint: testFingerprint,
        });

      expect(response.status).toBe(200);
      expect(response.body.rating).toHaveProperty('artist', specialArtist);
      expect(response.body.rating).toHaveProperty('title', specialTitle);

      // Cleanup
      await pool.query(
        'DELETE FROM song_ratings WHERE artist = $1 AND title = $2',
        [specialArtist, specialTitle]
      );
    });
  });

  describe('GET /api/ratings/:artist/:title - Get Rating Counts', () => {
    test('should return zero counts for unrated song', async () => {
      const response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('artist', testArtist);
      expect(response.body).toHaveProperty('title', testTitle);
      expect(response.body).toHaveProperty('thumbsUp', 0);
      expect(response.body).toHaveProperty('thumbsDown', 0);
    });

    test('should return correct aggregated counts', async () => {
      // Add multiple ratings
      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: 1,
        userFingerprint: 'user1',
      });

      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: 1,
        userFingerprint: 'user2',
      });

      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: -1,
        userFingerprint: 'user3',
      });

      const response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('thumbsUp', 2);
      expect(response.body).toHaveProperty('thumbsDown', 1);
    });

    test('should handle URL-encoded special characters', async () => {
      const specialArtist = "Artist's Name";
      const specialTitle = 'Song & Title';

      await request(app).post('/api/ratings').send({
        artist: specialArtist,
        title: specialTitle,
        rating: 1,
        userFingerprint: testFingerprint,
      });

      const response = await request(app).get(
        `/api/ratings/${encodeURIComponent(specialArtist)}/${encodeURIComponent(specialTitle)}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('artist', specialArtist);
      expect(response.body).toHaveProperty('title', specialTitle);

      // Cleanup
      await pool.query(
        'DELETE FROM song_ratings WHERE artist = $1 AND title = $2',
        [specialArtist, specialTitle]
      );
    });
  });

  describe('GET /api/ratings/:artist/:title/user/:fingerprint - Check User Rating', () => {
    test('should return hasRated false when user has not rated', async () => {
      const response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}/user/${testFingerprint}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('hasRated', false);
      expect(response.body).toHaveProperty('rating', null);
    });

    test('should return hasRated true with rating when user has rated', async () => {
      // Submit a rating first
      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: 1,
        userFingerprint: testFingerprint,
      });

      const response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}/user/${testFingerprint}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('hasRated', true);
      expect(response.body).toHaveProperty('rating', 1);
    });

    test('should return correct rating for different users', async () => {
      const fingerprint1 = 'user1';
      const fingerprint2 = 'user2';

      // User 1 rates thumbs up
      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: 1,
        userFingerprint: fingerprint1,
      });

      // User 2 rates thumbs down
      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: -1,
        userFingerprint: fingerprint2,
      });

      // Check user 1
      const response1 = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}/user/${fingerprint1}`
      );
      expect(response1.body).toHaveProperty('rating', 1);

      // Check user 2
      const response2 = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}/user/${fingerprint2}`
      );
      expect(response2.body).toHaveProperty('rating', -1);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete rating workflow', async () => {
      const user1 = 'user1-fingerprint';
      const user2 = 'user2-fingerprint';

      // Step 1: Check initial state (no ratings)
      let response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}`
      );
      expect(response.body.thumbsUp).toBe(0);
      expect(response.body.thumbsDown).toBe(0);

      // Step 2: User 1 submits thumbs up
      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: 1,
        userFingerprint: user1,
      });

      response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}`
      );
      expect(response.body.thumbsUp).toBe(1);
      expect(response.body.thumbsDown).toBe(0);

      // Step 3: User 2 submits thumbs down
      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: -1,
        userFingerprint: user2,
      });

      response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}`
      );
      expect(response.body.thumbsUp).toBe(1);
      expect(response.body.thumbsDown).toBe(1);

      // Step 4: User 1 changes to thumbs down
      await request(app).post('/api/ratings').send({
        artist: testArtist,
        title: testTitle,
        rating: -1,
        userFingerprint: user1,
      });

      response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}`
      );
      expect(response.body.thumbsUp).toBe(0);
      expect(response.body.thumbsDown).toBe(2);

      // Step 5: Verify user states
      response = await request(app).get(
        `/api/ratings/${encodeURIComponent(testArtist)}/${encodeURIComponent(testTitle)}/user/${user1}`
      );
      expect(response.body.hasRated).toBe(true);
      expect(response.body.rating).toBe(-1);
    });
  });
});
