# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a streaming radio web application that plays lossless audio (HLS FLAC) with real-time metadata display, album artwork, and song rating functionality. The application consists of a Node.js/Express backend with PostgreSQL database and a single-page HTML/CSS/JS frontend.

## Development Commands

**Start the server:**
```bash
npm start
# Note: This runs in the foreground. If you need to restart it, run it in the background using:
npm start &
```

**Access PostgreSQL database:**
```bash
/opt/homebrew/opt/postgresql@16/bin/psql prototype_db
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

### Database Schema
Database name: `prototype_db`

**song_ratings table:**
- `id` (integer, primary key, auto-increment)
- `artist` (text, not null)
- `title` (text, not null)
- `rating` (smallint, not null, must be 1 or -1)
- `user_fingerprint` (text, not null)
- `created_at` (timestamp, defaults to CURRENT_TIMESTAMP)
- Unique constraint on (artist, title, user_fingerprint) for upserts
- Index on (artist, title) for query performance

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
The frontend follows a clean separation of concerns with three main files in `/public`:

**public/index.html** - Structure and content
- HTML markup for the single-page application
- Audio player element
- Links to external CSS and JavaScript files

**public/styles.css** - Styling and presentation
- All CSS styling rules
- Responsive design with mobile breakpoints
- Custom styling for audio controls, rating buttons, and track display

**public/app.js** - Application logic and interactivity
- **HLS.js** integration for streaming audio playback (with Safari native HLS fallback)
- Metadata polling: fetches from external API every 2 seconds to update track info
- User fingerprinting: generates unique ID from browser features, canvas/WebGL fingerprints, and IP
- Rating system: handles thumbs up/down submissions and real-time updates
- Audio controls: play/pause, volume, elapsed time tracking
- DOM manipulation: updates current track, album art, and recently played list

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

## Environment Configuration

Configuration is stored in `.env`:
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: prototype_db)
- `DB_USER` - Database user (default: admin)
- `DB_PASSWORD` - Database password (empty for local dev)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: development)
