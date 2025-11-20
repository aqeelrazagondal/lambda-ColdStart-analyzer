# Lambda Cold-Start Analyzer

> A comprehensive platform for analyzing AWS Lambda cold starts and optimizing serverless performance

## Table of Contents

- [Application Goal](#application-goal)
- [Quick Usage Guide](#quick-usage-guide)
- [Project Tracking](#project-tracking)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Application Goal

Lambda Cold-Start Analyzer helps engineering teams monitor, analyze, and optimize AWS Lambda cold start performance at scale. The platform provides:

### Key Capabilities

- **Cold Start Monitoring**: Track cold vs warm invocations with P50/P90/P99 initialization durations
- **Multi-Account Support**: Connect multiple AWS accounts with secure AssumeRole and ExternalId
- **CloudWatch Integration**: Automatically query CloudWatch Logs Insights for detailed metrics
- **Bundle Analysis**: Analyze deployment package sizes and dependencies with scoring and recommendations
- **Multi-Region Support**: Track metrics across multiple AWS regions with region-specific snapshots
- **Automated Scheduling**: Background jobs to automatically refresh metrics on a configurable schedule
- **Alert System**: Get notified when functions exceed performance thresholds (P90 init time, cold ratio)
- **Custom Dashboards**: Create and share team dashboards with key metrics and insights
- **Team Activity Feed**: Track team actions and changes across your organization
- **Notification Channels**: Configure Slack, email, or webhook notifications for alerts
- **Search**: Quickly find functions, dashboards, bundles, and alerts across your organization
- **Export Reports**: Download metrics as CSV or PDF for executive reporting

### Target Users

- DevOps teams managing serverless infrastructure
- Engineering leads tracking Lambda performance
- Platform engineers optimizing AWS costs

---

## Quick Usage Guide

Follow these six steps after `pnpm dev` is running (API on `:3001`, Web on `:3000`).

### 1. Create Your Workspace

- Visit `http://localhost:3000/register`
- Sign up with email + password
- Create an organization to isolate team data and invite members later

### 2. Prepare an IAM Role

Create a read-only IAM role in your AWS account with the following steps:

1. **Create Permissions Policy** (in IAM → Policies):
   - Click "Create policy" → Switch to JSON tab
   - Paste this **permissions policy**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "lambda:ListFunctions",
           "lambda:GetFunction",
           "lambda:GetFunctionConfiguration",
           "logs:StartQuery",
           "logs:GetQueryResults",
           "logs:DescribeLogGroups",
           "logs:DescribeLogStreams"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
   - Name: `LambdaColdStartAnalyzerReadOnly`
   - Note: This policy does NOT need a Principal field (that's only for trust policies)

2. **Create IAM Role** (in IAM → Roles):
   - Click "Create role"
   - Select "AWS account" as trusted entity
   - **Account ID**: Enter the AWS account ID that will **assume** this role
     - ⚠️ **For cross-account setup**: If your app/user is in account `A` and Lambdas are in account `B`, enter account `A` here (the account that will assume the role)
     - The Principal in trust policy allows this account to assume the role
   - Check "Require external ID" and provide a unique string (e.g., `lca-external-id-2025-11-19`)
   - The trust policy is automatically generated (it will have a Principal and no Resource field)
   - Attach the `LambdaColdStartAnalyzerReadOnly` policy created in step 1
   - Name the role: `LambdaColdStartAnalyzerRole`

3. **Copy the Role ARN** for use in the next step (format: `arn:aws:iam::YOUR_ACCOUNT:role/LambdaColdStartAnalyzerRole`)

**Important**: The trust policy is automatically created when you configure the role with "AWS account" + external ID.

If you see this **default template** in AWS Console when editing the trust policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Statement1",
      "Effect": "Allow",
      "Principal": {},
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Modify it to** (replace `YOUR_ACCOUNT` with your 12-digit AWS account ID and `your-unique-external-id` with your chosen external ID):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Statement1",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "your-unique-external-id"
        }
      }
    }
  ]
}
```

**Note**: When you select "AWS account" and check "Require external ID" in the console, AWS typically generates this automatically. Trust policies have a Principal (who can assume the role) and do NOT have a Resource field.

**⚠️ Troubleshooting AssumeRole Errors**:

If you see: `User: arn:aws:iam::005023962834:user/username is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::173148986568:role/RoleName`

**The Fix**: Edit the role's trust policy Principal to match the account that will assume the role:
- Go to IAM → Roles → Your Role → Trust relationships → Edit trust policy
- Change `"Principal": { "AWS": "arn:aws:iam::173148986568:root" }` 
- To: `"Principal": { "AWS": "arn:aws:iam::005023962834:root" }` (the account with your credentials)
- The Principal is the account that will ASSUME the role, NOT where the role exists

### 3. Connect the AWS Account

1. Navigate to **Settings → AWS Accounts** (`/settings/aws-accounts`)
2. Click **Add AWS Account** and enter:
   - AWS Account ID (12 digits)
   - IAM Role ARN
   - External ID (exact string from the trust policy)
   - Default Region (e.g. `us-east-1`)
3. Press **Test Connection** to verify permissions
4. Click **Scan Lambdas** to ingest functions from the connected regions

### 4. Explore Lambda Inventory

1. Select your organization from the top-left dropdown
2. Open **Functions** (`/orgs/{orgId}/functions`)
3. Filter instantly by:
   - Region
   - Runtime (Node.js, Python, etc.)
   - Text search for function name or part of it

### 5. Analyze Cold Starts

1. Click a function to open its details page
2. Review the **Cold Starts** tab:
   - Cold vs warm invocation counts
   - P50 / P90 / P99 initialization times
   - Time range controls (1d, 7d, 14d)
3. Use **Refresh Metrics** (1 request per 5 minutes per function) or **Copy Query** to run the CloudWatch Logs Insights query manually

### 6. Interpret & Act

- **Healthy Baseline**
  - Cold start ratio under 5%
  - P50 init < 500 ms, P90 init < 1000 ms
- **Needs Attention**
  - Cold start ratio over 10%
  - P90 init > 2000 ms or unusually large deployment packages
- **Common Fixes**
  - Trim dependencies / move to Lambda layers
  - Enable provisioned concurrency for latency-sensitive paths
  - Reduce initialization work and lazy-load clients
  - Double-check VPC / subnet settings that can slow cold starts

### 7. Run a Bundle Audit

- Switch to the **Bundle Audit** tab inside the function detail page.
- Upload the exact ZIP you deploy to Lambda; files are streamed to object storage, queued, and processed asynchronously.
- Track upload status plus the latest score, total size, and dependency breakdown without leaving the page.
- Review recommendations (e.g., “node_modules dominates size”) and top offenders to decide on layer splits or dependency pruning.

### 8. Turn on Auto Refresh & Alerts

- Ensure Redis is running (`docker compose up -d redis`) and set cron knobs (`METRICS_REFRESH_CRON`, `METRICS_REFRESH_TZ` and optional `METRICS_REFRESH_RANGE`).
- The API will enqueue a daily job that refreshes metrics for every scheduled function/region.
- Watch the **Alerts** panel on the function page or call `GET /functions/{id}/alerts` to review open warnings.
- Tune thresholds via `ALERT_P90_THRESHOLD_MS` and `ALERT_COLD_RATIO` to match your latency budget.

### 9. Customize Dashboards

- Visit `/orgs/{orgId}/dashboard` to compose card-based dashboards for your team.
- Add cards for P90 init, cold ratio, or bundle score, then drag data into executive status reports without leaving the web app.
- Layouts are saved per-organization via the Dashboard API and can be shared with the rest of your team immediately.

### 10. Toggle Dark Mode

- Use the floating sun/moon button in the bottom-right corner to switch between light and dark themes.
- Preferences are stored per-browser and synced with the OS color scheme on first load.

### 11. View Organization Overview

- Visit `/orgs/{orgId}` to see a comprehensive overview of your organization.
- View key metrics: function count, bundle uploads, open alerts, connected AWS accounts.
- Check the health score and top functions by performance.
- Review recent activity feed and onboarding checklist.

### 12. Search Across Resources

- Use the search functionality to quickly find functions, dashboards, bundles, and alerts.
- Search is available from the main navigation and supports partial name matching.

### 13. Monitor Team Activity

- View the activity feed at `/orgs/{orgId}/activity` to see recent team actions.
- Track function scans, bundle uploads, dashboard changes, and more.

---

## Project Tracking

- **Project Completion Tracker** – Detailed checklist of everything shipped through Sprint 4 is now in [`docs/project-completion.md`](./docs/project-completion.md).
- **Todo & Roadmap** – Upcoming sprints, UX polish, and long-term initiatives live in [`docs/todo-backlog.md`](./docs/todo-backlog.md).
- **Complete Test Flow** – Comprehensive step-by-step testing guide covering all features from setup to end-to-end testing in [`docs/test-flow.md`](./docs/test-flow.md).

Keeping these checklists in dedicated files lets you iterate on delivery plans without inflating the main README.

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 15+ (via Docker)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd lambda-coldstart-analyzer
   ```

