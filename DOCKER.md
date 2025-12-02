# Docker Deployment Guide

Radio Calico is fully containerized with Docker, providing self-contained deployment options for both development and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Production Deployment](#production-deployment)
- [Development Deployment](#development-deployment)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- At least 2GB of free disk space

### Production Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd radiocalico

# Create environment file
cp .env.example .env

# Edit .env with your settings (optional - defaults work out of the box)
nano .env

# Start the application
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Development Quick Start

```bash
# Start development environment with hot-reload
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Run tests inside container
docker-compose -f docker-compose.dev.yml exec app npm test
```

## Production Deployment

### Building and Running

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

### Production Configuration

Create a `.env` file in the project root:

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=your-secure-password-here
DB_NAME=prototype_db
```

**Security Notes:**
- Change `DB_PASSWORD` to a strong, unique password
- Never commit `.env` files to version control
- Use Docker secrets for sensitive production deployments

### Building Custom Images

```bash
# Build production image
docker build -t radiocalico:latest .

# Build with custom tag
docker build -t radiocalico:v1.0.0 .

# Build without cache
docker build --no-cache -t radiocalico:latest .
```

### Production Best Practices

1. **Use specific image versions:**
   ```yaml
   image: radiocalico:v1.0.0
   ```

2. **Set resource limits:**
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 512M
           reservations:
             cpus: '0.5'
             memory: 256M
   ```

3. **Configure logging:**
   ```yaml
   services:
     app:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

4. **Enable restart policies:**
   ```yaml
   restart: unless-stopped
   ```

## Development Deployment

### Starting Development Environment

```bash
# Start all services (app + databases)
docker-compose -f docker-compose.dev.yml up -d

# Start with rebuild
docker-compose -f docker-compose.dev.yml up -d --build

# View real-time logs
docker-compose -f docker-compose.dev.yml logs -f app
```

### Development Features

- **Hot-reload:** Code changes automatically restart the server
- **Volume mounting:** Local changes reflected immediately
- **Debug port:** Node.js debugger available on port 9229
- **Test database:** Separate database for running tests
- **Development tools:** Includes git, postgresql-client

### Running Tests in Docker

```bash
# Run all tests
docker-compose -f docker-compose.dev.yml exec app npm test

# Run backend tests only
docker-compose -f docker-compose.dev.yml exec app npm run test:backend

# Run frontend tests only
docker-compose -f docker-compose.dev.yml exec app npm run test:frontend

# Run tests with coverage
docker-compose -f docker-compose.dev.yml exec app npm run test:coverage

# Run tests in watch mode
docker-compose -f docker-compose.dev.yml exec app npm run test:watch
```

### Debugging

```bash
# Attach to running container
docker-compose -f docker-compose.dev.yml exec app sh

# Run commands inside container
docker-compose -f docker-compose.dev.yml exec app npm run <command>

# Access development database
docker-compose -f docker-compose.dev.yml exec postgres psql -U admin -d prototype_db

# Access test database
docker-compose -f docker-compose.dev.yml exec postgres-test psql -U admin -d prototype_db_test
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Application port | `3000` | No |
| `DB_HOST` | Database hostname | `postgres` | Yes |
| `DB_PORT` | Database port | `5432` | No |
| `DB_USER` | Database user | `admin` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_NAME` | Database name | `prototype_db` | Yes |
| `TEST_DB_HOST` | Test DB hostname | `postgres-test` | Dev only |
| `TEST_DB_USER` | Test DB user | `admin` | Dev only |
| `TEST_DB_PASSWORD` | Test DB password | - | Dev only |
| `TEST_DB_NAME` | Test DB name | `prototype_db_test` | Dev only |

### Port Mapping

**Production:**
- `3000` - Application (configurable via PORT env var)
- `5432` - PostgreSQL (optional external access)

**Development:**
- `3000` - Application
- `9229` - Node.js debugger
- `5433` - PostgreSQL (development)
- `5434` - PostgreSQL (test)

## Architecture

### Container Structure

```
┌─────────────────────────────────────────┐
│           Docker Host                    │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  radiocalico-app                   │ │
│  │  - Node.js 20 Alpine               │ │
│  │  - Express server                  │ │
│  │  - Static frontend files           │ │
│  │  - Health checks                   │ │
│  └────────────┬───────────────────────┘ │
│               │                          │
│  ┌────────────▼───────────────────────┐ │
│  │  radiocalico-postgres              │ │
│  │  - PostgreSQL 16 Alpine            │ │
│  │  - Persistent volume storage       │ │
│  │  - Auto-initialization             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  radiocalico-network               │ │
│  │  (Bridge network)                  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Multi-Stage Build

The production Dockerfile uses a multi-stage build for optimization:

1. **Builder stage:** Installs all dependencies and runs tests
2. **Production stage:** Copies only production dependencies and app files

**Benefits:**
- Smaller final image size (~150MB vs ~300MB)
- No development dependencies in production
- Tests run during build (fail fast)
- Better security (minimal attack surface)

### Volumes

**Production:**
- `postgres_data` - Persistent PostgreSQL data

**Development:**
- `postgres_dev_data` - Development database
- `postgres_test_data` - Test database
- `node_modules` - Node.js dependencies (performance optimization)
- Source code mounted as read-only volumes

## Maintenance

### Backup Database

```bash
# Production
docker-compose exec postgres pg_dump -U admin prototype_db > backup.sql

# Development
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U admin prototype_db > backup.sql
```

### Restore Database

```bash
# Production
docker-compose exec -T postgres psql -U admin prototype_db < backup.sql

# Development
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U admin prototype_db < backup.sql
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart (production)
docker-compose up -d --build

# Rebuild and restart (development)
docker-compose -f docker-compose.dev.yml up -d --build
```

### Clean Up

```bash
# Remove stopped containers
docker-compose down

# Remove containers and volumes (WARNING: deletes data)
docker-compose down -v

# Remove unused images
docker image prune -a

# Full cleanup (containers, networks, volumes, images)
docker system prune -a --volumes
```

### Health Checks

```bash
# Check container health status
docker-compose ps

# View health check logs
docker inspect radiocalico-app | grep -A 10 Health

# Manual health check
curl http://localhost:3000/api/health
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check if port is already in use
lsof -i :3000

# Remove and recreate containers
docker-compose down
docker-compose up -d
```

### Database Connection Issues

```bash
# Verify database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U admin -d prototype_db -c "SELECT version();"

# Verify network connectivity
docker-compose exec app ping postgres
```

### Permission Issues

```bash
# Fix file permissions (if volume mounting fails)
sudo chown -R $USER:$USER .

# Rebuild with no cache
docker-compose build --no-cache
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Remove specific volume
docker volume rm radiocalico_postgres_data
```

### Application Not Responding

```bash
# Check if container is running
docker-compose ps

# Check resource usage
docker stats

# Restart application
docker-compose restart app

# Full restart
docker-compose down && docker-compose up -d
```

### Tests Failing in Container

```bash
# Check test database connection
docker-compose -f docker-compose.dev.yml exec app \
  psql -h postgres-test -U admin -d prototype_db_test -c "SELECT 1;"

# Run tests with verbose output
docker-compose -f docker-compose.dev.yml exec app npm test -- --verbose

# Check test database logs
docker-compose -f docker-compose.dev.yml logs postgres-test
```

## Advanced Usage

### Running Behind Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name radiocalico.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml radiocalico

# Check services
docker stack services radiocalico

# Remove stack
docker stack rm radiocalico
```

### Kubernetes Deployment

See `kubernetes/` directory for Kubernetes manifests (coming soon).

## Security Considerations

1. **Use secrets for sensitive data:**
   ```bash
   echo "my-secret-password" | docker secret create db_password -
   ```

2. **Run as non-root user** (already configured in Dockerfile)

3. **Keep images updated:**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Use private registry for production images**

5. **Enable Docker Content Trust:**
   ```bash
   export DOCKER_CONTENT_TRUST=1
   ```

6. **Scan images for vulnerabilities:**
   ```bash
   docker scan radiocalico:latest
   ```

## Performance Tuning

### PostgreSQL

Add to docker-compose.yml:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "max_connections=200"
```

### Node.js

Set environment variables:

```yaml
app:
  environment:
    NODE_OPTIONS: "--max-old-space-size=512"
```

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: See README.md and CLAUDE.md
- Docker Documentation: https://docs.docker.com/
