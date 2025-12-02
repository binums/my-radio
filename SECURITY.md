# Security Policy

This document outlines the security practices and procedures for Radio Calico.

## Supported Versions

Currently supported versions for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Scanning

Radio Calico includes built-in security scanning tools to identify and fix vulnerabilities in dependencies.

### Automated Security Checks

Security scanning is integrated into the development workflow using npm audit.

### Running Security Scans

#### Using Make Commands (Recommended)

```bash
# Basic security audit
make security

# Security check (fails on moderate+ vulnerabilities)
make security-check

# Automatically fix security issues
make security-fix

# Full security scan (audit + outdated packages)
make security-scan

# Run security scan in Docker container
make security-docker

# Generate JSON security report
make security-report
```

#### Using NPM Scripts

```bash
# Run security audit
npm run security:audit

# Automatically fix vulnerabilities
npm run security:audit-fix

# Get JSON output
npm run security:audit-json

# Check and fail on moderate+ vulnerabilities
npm run security:check

# Full scan (audit + outdated packages)
npm run security:full
```

#### Using NPM Directly

```bash
# Standard audit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Fix with force (may cause breaking changes)
npm audit fix --force

# Check specific severity level
npm audit --audit-level=high

# Get JSON output
npm audit --json

# Check for outdated packages
npm outdated
```

### Security Scan Levels

**Low Severity:**
- May have minimal impact
- Should be fixed when convenient
- Will not block CI/CD

**Moderate Severity:**
- Should be addressed promptly
- May block production deployments
- `make security-check` will fail

**High/Critical Severity:**
- Must be fixed immediately
- Will block all deployments
- Requires immediate attention

### Automated Fixes

Many vulnerabilities can be automatically fixed:

```bash
# Try automatic fixes
make security-fix

# Or with npm
npm audit fix

# Force fixes (may introduce breaking changes)
npm audit fix --force
```

**Note:** Always test after applying automatic fixes, as they may introduce breaking changes.

## Security in Development

### Local Development

```bash
# Check security before committing
make security

# Fix issues automatically
make security-fix

# Run tests after fixes
npm test
```

### Docker Development

Security scans can be run inside Docker containers:

```bash
# Start dev environment
make dev

# Run security scan in container
make security-docker

# Or manually
docker-compose -f docker-compose.dev.yml exec app npm audit
```

## Security in Production

### Pre-Deployment Checks

Always run security checks before deploying:

```bash
# Full security scan
make security-scan

# Check for critical/high vulnerabilities
npm audit --audit-level=high

# Update outdated packages
npm update

# Run tests
npm test
```

### Docker Security

The production Docker image includes security best practices:

1. **Multi-stage builds** - Smaller attack surface
2. **Non-root user** - Runs as user `nodejs` (UID 1001)
3. **Minimal base image** - Alpine Linux
4. **No development dependencies** - Production only
5. **Health checks** - Monitor container health
6. **Security scanning during build** - Tests run in build stage

### Image Scanning

Scan Docker images for vulnerabilities:

```bash
# Scan with Docker Scout (if available)
docker scout cves radiocalico:latest

# Scan with Trivy
trivy image radiocalico:latest

# Scan with Snyk
snyk container test radiocalico:latest
```

## Continuous Integration

### GitHub Actions Security Workflow

Add security scanning to your CI/CD pipeline:

```yaml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    # Run weekly on Mondays at 9:00 AM UTC
    - cron: '0 9 * * 1'

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Check for outdated packages
        run: npm outdated || true
```

## Security Reports

### Generating Reports

Create timestamped security reports:

```bash
# Generate JSON report
make security-report

# Reports saved to: reports/security-audit-YYYYMMDD-HHMMSS.json
```

### Report Contents

Security reports include:
- Vulnerability severity levels
- Affected packages
- Patched versions
- Recommended actions
- Dependency tree analysis

### Sharing Reports

```bash
# View report
cat reports/security-audit-*.json | jq .

# Share with team (remove sensitive info first)
cat reports/security-audit-*.json | jq '.vulnerabilities'
```

## Dependency Management

### Keeping Dependencies Updated

```bash
# Check for updates
npm outdated

# Update all packages (minor/patch)
npm update

# Update to latest (major versions)
npm install <package>@latest

# Update with caution
npm update && npm test
```

