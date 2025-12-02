module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/backend/**/*.test.js'],
      coveragePathIgnorePatterns: ['/node_modules/'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.setup.js'],
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.js'],
      setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        'jest-localstorage-mock',
        '<rootDir>/tests/setup/frontend.setup.js'
      ],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/setup/__mocks__/styleMock.js',
      },
    },
  ],
  collectCoverageFrom: [
    'server.js',
    'public/app.module.js',
    '!public/app.js', // Exclude original app.js, we test app.module.js
    '!public/**/*.test.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
