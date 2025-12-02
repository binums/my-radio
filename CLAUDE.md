# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a streaming radio web application that plays lossless audio (HLS FLAC) with real-time metadata display, album artwork, and song rating functionality. The application consists of a Node.js/Express backend with PostgreSQL database and a single-page HTML/CSS/JS frontend.

## File Structure

```
radiocalico/
├── server.js                  # Express server (exports app & pool for testing)
├── package.json               # Dependencies and test scripts
├── jest.config.js             # Jest test configuration
├── .env                       # Environment variables
├── .env.example               # Environment variables template
├── CLAUDE.md                  # This file - project documentation
├── README.md                  # Project overview
├── TESTING.md                 # Testing framework documentation
├── DOCKER.md                  # Docker deployment guide
├── .test-commands             # Quick reference for test commands
├── Makefile                   # Docker convenience commands
│
├── docker/                    # Docker configuration
│   └── init.sql              # Database initialization script
│
├── Dockerfile                 # Production Docker image
├── Dockerfile.dev             # Development Docker image
├── docker-compose.yml         # Production Docker Compose
├── docker-compose.dev.yml     # Development Docker Compose
├── .dockerignore              # Docker build exclusions
│
├── public/                    # Frontend files (served statically)
│   ├── index.html            # Main HTML page
│   ├── styles.css            # All CSS styling
│   ├── app.js                # Main application logic (production)
│   ├── app.module.js         # Modular version for testing
│   └── logo.png              # Radio Calico logo
│
└── tests/                     # Test suite (96 tests, 87% coverage)
    ├── README.md             # Testing guide
    ├── backend/              # Backend tests (42 tests)
    │   ├── api.test.js       # API endpoints
    │   └── ratings.test.js   # Rating system
    ├── frontend/             # Frontend tests (54 tests)
    │   ├── fingerprinting.test.js
    │   ├── ratings.test.js
    │   ├── metadata.test.js
    │   └── ui.test.js
    └── setup/                # Test configuration
        ├── backend.setup.js
        ├── frontend.setup.js
        └── __mocks__/
            └── styleMock.js
```

## Development Commands

### Local Development

**Start the server:**
```bash
npm start
# Note: This runs in the foreground. If you need to restart it, run it in the background using:
npm start &
```

**Run tests:**
```bash
npm test                    # Run all tests (backend + frontend)
npm run test:backend        # Run backend tests only
npm run test:frontend       # Run frontend tests only
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
```

**Security scanning:**
```bash
npm run security:audit      # Run security audit
npm run security:audit-fix  # Fix security vulnerabilities
npm run security:check      # Check (fail on moderate+)
npm run security:full       # Full scan (audit + outdated)
```

### Docker Development

**Quick start (using Makefile):**
```bash
make dev                    # Start development environment
make dev-logs               # View logs
make dev-test               # Run tests in container
make security               # Run security audit
make dev-down               # Stop development environment
```

**Production deployment:**
```bash
make build                  # Build production images
make up                     # Start production services
make logs                   # View logs
make down                   # Stop services
```

**Using docker-compose directly:**
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml exec app npm test

