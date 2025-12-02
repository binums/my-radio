# Radio Calico Test Suite

Comprehensive unit testing framework for both backend and frontend components of Radio Calico.

## Test Structure

```
tests/
├── backend/
│   ├── api.test.js         # Basic API endpoints (health, static files)
│   └── ratings.test.js     # Rating system endpoints
├── frontend/
│   ├── fingerprinting.test.js  # User fingerprinting logic
│   ├── ratings.test.js         # Rating UI and API integration
│   ├── metadata.test.js        # Metadata fetching and display
│   └── ui.test.js              # UI interactions (play/pause, volume)
└── setup/
    ├── backend.setup.js    # Backend test configuration
    ├── frontend.setup.js   # Frontend test configuration
    └── __mocks__/
        └── styleMock.js    # CSS import mock
```

## Running Tests

### All Tests
```bash
npm test
```

### Backend Tests Only
```bash
npm run test:backend
```

### Frontend Tests Only
```bash
npm run test:frontend
```

### Watch Mode (re-run on file changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Verbose Output
```bash
npm run test:verbose
```

## Backend Test Coverage

### API Endpoints (`tests/backend/api.test.js`)
- ✓ GET `/api` - Welcome message
- ✓ GET `/api/health` - Database health check
- ✓ GET `/api/test` - Database version query
- ✓ GET `/api/client-ip` - IP address extraction
  - X-Forwarded-For header handling
  - X-Real-IP header handling
- ✓ Static file serving (index.html, styles.css, app.js)
- ✓ 404 handling for non-existent files

### Rating System (`tests/backend/ratings.test.js`)
- ✓ POST `/api/ratings` - Submit ratings
  - Valid thumbs up (1) and thumbs down (-1)
  - Invalid rating value rejection
  - Missing field validation (artist, title, rating, userFingerprint)
  - Upsert functionality (change existing rating)
  - Special character handling
- ✓ GET `/api/ratings/:artist/:title` - Get rating counts
  - Zero counts for unrated songs
  - Correct aggregation of multiple ratings
  - URL encoding of special characters
- ✓ GET `/api/ratings/:artist/:title/user/:fingerprint` - User rating check
  - User has rated (returns rating)
  - User hasn't rated (returns null)
  - Multiple users for same song
- ✓ Integration workflow tests (complete rating lifecycle)

## Frontend Test Coverage

### Fingerprinting (`tests/frontend/fingerprinting.test.js`)
- ✓ `hashString()` - SHA-256 hashing
  - Consistent hash generation
  - Hex string output
- ✓ `generateBrowserFingerprint()` - Browser fingerprinting
  - Collects all components (screen, navigator, canvas, WebGL)
  - Includes IP address from server
  - Error handling for canvas/IP failures
- ✓ `getUserFingerprint()` - Fingerprint management
  - Generates and caches in localStorage
  - Retrieves cached fingerprint
  - Creates new if not cached

### Rating System (`tests/frontend/ratings.test.js`)
- ✓ `submitRating()` - Submit rating to API
  - Thumbs up/down submission
  - Error handling for failed submissions
  - Network error handling
- ✓ `getRatingCounts()` - Fetch rating counts
  - Fetches counts for songs
  - Handles special characters
  - Returns zero for unrated songs
- ✓ `getUserRating()` - Check user's rating
  - Returns rating when exists
  - Returns null when doesn't exist
- ✓ `updateRatingDisplay()` - Update count display
  - Updates thumbs up/down counts
  - Handles zero counts
  - Graceful handling of missing elements
- ✓ `updateRatingButtonStates()` - Button state management
  - Highlights user's rating
  - Resets buttons when no rating
  - Enables/disables buttons appropriately
- ✓ `validateRatingInput()` - Input validation
  - Validates correct input
  - Rejects missing artist/title
  - Rejects invalid rating values
  - Rejects missing fingerprint