2. **Install dependencies**

   ```bash
   corepack enable
   corepack prepare pnpm@9 --activate
   pnpm install
   ```

3. **Start PostgreSQL & Redis**

   ```bash
   docker compose up -d postgres redis
   ```

   Both services are required:
   - **PostgreSQL**: Primary database for all application data
   - **Redis**: Queue backend for background jobs (bundle processing, metrics refresh)

4. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Key settings to review:
   - `DATABASE_URL` → point at Postgres (default docker compose uses port 5433).
   - `REDIS_URL` / `BUNDLE_AUDIT_QUEUE_URL` → BullMQ + scheduler queues (default: `redis://localhost:6379`).
   - `BUNDLE_AUDIT_*` → S3/minio bucket, endpoint, and upload limits.
   - `METRICS_REFRESH_CRON` → Cron expression for automatic metrics refresh (default: `0 3 * * *` = daily at 3 AM).
   - `METRICS_REFRESH_TZ` → Timezone for cron schedule (default: `UTC`).
   - `METRICS_REFRESH_RANGE` → Default time range for scheduled refreshes (default: `7d`).
   - `ALERT_P90_THRESHOLD_MS` → P90 initialization time threshold in milliseconds (default: `2000`).
   - `ALERT_COLD_RATIO` → Cold start ratio threshold (default: `0.1` = 10%).
   - `DISABLE_METRICS_CRON` → Set to `true` to disable automatic metrics refresh.

