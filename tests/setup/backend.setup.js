// Backend test setup
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'prototype_db_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'admin';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || '';
process.env.PORT = '3001'; // Use different port for tests

// Global test timeout
jest.setTimeout(10000);
