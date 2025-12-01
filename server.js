const express = require('express');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('✓ Connected to PostgreSQL database');
    release();
  }
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to your prototype API',
    status: 'running',
    database: 'connected'
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Example database query endpoint
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT version()');
    res.json({
      message: 'Database query successful',
      version: result.rows[0].version
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database query failed',
      message: error.message
    });
  }
});

// Submit song rating
app.post('/api/ratings', async (req, res) => {
  try {
    const { artist, title, rating, userFingerprint } = req.body;

    // Validate input
    if (!artist || !title || !rating || !userFingerprint) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating !== 1 && rating !== -1) {
      return res.status(400).json({ error: 'Rating must be 1 or -1' });
    }

    // Insert or update rating (upsert)
    const result = await pool.query(
      `INSERT INTO song_ratings (artist, title, rating, user_fingerprint)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (artist, title, user_fingerprint)
       DO UPDATE SET rating = $3, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [artist, title, rating, userFingerprint]
    );

    res.json({
      success: true,
      rating: result.rows[0]
    });
  } catch (error) {
    console.error('Rating submission error:', error);
    res.status(500).json({
      error: 'Failed to submit rating',
      message: error.message
    });
  }
});

// Get rating counts for a song
app.get('/api/ratings/:artist/:title', async (req, res) => {
  try {
    const { artist, title } = req.params;

    const result = await pool.query(
      `SELECT
        COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
        COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down
       FROM song_ratings
       WHERE artist = $1 AND title = $2`,
      [artist, title]
    );

    res.json({
      artist,
      title,
      thumbsUp: parseInt(result.rows[0].thumbs_up) || 0,
      thumbsDown: parseInt(result.rows[0].thumbs_down) || 0
    });
  } catch (error) {
    console.error('Rating retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve ratings',
      message: error.message
    });
  }
});

// Check if user has rated a song
app.get('/api/ratings/:artist/:title/user/:fingerprint', async (req, res) => {
  try {
    const { artist, title, fingerprint } = req.params;

    const result = await pool.query(
      `SELECT rating FROM song_ratings
       WHERE artist = $1 AND title = $2 AND user_fingerprint = $3`,
      [artist, title, fingerprint]
    );

    if (result.rows.length > 0) {
      res.json({
        hasRated: true,
        rating: result.rows[0].rating
      });
    } else {
      res.json({
        hasRated: false,
        rating: null
      });
    }
  } catch (error) {
    console.error('User rating check error:', error);
    res.status(500).json({
      error: 'Failed to check user rating',
      message: error.message
    });
  }
});

// Get client IP address
app.get('/api/client-ip', (req, res) => {
  // Try to get real IP from various headers (for proxies/load balancers)
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
             req.headers['x-real-ip'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             'unknown';

  res.json({ ip });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
  });
});
