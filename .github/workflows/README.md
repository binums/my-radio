# GitHub Actions Workflows

This directory contains GitHub Actions workflows for Radio Calico CI/CD automation.

## Workflows

### 1. CI - Tests and Security (`ci.yml`)

Runs on every push to main, pull requests, and weekly on Mondays.

**Jobs:**

#### Test Job
- Sets up PostgreSQL 16 test database
- Runs all unit tests (96 tests: 42 backend, 54 frontend)
- Generates code coverage report (87% coverage)
- Uploads coverage to Codecov (optional)

**Environment Variables:**
- `TEST_DB_USER` - From secrets or defaults to 'admin'
- `TEST_DB_PASSWORD` - From secrets or defaults to 'ci-test-password'
- `TEST_DB_HOST` - localhost
- `TEST_DB_PORT` - 5432
- `TEST_DB_NAME` - prototype_db_test

#### Security Job
- Runs `npm run security:check` (fails on moderate+ vulnerabilities)
- Runs `npm run security:full` (audit + outdated packages)
- Generates JSON security report
- Uploads report as artifact (30-day retention)

#### Docker Build Job
- Builds production Docker image (`Dockerfile`)
- Builds development Docker image (`Dockerfile.dev`)
- Validates Docker Compose configurations
- Uses layer caching for faster builds

#### Lint Job
- Validates JavaScript syntax
- Checks package.json integrity
- Warns about console.log statements (non-blocking)

#### Summary Job
- Aggregates results from all jobs
- Fails if tests, Docker, or lint fail
- Security failures are warnings only
- Provides detailed status report

### 2. Claude Code (`claude.yml`)

Responds to @claude mentions in:
- Issue comments
- Pull request review comments
- Pull request reviews
- Issue descriptions

Uses Claude Code OAuth token from secrets.

### 3. Claude Code Review (`claude-code-review.yml`)

Automatically reviews pull requests when opened or updated.

**Review Criteria:**
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Test coverage

Uses `CLAUDE.md` for style guidance.

## Setup

### Required Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

#### Optional but Recommended:

**CODECOV_TOKEN** (optional)
- For uploading code coverage reports
- Sign up at https://codecov.io
- Add your repository and get the token

**TEST_DB_USER** (optional)
- Defaults to 'admin' if not set
- Override for custom test database user

**TEST_DB_PASSWORD** (optional)
- Defaults to 'ci-test-password' if not set
- Override for custom test database password

#### Required:

**CLAUDE_CODE_OAUTH_TOKEN** (required for Claude workflows)
- OAuth token for Claude Code integration
- Get from https://claude.ai/oauth

### Setting Up Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `CODECOV_TOKEN` (optional)
   - Value: [your token]
   - Click **Add secret**

## CI Pipeline Flow

```
┌─────────────────────────────────────────────┐
│  Push to main / PR opened                   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│           Parallel Jobs Start                │
├──────────────┬───────────────┬───────────────┤
│              │               │               │
▼              ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   Test   │  │ Security │  │  Docker  │  │   Lint   │
│          │  │          │  │          │  │          │
│ • Setup  │  │ • Audit  │  │ • Build  │  │ • Syntax │
│   DB     │  │ • Scan   │  │   Prod   │  │ • Valid  │
│ • Run    │  │ • Report │  │ • Build  │  │          │
│   Tests  │  │          │  │   Dev    │  │          │
│ • Cover  │  │          │  │ • Config │  │          │
└─────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
      │            │             │              │
      └────────────┴─────────────┴──────────────┘
                   │
                   ▼
            ┌──────────────┐
            │   Summary    │
            │              │
            │ • Aggregate  │
            │ • Report     │
            │ • Pass/Fail  │
            └──────────────┘
```

## Triggering Workflows

### Automatic Triggers

**CI Workflow:**
- Every push to `main` branch
- Every pull request to `main` branch
- Weekly on Mondays at 9:00 AM UTC

**Claude Code:**
- Mention @claude in comments or issues

**Claude Code Review:**
- Opening a pull request
- Updating a pull request (new commits)