5. **Generate Prisma client**

   ```bash
   pnpm prisma:generate
   ```

6. **Run database migrations**

   ```bash
   pnpm db:migrate -- --name init
   ```

7. **Seed demo data (optional)**

   ```bash
   pnpm db:seed
   # Default credentials: demo@example.com / Password123!
   ```

   Customize seed data with environment variables:

   ```bash
   SEED_USER_EMAIL=your@email.com \
   SEED_USER_PASSWORD=YourPassword123! \
   SEED_USER_NAME="Your Name" \
   SEED_ORG_NAME="Your Organization" \
   pnpm db:seed
   ```

8. **Start development servers**

   ```bash
   pnpm dev
   ```

   - API: <http://localhost:3001>
   - Web: <http://localhost:3000>

---

## Architecture

### Workspace Layout

```text
lambda-coldstart-analyzer/
├── apps/
│   ├── api/                 # NestJS backend API
│   │   ├── src/
│   │   │   ├── auth/        # Authentication module
│   │   │   ├── orgs/        # Organizations & multi-tenancy
│   │   │   ├── aws-accounts/# AWS account connections
│   │   │   ├── functions/   # Lambda function management
│   │   │   ├── metrics/     # Cold start metrics
│   │   │   ├── bundle-audit/# Bundle analysis & processing
│   │   │   ├── scheduler/   # Background job scheduling
│   │   │   ├── alerts/      # Performance alerting
│   │   │   ├── dashboard/   # Custom dashboard management
│   │   │   ├── activity/    # Team activity tracking
│   │   │   ├── notifications/# Notification channels
│   │   │   ├── overview/    # Organization overview
│   │   │   ├── search/      # Global search
│   │   │   └── health/      # Health check endpoints
│   │   └── tests/
│   └── web/                 # Next.js frontend
│       └── src/
│           └── app/         # App Router pages
│               └── orgs/[orgId]/
│                   ├── dashboard/  # Dashboard pages
│                   ├── functions/  # Function listing & details
│                   ├── bundles/    # Bundle audit pages
│                   ├── alerts/     # Alert management
│                   └── metrics/   # Metrics visualization
├── libs/
│   ├── shared-kernel/       # Shared TypeScript types
│   ├── aws-client/          # AWS SDK wrappers
│   ├── analysis/            # Metrics aggregation logic
│   └── ui-components/       # React component library
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Database migrations
│   └── seed.js              # Seed script
└── docker-compose.yml       # PostgreSQL & Redis containers
```

