# Makefile for Radio Calico Docker operations
# Provides convenient commands for development and production

.PHONY: help build up down logs restart clean test dev dev-build dev-down dev-logs dev-test backup restore security security-check security-fix security-scan

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

## help: Display this help message
help:
	@echo "$(BLUE)Radio Calico Docker Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Production Commands:$(NC)"
	@echo "  make build          - Build production Docker images"
	@echo "  make up             - Start production services"
	@echo "  make down           - Stop production services"
	@echo "  make logs           - View production logs"
	@echo "  make restart        - Restart production services"
	@echo "  make ps             - Show running containers"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@echo "  make dev            - Start development environment"
	@echo "  make dev-build      - Build and start development environment"
	@echo "  make dev-down       - Stop development environment"
	@echo "  make dev-logs       - View development logs"
	@echo "  make dev-test       - Run tests in development container"
	@echo "  make dev-shell      - Open shell in development container"
	@echo ""
	@echo "$(GREEN)Database Commands:$(NC)"
	@echo "  make backup         - Backup production database"
	@echo "  make restore        - Restore production database from backup.sql"
	@echo "  make db-shell       - Open PostgreSQL shell (production)"
	@echo "  make db-shell-dev   - Open PostgreSQL shell (development)"
	@echo ""
	@echo "$(GREEN)Security Commands:$(NC)"
	@echo "  make security       - Run security audit"
	@echo "  make security-check - Run security audit (fail on moderate+)"
	@echo "  make security-fix   - Automatically fix security issues"
	@echo "  make security-scan  - Full security scan (audit + outdated packages)"
	@echo "  make security-docker - Run security scan in Docker container"
	@echo ""
	@echo "$(GREEN)Maintenance Commands:$(NC)"
	@echo "  make clean          - Remove containers and volumes (WARNING: deletes data)"
	@echo "  make clean-images   - Remove Docker images"
	@echo "  make clean-all      - Full cleanup (containers, volumes, images)"
	@echo "  make health         - Check health status of services"

## build: Build production Docker images
build:
	@echo "$(BLUE)Building production images...$(NC)"
	docker-compose build

## up: Start production services
up:
	@echo "$(BLUE)Starting production services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services started. Access at http://localhost:3000$(NC)"

## down: Stop production services
down:
	@echo "$(YELLOW)Stopping production services...$(NC)"
	docker-compose down

## logs: View production logs (follow mode)
logs:
	docker-compose logs -f

## restart: Restart production services
restart:
	@echo "$(YELLOW)Restarting production services...$(NC)"
	docker-compose restart

## ps: Show running containers
ps:
	docker-compose ps

## dev: Start development environment
dev:
	@echo "$(BLUE)Starting development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Development environment started. Access at http://localhost:3000$(NC)"
	@echo "$(YELLOW)Logs:$(NC) make dev-logs"

## dev-build: Build and start development environment
dev-build:
	@echo "$(BLUE)Building and starting development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d --build

## dev-down: Stop development environment
dev-down:
	@echo "$(YELLOW)Stopping development environment...$(NC)"
	docker-compose -f docker-compose.dev.yml down

## dev-logs: View development logs (follow mode)
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f app

## dev-test: Run tests in development container
dev-test:
	@echo "$(BLUE)Running tests in development container...$(NC)"
	docker-compose -f docker-compose.dev.yml exec app npm test

## dev-test-coverage: Run tests with coverage
dev-test-coverage:
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	docker-compose -f docker-compose.dev.yml exec app npm run test:coverage

## dev-shell: Open shell in development container
dev-shell:
	docker-compose -f docker-compose.dev.yml exec app sh

## backup: Backup production database
backup:
	@echo "$(BLUE)Backing up production database...$(NC)"
	@mkdir -p backups
	docker-compose exec -T postgres pg_dump -U admin prototype_db > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "$(GREEN)Backup saved to backups/backup-$$(date +%Y%m%d-%H%M%S).sql$(NC)"

## restore: Restore production database from backup.sql
restore:
	@if [ ! -f backup.sql ]; then \
		echo "$(YELLOW)Error: backup.sql not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Warning: This will overwrite the current database!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	docker-compose exec -T postgres psql -U admin prototype_db < backup.sql
	@echo "$(GREEN)Database restored from backup.sql$(NC)"

## db-shell: Open PostgreSQL shell (production)
db-shell:
	docker-compose exec postgres psql -U admin -d prototype_db

## db-shell-dev: Open PostgreSQL shell (development)
db-shell-dev:
	docker-compose -f docker-compose.dev.yml exec postgres psql -U admin -d prototype_db

## clean: Remove containers and volumes (WARNING: deletes data)
clean:
	@echo "$(YELLOW)Warning: This will remove all containers and volumes!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	docker-compose down -v
	@echo "$(GREEN)Cleanup complete$(NC)"

## clean-images: Remove Docker images
clean-images:
	@echo "$(BLUE)Removing Docker images...$(NC)"
	docker-compose down --rmi all

## clean-all: Full cleanup (containers, volumes, images)
clean-all:
	@echo "$(YELLOW)Warning: This will remove everything (containers, volumes, images)!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	docker-compose down -v --rmi all
	docker system prune -f
	@echo "$(GREEN)Full cleanup complete$(NC)"

## health: Check health status of services
health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@docker-compose ps
	@echo ""
	@echo "$(BLUE)Application health endpoint:$(NC)"
	@curl -s http://localhost:3000/api/health | jq . || echo "$(YELLOW)Service not available or jq not installed$(NC)"

## install-deps: Install local dependencies (for IDE support)
install-deps:
	@echo "$(BLUE)Installing local dependencies...$(NC)"
	npm install

## update: Pull latest changes and rebuild
update:
	@echo "$(BLUE)Pulling latest changes...$(NC)"
	git pull
	@echo "$(BLUE)Rebuilding containers...$(NC)"
	docker-compose up -d --build
	@echo "$(GREEN)Update complete$(NC)"

## security: Run security audit
security:
	@echo "$(BLUE)Running security audit...$(NC)"
	@npm audit || true
	@echo ""
	@echo "$(GREEN)Security audit complete$(NC)"

## security-check: Run security audit (fail on moderate+)
security-check:
	@echo "$(BLUE)Running security audit (fail on moderate+ vulnerabilities)...$(NC)"
	npm run security:check

## security-fix: Automatically fix security issues
security-fix:
	@echo "$(BLUE)Attempting to fix security vulnerabilities...$(NC)"
	npm audit fix
	@echo "$(GREEN)Security fixes applied$(NC)"

## security-scan: Full security scan (audit + outdated packages)
security-scan:
	@echo "$(BLUE)Running full security scan...$(NC)"
	@echo ""
	@echo "$(YELLOW)=== NPM Security Audit ===$(NC)"
	@npm audit || true
	@echo ""
	@echo "$(YELLOW)=== Outdated Packages ===$(NC)"
	@npm outdated || true
	@echo ""
	@echo "$(GREEN)Full security scan complete$(NC)"

## security-docker: Run security scan in Docker container
security-docker:
	@echo "$(BLUE)Running security scan in Docker container...$(NC)"
	docker-compose -f docker-compose.dev.yml exec app npm run security:full || \
	docker-compose -f docker-compose.dev.yml run --rm app npm run security:full

## security-report: Generate security report (JSON format)
security-report:
	@echo "$(BLUE)Generating security report...$(NC)"
	@mkdir -p reports
	npm audit --json > reports/security-audit-$$(date +%Y%m%d-%H%M%S).json
	@echo "$(GREEN)Security report saved to reports/$(NC)"
