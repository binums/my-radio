# RadioCalico - Local Development Environment

A Node.js/Express web server with PostgreSQL database for local prototyping.

## Setup Complete

Your development environment is ready to use with:
- **Web Server**: Express.js (Node.js v25.1.0)
- **Database**: PostgreSQL 16.11
- **Database Name**: `prototype_db`
- **Server Port**: 3000

## Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Access your application:**
   - Main API: http://localhost:3000
   - Health check: http://localhost:3000/health
   - Test endpoint: http://localhost:3000/api/test

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

## Next Steps

1. Create your database tables in `prototype_db`
2. Add your API routes to `server.js`
3. Build your frontend (HTML/CSS/JS)
4. Connect your frontend to the API endpoints

## Adding New Routes

Example of adding a new route in `server.js`:

```javascript
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Troubleshooting

**PostgreSQL not connecting:**
- Check if PostgreSQL is running: `brew services list`
- Restart PostgreSQL: `brew services restart postgresql@16`

**Port 3000 already in use:**
- Change PORT in `.env` file
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

**Database not found:**
- Recreate database: `/opt/homebrew/opt/postgresql@16/bin/createdb prototype_db`