### Technology Stack

**Backend**:

- NestJS 10 - Node.js framework
- Prisma 5 - ORM and migrations
- PostgreSQL 15 - Primary database
- Redis - Queue and caching (via BullMQ)
- BullMQ - Background job processing and scheduling
- JWT - Authentication
- AWS SDK v3 - AWS service integration
- Passport - Auth strategies

**Frontend**:

- Next.js 14 - React framework with App Router
- TypeScript - Type safety
- Tailwind CSS - Styling
- React Context - State management

**Infrastructure**:

- pnpm - Package manager
- Turborepo - Monorepo build system
- Docker - Containerization
- Docker Compose - Local development (PostgreSQL + Redis)

---

## API Reference

### Authentication

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

### Organizations

#### Create Organization

```http
POST /orgs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Organization"
}
```

#### List My Organizations

```http
GET /orgs
Authorization: Bearer <token>
```

### AWS Accounts

#### Connect AWS Account

```http
POST /orgs/{orgId}/aws-accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "awsAccountId": "123456789012",
  "roleArn": "arn:aws:iam::123456789012:role/LCAReadOnly",
  "externalId": "unique-external-id-123",
  "defaultRegion": "us-east-1"
}
```

#### Test Connection

```http
POST /aws-accounts/{id}/test-connection
Authorization: Bearer <token>

Response:
{
  "ok": true,
  "accountId": "123456789012",
  "regionChecked": "us-east-1"
}
```

#### Scan Lambda Functions

```http
POST /aws-accounts/{id}/scan-lambdas
Authorization: Bearer <token>
Content-Type: application/json

{
  "regions": ["us-east-1", "us-west-2"]
}

Response:
{
  "scanned": 42,
  "regions": ["us-east-1", "us-west-2"]
}
```

### Functions

#### List Functions

```http
GET /orgs/{orgId}/functions?region=us-east-1&runtime=nodejs20.x&q=api&page=1&pageSize=50
Authorization: Bearer <token>

Response:
{
  "items": [
    {
      "id": "...",
      "functionName": "my-api-function",
      "functionArn": "arn:aws:lambda:...",
      "region": "us-east-1",
      "runtime": "nodejs20.x",
      "memoryMb": 512,
      "timeoutMs": 30000
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 50
}
```

### Metrics

#### Get Logs Insights Query

```http
GET /functions/{functionId}/logs-insights-query
Authorization: Bearer <token>

Response:
{
  "query": "fields @timestamp, @message | filter @message like /REPORT/ ...",
  "logGroupName": "/aws/lambda/my-function"
}
```

#### Refresh Metrics

```http
POST /functions/{functionId}/refresh-metrics?range=7d
Authorization: Bearer <token>

Response:
{
  "queryId": "abc-123-def",
  "snapshot": {
    "id": "...",
    "coldCount": 15,
    "warmCount": 285,
    "p50InitMs": 320,
    "p90InitMs": 580,
    "p99InitMs": 890,
    "periodStart": "2025-11-12T10:30:00Z",
    "periodEnd": "2025-11-19T10:30:00Z"
  }
}
```

**Range Parameter**: Accepts format `{number}{unit}` where unit is:

- `s` - seconds
- `m` - minutes
- `h` - hours
- `d` - days (default: 7d)
- `w` - weeks

**Rate Limiting**: Max 1 request per 5 minutes per function. Returns `429` with `Retry-After` header.

