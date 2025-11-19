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

## Sprint 5: Security & Compliance (Not Started)

Goal: Production-ready security and deployment.

- [ ] Refresh token flow
- [ ] Password complexity rules
- [ ] Rate limiting across all endpoints
- [ ] CSRF protection
- [ ] Secrets management (AWS Secrets Manager)
- [ ] Audit logs
- [ ] Session management
- [ ] Request logging with PII redaction

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