### Manual Triggers

You can manually trigger workflows from the Actions tab:
1. Go to **Actions**
2. Select the workflow
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

## Viewing Results

### GitHub Actions Tab

1. Go to **Actions** tab in your repository
2. Click on a workflow run
3. View job details and logs

### Pull Request Checks

- All CI checks appear in PR status checks
- Click **Details** next to each check for logs
- PR can be merged only if required checks pass

### Artifacts

Security reports are uploaded as artifacts:
1. Go to workflow run
2. Scroll to **Artifacts** section
3. Download `security-audit-report`

## Local Testing

Test workflows locally before pushing:

### Run Tests Locally
```bash
# Run all tests (same as CI)
npm test

# Run with coverage
npm run test:coverage

# Run backend tests
npm run test:backend

# Run frontend tests
npm run test:frontend
```

### Run Security Checks Locally
```bash
# Basic audit (same as CI)
npm run security:check

# Full scan
npm run security:full

# Or use Make
make security
make security-scan
```

### Test Docker Builds Locally
```bash
# Build production image
docker build -t radiocalico:test -f Dockerfile .

# Build development image
docker build -t radiocalico:dev-test -f Dockerfile.dev .

# Validate compose
docker-compose config
docker-compose -f docker-compose.dev.yml config
```

## Workflow Configuration

### Modifying Triggers

Edit the `on:` section in workflow files:

```yaml
on:
  push:
    branches: [ main, develop ]  # Add more branches
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Mondays
```

### Adjusting Node Version

Update `NODE_VERSION` in `ci.yml`:

```yaml
env:
  NODE_VERSION: '20'  # Change version here
```

### Modifying Test Database

Update environment variables in test job:

```yaml
services:
  postgres:
    image: postgres:16-alpine  # Change version
    env:
      POSTGRES_USER: ${{ secrets.TEST_DB_USER || 'admin' }}
      POSTGRES_PASSWORD: ${{ secrets.TEST_DB_PASSWORD || 'ci-test-password' }}
      POSTGRES_DB: prototype_db_test
```

## Troubleshooting

### Tests Failing in CI but Passing Locally

**Check environment variables:**
```bash
# Set locally to match CI
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_NAME=prototype_db_test
npm test
```

**Check Node version:**
```bash
node --version  # Should match NODE_VERSION in ci.yml
```

### Security Check Failures

**View security report:**
1. Go to workflow run
2. Download security-audit-report artifact
3. Review vulnerabilities

**Fix locally:**
```bash
npm run security:fix
npm test  # Verify fixes don't break tests
```

### Docker Build Failures

**Test build locally:**
```bash
docker build -t test -f Dockerfile .
docker build -t test-dev -f Dockerfile.dev .
```

**Check Dockerfile syntax:**
```bash
docker build --check -f Dockerfile .
```

### Permission Errors

**Ensure secrets are set:**
- Check repository Settings → Secrets
- Verify secret names match workflow file
- Check secret values are correct

### Workflow Not Triggering

**Check trigger conditions:**
- Verify branch name matches trigger
- Check file paths (if path filters used)
- Ensure workflow file is in `.github/workflows/`

## Performance Optimization

### Caching

Workflows use caching to speed up runs:

**NPM dependencies:**
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Caches node_modules
```

**Docker layers:**
```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Parallel Execution

Jobs run in parallel by default. Sequential execution:

```yaml
job2:
  needs: job1  # job2 waits for job1
```

## Best Practices

1. **Always test locally first** before pushing
2. **Keep workflows simple** and focused
3. **Use secrets** for sensitive data
4. **Enable branch protection** requiring CI checks
5. **Review security reports** regularly
6. **Update dependencies** promptly
7. **Monitor workflow performance** and optimize
8. **Document custom workflows** in this file

## Status Badges

Add to README.md:

```markdown
![CI Status](https://github.com/YOUR-USERNAME/radiocalico/workflows/CI%20-%20Tests%20and%20Security/badge.svg)
```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Using Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Codecov Action](https://github.com/codecov/codecov-action)