#### Get Latest Metrics

```http
GET /functions/{functionId}/metrics?range=7d
Authorization: Bearer <token>

Response:
{
  "range": {
    "start": 1731408600,
    "end": 1732013400
  },
  "snapshot": {
    "coldCount": 15,
    "warmCount": 285,
    ...
  }
}
```

#### List Metric Regions

```http
GET /functions/{functionId}/regions
Authorization: Bearer <token>
```

#### Region Metrics History

```http
GET /functions/{functionId}/metrics/regions?region=us-east-1&range=14d
Authorization: Bearer <token>
```

#### Metrics Buckets (Charts)

```http
GET /functions/{functionId}/metrics/buckets?range=30d&region=us-east-1&buckets=24
Authorization: Bearer <token>
```

#### Export Metrics CSV

```http
GET /functions/{functionId}/metrics/export.csv?range=14d&region=us-east-1
Authorization: Bearer <token>
```

#### Export Metrics PDF

```http
GET /functions/{functionId}/metrics/export.pdf?range=14d&region=us-east-1
Authorization: Bearer <token>
```

#### List Function Regions

```http
GET /functions/{functionId}/regions
Authorization: Bearer <token>

Response:
{
  "regions": ["us-east-1", "us-west-2"]
}
```

### Bundle Audit

#### Upload Bundle

```http
POST /orgs/{orgId}/functions/{functionId}/bundles
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=@lambda-bundle.zip
```

Response:

```json
{
  "id": "upload_cuid",
  "status": "processing"
}
```

#### List Bundle Uploads

```http
GET /orgs/{orgId}/functions/{functionId}/bundles?limit=10
Authorization: Bearer <token>
```

#### Latest Insight

```http
GET /orgs/{orgId}/functions/{functionId}/bundles/latest
Authorization: Bearer <token>
```

### Dashboards

#### List Dashboards

```http
GET /orgs/{orgId}/dashboards
Authorization: Bearer <token>
```

#### Create Dashboard

```http
POST /orgs/{orgId}/dashboards
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Ops overview",
  "description": "surfacing p90 + bundle insights",
  "config": "{\"cards\":[{\"title\":\"Cold ratio\",\"metric\":\"cold_ratio\"}]}"
}
```

#### Update Dashboard

```http
PUT /orgs/{orgId}/dashboards/{dashboardId}
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "Executive KPI" }
```

#### Delete Dashboard

```http
DELETE /orgs/{orgId}/dashboards/{dashboardId}
Authorization: Bearer <token>
```

### Alerts

#### List Function Alerts

```http
GET /functions/{functionId}/alerts
Authorization: Bearer <token>

Response:
{
  "alerts": [
    {
      "id": "...",
      "region": "us-east-1",
      "metric": "p90_init_ms",
      "severity": "warning",
      "message": "P90 init time (2500ms) exceeds threshold (2000ms)",
      "status": "open",
      "observedValue": 2500,
      "threshold": 2000,
      "createdAt": "2025-11-19T10:00:00Z"
    }
  ]
}
```

### Team Activity

#### List Organization Activity

```http
GET /orgs/{orgId}/activity?limit=20
Authorization: Bearer <token>

Response:
{
  "items": [
    {
      "id": "...",
      "type": "function.scanned",
      "message": "Scanned 42 Lambda functions",
      "createdAt": "2025-11-19T10:00:00Z"
    }
  ]
}
```

### Notification Channels

#### List Notification Channels

```http
GET /orgs/{orgId}/notifications
Authorization: Bearer <token>
```

#### Create Notification Channel

```http
POST /orgs/{orgId}/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "slack",
  "target": "https://hooks.slack.com/services/...",
  "description": "Engineering team alerts"
}
```

#### Update Notification Channel

```http
PATCH /orgs/{orgId}/notifications/{channelId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": false
}
```

#### Delete Notification Channel

```http
DELETE /orgs/{orgId}/notifications/{channelId}
Authorization: Bearer <token>
```

### Overview

#### Get Organization Overview

