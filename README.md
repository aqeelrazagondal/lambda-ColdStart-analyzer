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
- **Bundle Analysis**: (Coming soon) Analyze deployment package sizes and dependencies
- **Performance Recommendations**: Get actionable insights to reduce cold start times

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
Create a read-only IAM role in your AWS account with this permission policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:ListFunctions",
        "lambda:GetFunction",
        "logs:StartQuery",
        "logs:GetQueryResults",
        "logs:DescribeLogGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach this trust policy (replace `YOUR_ACCOUNT` and provide a unique `ExternalId` you will paste into the app):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::YOUR_ACCOUNT:root" },
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

---

## Project Tracking

- **Project Completion Tracker** – Detailed checklist of everything shipped through Sprint 2 is now in [`docs/project-completion.md`](./docs/project-completion.md).
- **Todo & Roadmap** – Upcoming sprints, UX polish, and long-term initiatives live in [`docs/todo-backlog.md`](./docs/todo-backlog.md).

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

3. **Start PostgreSQL**

   ```bash
   docker compose up -d postgres
   ```

4. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

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

```
lambda-coldstart-analyzer/
├── apps/
│   ├── api/                 # NestJS backend API
│   │   ├── src/
│   │   │   ├── auth/        # Authentication module
│   │   │   ├── orgs/        # Organizations & multi-tenancy
│   │   │   ├── aws-accounts/# AWS account connections
│   │   │   ├── functions/   # Lambda function management
│   │   │   ├── metrics/     # Cold start metrics
│   │   │   └── health/      # Health check endpoints
│   │   └── tests/
│   └── web/                 # Next.js frontend
│       └── src/
│           └── app/         # App Router pages
├── libs/
│   ├── shared-kernel/       # Shared TypeScript types
│   ├── aws-client/          # AWS SDK wrappers
│   ├── analysis/            # Metrics aggregation logic
│   └── ui-components/       # React component library
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Database migrations
│   └── seed.js              # Seed script
└── docker-compose.yml       # PostgreSQL container
```

### Technology Stack

**Backend**:

- NestJS 10 - Node.js framework
- Prisma 5 - ORM and migrations
- PostgreSQL 15 - Primary database
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
- Docker Compose - Local development

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
**Version**: 0.1.0 (Sprint 2 Complete)
