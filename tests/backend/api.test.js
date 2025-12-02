const request = require('supertest');
const { app, pool } = require('../../server');

describe('Backend API Tests', () => {
  // Cleanup after all tests
  afterAll(async () => {
    await pool.end();
  });

  describe('Basic Endpoints', () => {
    test('GET /api should return welcome message', async () => {
      const response = await request(app).get('/api');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('database', 'connected');
    });

    test('GET /api/health should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /api/test should return database version', async () => {
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Database query successful');
      expect(response.body).toHaveProperty('version');
      expect(response.body.version).toContain('PostgreSQL');
    });

    test('GET /api/client-ip should return IP address', async () => {
      const response = await request(app).get('/api/client-ip');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ip');
      expect(typeof response.body.ip).toBe('string');
    });

    test('GET /api/client-ip should handle x-forwarded-for header', async () => {
      const response = await request(app)
        .get('/api/client-ip')
        .set('x-forwarded-for', '192.168.1.100, 10.0.0.1');

      expect(response.status).toBe(200);
      expect(response.body.ip).toBe('192.168.1.100');
    });

    test('GET /api/client-ip should handle x-real-ip header', async () => {
      const response = await request(app)
        .get('/api/client-ip')
        .set('x-real-ip', '192.168.1.50');

      expect(response.status).toBe(200);
      expect(response.body.ip).toBe('192.168.1.50');
    });
  });

  describe('Static File Serving', () => {
    test('GET / should serve index.html', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Radio Calico');
    });

    test('GET /styles.css should serve CSS file', async () => {
      const response = await request(app).get('/styles.css');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/css');
    });

    test('GET /app.js should serve JavaScript file', async () => {
      const response = await request(app).get('/app.js');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/javascript/);
    });

    test('GET /nonexistent should return 404', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
