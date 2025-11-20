# TODO Backlog & Roadmap

## Sprint 3: Bundle Audit (✅ Complete in v0.0.2)

Goal: Analyze Lambda deployment packages for optimization opportunities.

- [x] Upload endpoint for Lambda ZIP files
- [x] Background worker to extract and analyze bundles
- [x] Dependency size breakdown
- [x] Bundle scoring algorithm (0-100)
- [x] Top dependency identification
- [x] Size recommendations
- [x] Bundle Audit tab in UI
- [x] Add Redis + S3 config knobs to `.env.example` and docs

### Sprint 3 Follow-ups

- [ ] Add automated integration test that covers queue lifecycle (upload → insight)
- [ ] Ship CLI/docs example for uploading bundles via cURL

## Sprint 4: Multi-Region & Scheduling (✅ Complete in v0.1.0)

Goal: Automate metrics collection and expand multi-region support.

- [x] Background scheduler (BullMQ repeatable jobs + Redis)
- [x] Daily automatic metrics refresh worker per organization/function
- [x] Per-region metric snapshots + API access
- [x] Region selector in UI
- [x] Historical trend visualization (P90 sparkline)
- [x] Alert system for performance degradation
- [x] Notification channels (Slack/webhook support)
- [x] Custom dashboards with card-based layouts
- [x] Team activity feed
- [x] Organization overview page
- [x] Global search functionality
- [x] Metrics export (CSV/PDF)
- [x] Dark mode theme

### Sprint 4 Follow-ups

- [ ] UI to manage schedule cadence & region targets per function
- [ ] Email notification channel support
- [ ] Alert resolution workflow in UI

## Sprint 5: Security & Compliance (✅ Complete in v0.2.0)

Goal: Production-ready security and deployment.

- [x] Refresh token flow
- [x] Password complexity rules
- [x] Rate limiting across all endpoints
- [x] CSRF protection
- [x] Secrets management (AWS Secrets Manager)
- [x] Audit logs
- [x] Session management
- [x] Request logging with PII redaction

### Sprint 5 Implementation Details

**Refresh Token Flow:**
- Database models: `RefreshToken` and `Session` with proper relationships
- Token rotation on refresh for enhanced security
- Automatic token refresh in frontend before expiration
- Session management endpoints (list, revoke individual, revoke all)

**Password Complexity:**
- Custom `@IsStrongPassword()` validator
- Requirements: 8+ chars, uppercase, lowercase, number, special character

**Rate Limiting:**
- Global: 100 requests/minute per IP
- Auth endpoints: 5 requests/minute (login/register), 10 requests/minute (refresh)
- Uses `@nestjs/throttler` with Redis support

**CSRF Protection:**
- Origin validation with configurable allowed origins
- CORS restrictions for trusted domains only
- SameSite cookie pattern support

**Secrets Management:**
- `SecretsService` with AWS Secrets Manager integration
- Fallback to environment variables for local development
- Caching with 5-minute TTL
- Migrated JWT secrets and AWS credentials

**Audit Logs:**
- `AuditLog` database model with comprehensive fields
- `@AuditLog()` decorator for automatic logging
- Integrated into auth, orgs, and AWS account operations
- Query endpoint for audit log retrieval

**Session Management:**
- Session tracking with device, IP, and user agent
- Last activity timestamp
- Session revocation endpoints
- Linked to refresh tokens for security

**Request Logging with PII Redaction:**
- `PiiRedactor` utility for emails, IPs, passwords, AWS account IDs
- Structured JSON logging with correlation IDs
- Automatic PII redaction in all logs
- Request/response timing and status logging

### Sprint 5 Follow-ups

- [ ] Add audit log query UI for admins
- [ ] Add session management UI (view/revoke sessions)
- [ ] Implement secret rotation automation
- [ ] Add rate limit monitoring dashboard
- [ ] Add audit log retention policy configuration

## Sprint 6: CI/CD & Observability (Not Started)

Goal: Automated testing and deployment.

- [ ] GitHub Actions pipeline
- [ ] Automated tests (unit, integration, e2e)
- [ ] Dockerfiles for API and Web
- [ ] Kubernetes manifests (optional)
- [ ] Application logging (Pino)
- [ ] Metrics collection (Prometheus)
- [ ] Distributed tracing
- [ ] Performance monitoring

## UX & Polish (Ongoing)

- [x] Advanced charts (Recharts + metrics buckets)
- [x] Export to CSV/PDF
- [x] Custom dashboards
- [x] Team activity feed
- [x] Slack/email notifications
- [x] Mobile-responsive improvements
- [x] Dark mode