# Production
docker-compose up -d
docker-compose logs -f app
```

See `DOCKER.md` for comprehensive Docker deployment documentation.

**Access PostgreSQL database:**
```bash
/opt/homebrew/opt/postgresql@16/bin/psql prototype_db
/opt/homebrew/opt/postgresql@16/bin/psql prototype_db_test  # Test database
```

**List database tables:**
```bash
/opt/homebrew/opt/postgresql@16/bin/psql prototype_db -c "\dt"
```

**Restart PostgreSQL service:**
```bash
brew services restart postgresql@16
```

## Architecture

### Backend (server.js)
- **Express.js** server on port 3000 (configurable via .env)
- **PostgreSQL connection pool** using `pg` library
- Environment variables loaded via `dotenv`
- Static files served from `/public` directory
- **Exports:** `app` and `pool` for unit testing (server only starts when run directly)

### Database Schema
Database name: `prototype_db` (production), `prototype_db_test` (testing)

**song_ratings table:**
- `id` (integer, primary key, auto-increment)
- `artist` (text, not null)
- `title` (text, not null)
- `rating` (smallint, not null, must be 1 or -1)
- `user_fingerprint` (text, not null)
- `created_at` (timestamp, defaults to CURRENT_TIMESTAMP)
- Unique constraint on (artist, title, user_fingerprint) for upserts
- Index on (artist, title) for query performance

**Test Database:**
- Same schema as production
- Automatically cleaned up after each test
- Database name: `prototype_db_test`

### API Endpoints

**GET /api** - Welcome/status endpoint
**GET /api/health** - Health check with database connection test
**GET /api/test** - Test database query (returns PostgreSQL version)
**POST /api/ratings** - Submit song rating (thumbs up/down)
  - Body: `{ artist, title, rating, userFingerprint }`
  - Uses upsert to allow users to change ratings
**GET /api/ratings/:artist/:title** - Get aggregated rating counts for a song
**GET /api/ratings/:artist/:title/user/:fingerprint** - Check if user has rated a song
**GET /api/client-ip** - Returns client IP address (used for fingerprinting)

### Frontend Structure
The frontend follows a clean separation of concerns with files in `/public`:

**public/index.html** - Structure and content
- HTML markup for the single-page application
- Audio player element
- Links to external CSS and JavaScript files

**public/styles.css** - Styling and presentation
- All CSS styling rules
- Responsive design with mobile breakpoints
- Custom styling for audio controls, rating buttons, and track display

**public/app.module.js** - Core application logic (shared library)
- **All reusable functions** exported as a module
- Organized into logical modules: fingerprinting, metadata, rating, UI, audio player, validation
- Works in both browser (global `window.RadioCalicoModule`) and Node.js (CommonJS)
- Used by both production app.js and test suite
- **Single source of truth** - no code duplication

**public/app.js** - Application initialization and orchestration
- Imports functions from app.module.js
- Application state management (currentTrack, timers, intervals)
- Coordinates between modules (metadata polling, rating updates, elapsed time)
- HLS.js error handling and recovery
- UI event handlers and initialization
- **Only ~250 lines** - focused on glue code and application flow

### External Dependencies
The frontend fetches from an external CDN:
- Stream URL: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`
- Metadata API: `https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json`
- Album art: `https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg`

## Brand Guidelines

The project follows a specific design system documented in `RadioCalico_Style_Guide.txt`:
- **Fonts:** Montserrat (headings), Open Sans (body)
- **Primary colors:**
  - Mint (#D8F2D5)
  - Forest Green (#1F4E23)
  - Teal (#38A29D)
  - Charcoal (#231F20)
- Current implementation uses different colors (gray header #5a5a5a, mint background #c8d4a8) - note this discrepancy if working on UI

## Testing Framework

Radio Calico has a comprehensive test suite covering both backend and frontend.

**Test Coverage:**
- 96 passing tests (42 backend, 54 frontend)
- 87% overall code coverage
- Backend: 76% coverage
- Frontend: 92% coverage

**Test Structure:**
```
tests/
├── backend/
│   ├── api.test.js         # API endpoints (health, static files, etc.)
│   └── ratings.test.js     # Rating system endpoints
├── frontend/
│   ├── fingerprinting.test.js  # User fingerprinting logic
│   ├── ratings.test.js         # Rating UI and integration
│   ├── metadata.test.js        # Metadata fetching and display
│   └── ui.test.js              # UI interactions (play/pause, volume)
└── setup/
    ├── backend.setup.js    # Backend test configuration
    ├── frontend.setup.js   # Frontend mocks (HLS.js, crypto, etc.)
    └── __mocks__/          # CSS and other mocks
```

**Testing Tools:**
- **Jest** - Test runner and assertions
- **Supertest** - HTTP API testing
- **Testing Library** - DOM testing utilities
- **jsdom** - Browser environment simulation
- Mocks for: HLS.js, crypto.subtle, canvas, WebGL, fetch, localStorage

**Key Testing Features:**
- Backend tests use real PostgreSQL database (`prototype_db_test`)
- Frontend tests use comprehensive browser API mocks
- Automatic test data cleanup
- Fast execution (~0.8 seconds)
- CI/CD ready

**Documentation:**
- `tests/README.md` - Comprehensive testing guide
- `TESTING.md` - Implementation summary and test coverage details
- `.test-commands` - Quick reference for test commands

## Environment Configuration

Configuration is stored in `.env`:
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: prototype_db)
- `DB_USER` - Database user (default: admin)
- `DB_PASSWORD` - Database password (empty for local dev)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: development)

**Test Environment Variables:**
- Test database uses same variables with `TEST_` prefix
- Test database name: `prototype_db_test`
- Test server port: 3001 (to avoid conflicts)