### Lock File Integrity

Always commit `package-lock.json`:
- Ensures reproducible builds
- Locks dependency versions
- Enables security auditing

```bash
# Verify lock file
npm ci

# Update lock file
npm install
```

### Reviewing Updates

Before updating dependencies:

1. Review release notes
2. Check for breaking changes
3. Run security audit
4. Run full test suite
5. Test in development environment
6. Deploy to staging first

## Security Best Practices

### Code Security

1. **Never commit secrets** - Use environment variables
2. **Validate all input** - Sanitize user data
3. **Use prepared statements** - Prevent SQL injection
4. **Enable CORS properly** - Restrict origins
5. **Keep dependencies updated** - Regular security scans

### Environment Variables

```bash
# Good - Use environment variables
DB_PASSWORD=${DB_PASSWORD}

# Bad - Hardcoded secrets
DB_PASSWORD=mysecretpassword
```

### Database Security

1. **Use connection pooling** - Implemented with `pg`
2. **Prepared statements** - Used throughout
3. **Least privilege** - Grant minimal permissions
4. **Strong passwords** - Never use defaults
5. **Network isolation** - Use Docker networks

### Docker Security

1. **Run as non-root** - Implemented in Dockerfile
2. **Minimal base images** - Using Alpine Linux
3. **Multi-stage builds** - Reduce attack surface
4. **Read-only filesystems** - Where possible
5. **Security scanning** - Regular image scans

## Reporting Security Vulnerabilities

### How to Report

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security@radiocalico.com or contact binums@users.noreply.github.com
3. Include detailed description
4. Provide steps to reproduce
5. Suggest a fix if possible

### What to Include

- Description of vulnerability
- Affected versions
- Steps to reproduce
- Potential impact
- Suggested mitigation
- Your contact information

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Fix timeline**: Based on severity
  - Critical: Within 24-48 hours
  - High: Within 1 week
  - Moderate: Within 1 month
  - Low: Next release cycle

## Security Checklist

### Development Checklist

- [ ] Run `make security` before committing
- [ ] No hardcoded secrets or credentials
- [ ] All input is validated and sanitized
- [ ] Dependencies are up to date
- [ ] Tests pass including security tests
- [ ] Code reviewed for security issues

### Deployment Checklist

- [ ] Security audit passes (`make security-check`)
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Secrets managed securely
- [ ] Docker images scanned
- [ ] Health checks working
- [ ] Monitoring enabled
- [ ] Backup procedures tested

### Production Checklist

- [ ] Regular security scans scheduled
- [ ] Dependency updates planned
- [ ] Security monitoring active
- [ ] Incident response plan ready
- [ ] Backup and recovery tested
- [ ] Access controls reviewed
- [ ] Logs monitored regularly

## Additional Security Tools

### Recommended Tools

**SAST (Static Analysis):**
- ESLint with security plugins
- SonarQube
- Semgrep

**DAST (Dynamic Analysis):**
- OWASP ZAP
- Burp Suite
- Nikto

**Container Scanning:**
- Docker Scout
- Trivy
- Snyk Container

**Dependency Scanning:**
- npm audit (built-in)
- Snyk
- Dependabot

### Integration Examples

```bash
# ESLint security plugin
npm install --save-dev eslint-plugin-security

# Snyk CLI
npm install -g snyk
snyk test

# Trivy scanning
trivy fs .
trivy image radiocalico:latest
```

## Compliance

### Standards

Radio Calico follows security best practices from:
- OWASP Top 10
- CWE Top 25
- Node.js Security Best Practices
- Docker Security Best Practices

### Audit Trail

Security activities are logged:
- Security scan results
- Dependency updates
- Vulnerability fixes
- Deployment activities

## Resources

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Guide](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [npm Security](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities)

### Security Contacts

- Security Email: security@radiocalico.com
- GitHub Contact: binums@users.noreply.github.com
- GitHub Security: Use GitHub Security Advisories
- Project Maintainers: @binums

## Updates to This Policy

This security policy is reviewed and updated regularly. Last updated: 2025-12-02

---

For questions about this security policy, please contact the project maintainers.