### Metadata & Display (`tests/frontend/metadata.test.js`)
- ✓ `fetchMetadata()` - Fetch from external API
  - Successful fetch
  - Error handling
- ✓ `updateNowPlayingDisplay()` - Update track info
  - Updates artist/title/album
  - Handles missing year
  - Uses defaults for missing data
  - Graceful DOM element handling
- ✓ `updateQualityDisplay()` - Update quality info
  - Updates source/stream quality
  - Uses default values
  - Graceful DOM element handling
- ✓ `updateAlbumArt()` - Update album artwork
  - Cache busting with timestamp
  - Graceful handling of missing element
- ✓ `updateRecentlyPlayed()` - Update track history
  - Displays up to 5 recent tracks
  - Skips missing tracks
  - Clears existing tracks before updating
  - Handles empty data
- ✓ `formatElapsedTime()` - Time formatting
  - Formats seconds (0:00 - 0:59)
  - Formats minutes:seconds (1:00+)
  - Pads seconds with zero

### UI Interactions (`tests/frontend/ui.test.js`)
- ✓ `showError()` - Error message display
  - Displays error message
  - Auto-hides after 5 seconds
  - Handles consecutive errors
  - Graceful handling of missing element
- ✓ `setupPlayPauseButton()` - Play/pause functionality
  - Starts playback
  - Pauses playback
  - Toggles between states
  - Handles playback errors
- ✓ `setupVolumeControl()` - Volume control
  - Initializes volume from slider
  - Updates volume on slider change
  - Handles 0-100 range
  - Multiple volume changes

## Test Environment

### Backend
- **Environment**: Node.js
- **Database**: PostgreSQL (uses test database `prototype_db_test`)
- **Framework**: Jest + Supertest
- **Test isolation**: Database cleanup before/after tests

### Frontend
- **Environment**: jsdom
- **Framework**: Jest + Testing Library
- **Mocks**:
  - HLS.js (audio streaming)
  - crypto.subtle (fingerprinting)
  - fetch (API calls)
  - canvas/WebGL (fingerprinting)
  - localStorage

## Coverage Goals

- **Backend**: 80%+ overall, 90%+ on rating endpoints
- **Frontend**: 70%+ overall, 80%+ on rating logic

## Database Setup for Tests

Tests expect a test database named `prototype_db_test`. You can create it with:

```bash
createdb prototype_db_test
```

Or set custom test database via environment variables in `tests/setup/backend.setup.js`:
- `TEST_DB_HOST`
- `TEST_DB_PORT`
- `TEST_DB_NAME`
- `TEST_DB_USER`
- `TEST_DB_PASSWORD`

The test suite automatically cleans up test data after each test.

## Adding New Tests

### Backend Test Template
```javascript
const request = require('supertest');
const { app, pool } = require('../../server');

describe('My Feature', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('should do something', async () => {
    const response = await request(app).get('/api/my-endpoint');
    expect(response.status).toBe(200);
  });
});
```

### Frontend Test Template
```javascript
/**
 * @jest-environment jsdom
 */

const { myFunction } = require('../../public/app.module');

describe('My Feature', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="test"></div>`;
  });

  test('should do something', () => {
    myFunction();
    expect(document.getElementById('test')).toBeDefined();
  });
});
```

## CI/CD Integration

Tests are designed to run in CI environments. Set environment variables for database connection:

```yaml
env:
  NODE_ENV: test
  TEST_DB_HOST: localhost
  TEST_DB_NAME: prototype_db_test
  TEST_DB_USER: testuser
  TEST_DB_PASSWORD: testpass
```

## Notes

- **No code duplication**: `app.js` imports from `app.module.js`
- `app.module.js` is the single source of truth for application logic
- Production and tests use the exact same code (DRY principle)
- Backend tests run against real PostgreSQL database
- All API tests include cleanup to prevent data pollution
- `app.module.js` exports work in both browser and Node.js environments