```http
GET /orgs/{orgId}/overview
Authorization: Bearer <token>

Response:
{
  "functionCount": 42,
  "bundleCount": 15,
  "openAlerts": 3,
  "accountsCount": 2,
  "dashboardsCount": 5,
  "notificationsCount": 2,
  "health": {
    "score": 85,
    "status": "healthy"
  },
  "topFunctions": [...],
  "recentBundles": [...],
  "activity": [...],
  "checklist": [...]
}
```

### Search

#### Search Organization Resources

```http
GET /orgs/{orgId}/search?q=api
Authorization: Bearer <token>

Response:
{
  "results": [
    {
      "id": "function-abc",
      "label": "api-handler",
      "type": "Function",
      "href": "/orgs/{orgId}/functions/abc",
      "meta": "us-east-1"
    },
    {
      "id": "dashboard-xyz",
      "label": "API Performance Dashboard",
      "type": "Dashboard",
      "href": "/orgs/{orgId}/dashboard#xyz"
    }
  ]
}
```

---

## Troubleshooting

### Database Connection Issues

**Problem**: `Connection refused` or `ECONNREFUSED`

**Solution**:

```bash
# Check if PostgreSQL is running
docker compose ps

# Start if not running
docker compose up -d postgres

# Verify connection
docker compose logs postgres
```

### Prisma Client Not Found

**Problem**: `Cannot find module '@prisma/client'`

**Solution**:

```bash
pnpm prisma:generate
```

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::3001`

**Solution**:

```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9

# Or change the port in .env
PORT=3002
```

### AWS AssumeRole Errors

**Problem**: `AccessDenied` when assuming role

**Solutions**:

1. Verify IAM role trust policy includes correct Principal
2. Confirm ExternalId matches exactly
3. Check IAM role permissions include required Lambda/Logs actions
4. Verify role ARN format: `arn:aws:iam::{account-id}:role/{role-name}`

### CloudWatch Logs Throttling

**Problem**: `ThrottlingException` from CloudWatch Logs

**Solution**: The application includes exponential backoff, but you can adjust:

- Reduce concurrent function scans
- Increase `baseBackoffMs` and `maxBackoffMs` in client config
- Wait for rate limit to reset (default: 5 minutes per function)

### Bundle Audit Queue Not Processing

**Problem**: Uploads stay in `processing` and no insights are generated

**Solution**:

1. Make sure Redis is running (`docker compose up -d redis`) and `REDIS_URL` points to it.
2. Check API logs for BullMQ errors (missing bucket credentials, permission denied, etc.).
3. Confirm the bundle bucket exists and the API has rights to read/write objects.
4. Delete stuck uploads with `pnpm prisma studio` if needed and re-upload.

### Metrics Refresh Not Running Automatically

**Problem**: Scheduled metrics refresh jobs are not executing

**Solution**:

1. Verify Redis is running and accessible (`docker compose ps redis`).
2. Check that `DISABLE_METRICS_CRON` is not set to `true`.
3. Review API logs for scheduler initialization messages.
4. Verify `METRICS_REFRESH_CRON` and `METRICS_REFRESH_TZ` are set correctly.
5. Check that functions have refresh schedules enabled in the database.

### Migration Errors

**Problem**: Prisma migration conflicts

**Solution**:

```bash
# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Or create a new migration
pnpm db:migrate -- --name fix_issue
```

---

## Available Scripts

### Root Level

- `pnpm dev` - Start all apps in parallel (API + Web)
- `pnpm build` - Build all apps and libraries
- `pnpm lint` - Lint all code
- `pnpm clean` - Clean build outputs
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed demo data
- `pnpm db:studio` - Open Prisma Studio
- `pnpm test:analysis` - Run analysis unit tests
- `pnpm test:api` - Run API tests

### Individual Apps

- `pnpm --filter @lca/api dev` - Run API only
- `pnpm --filter @lca/web dev` - Run Web only
- `pnpm --filter @lca/api build` - Build API only

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Issues**: Report bugs on GitHub Issues
- **Documentation**: Check `/docs` folder for detailed guides
- **Contact**: [Your contact information]

---

**Last Updated**: 2025-11-19
**Version**: 0.1.0 (Sprint 4 Complete)
