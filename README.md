# Radio Calico

A streaming radio web application that plays lossless audio (HLS FLAC) with real-time metadata display, album artwork, and song rating functionality.

## Features

- **Lossless Audio Streaming**: HLS FLAC audio playback with HLS.js
- **Real-time Metadata**: Track info updates every 2 seconds
- **Album Artwork**: Dynamic cover art display
- **Song Rating System**: Thumbs up/down with user fingerprinting
- **Recently Played**: Last 5 tracks with album art
- **Responsive Design**: Mobile-friendly interface
- **Comprehensive Testing**: 96 tests with 87% coverage
- **Docker Support**: Production and development containers

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd radiocalico

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL (if not running)
brew services start postgresql@16

# Start the server
npm start

# Access the application
open http://localhost:3000
```

### Using Make Commands

```bash
make dev                # Start development environment
make dev-test           # Run tests
make up                 # Start production
make help               # Show all commands
```

## Project Structure

```
radiocalico/
├── server.js          # Main Express server with PostgreSQL connection
├── package.json       # Node.js dependencies and scripts
├── .env              # Environment variables (database config)
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## Database Information

- **Host**: localhost
- **Port**: 5432
- **Database**: prototype_db
- **User**: admin
- **Password**: (none required for local development)

### PostgreSQL Commands

Access your database directly:
```bash
/opt/homebrew/opt/postgresql@16/bin/psql prototype_db
```

List databases:
```bash
/opt/homebrew/opt/postgresql@16/bin/psql -l
```

Stop PostgreSQL service:
```bash
brew services stop postgresql@16
```

Restart PostgreSQL service:
```bash
brew services restart postgresql@16
```

## Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start in development mode

## API Endpoints

### GET /
Returns welcome message and status
```json
{
  "message": "Welcome to your prototype API",
  "status": "running",
  "database": "connected"
}
```

### GET /health
Health check with database connection test
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-27T14:15:30.749Z"
}
```

### GET /api/test
Tests database query functionality
```json
{
  "message": "Database query successful",
  "version": "PostgreSQL 16.11 (Homebrew)..."
}
```

## Environment Variables

Edit `.env` file to modify configuration:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prototype_db
DB_USER=admin
DB_PASSWORD=
PORT=3000
NODE_ENV=development
```

## Documentation

- **[DOCKER.md](DOCKER.md)** - Comprehensive Docker deployment guide
- **[TESTING.md](TESTING.md)** - Testing framework and coverage
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and architecture
- **[tests/README.md](tests/README.md)** - Detailed testing documentation

## Technology Stack

**Backend:**
- Node.js with Express.js
- PostgreSQL 16 with connection pooling
- Environment-based configuration

**Frontend:**
- Vanilla JavaScript (modular architecture)
- HLS.js for audio streaming
- Canvas/WebGL fingerprinting
- Responsive CSS

**Testing:**
- Jest test runner
- Supertest for API testing
- Testing Library for DOM testing
- jsdom for browser simulation
- 96 tests, 87% coverage

**DevOps:**
- Docker multi-stage builds
- Docker Compose for orchestration
- Health checks and monitoring
- Makefile for convenience commands

## Troubleshooting

**PostgreSQL not connecting:**
- Check if PostgreSQL is running: `brew services list`
- Restart PostgreSQL: `brew services restart postgresql@16`

**Port 3000 already in use:**
- Change PORT in `.env` file
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

**Database not found:**
- Recreate database: `/opt/homebrew/opt/postgresql@16/bin/createdb prototype_db`
