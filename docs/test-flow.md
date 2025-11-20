# Complete Application Test Flow

This document provides a comprehensive step-by-step guide to test the Lambda Cold-Start Analyzer application from start to finish.

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js 20+ installed
- ✅ pnpm 9+ installed
- ✅ Docker and Docker Compose installed
- ✅ AWS Account with admin access (for creating IAM roles)
- ✅ At least one AWS Lambda function deployed (for testing)

---

## Phase 1: Initial Setup

### Step 1.1: Start Infrastructure Services

```bash
# Navigate to project root
cd lambda-coldstart-analyzer

# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Verify services are running
docker compose ps
```

**Expected Result**: Both `postgres` and `redis` containers should show status "Up".

### Step 1.2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# Minimum required variables:
# - DATABASE_URL=postgresql://postgres:postgres@localhost:5433/lambda_analyzer
# - REDIS_URL=redis://localhost:6379
# - JWT_SECRET=your-secret-key-here (generate a random string)
```

**Expected Result**: `.env` file created with all required variables.

### Step 1.3: Setup Database

```bash
# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm db:migrate

# (Optional) Seed demo data
pnpm db:seed
# Default credentials: demo@example.com / Password123!
```

**Expected Result**: 
- Database schema created
- If seeded: User `demo@example.com` with organization created

### Step 1.4: Start Application

```bash
# Start both API and Web servers
pnpm dev
```

**Expected Result**:
- API running on `http://localhost:3001`
- Web running on `http://localhost:3000`
- No errors in console

---

## Phase 2: User Registration & Authentication

### Step 2.1: Register New User

1. Open browser: `http://localhost:3000/register`
2. Fill in registration form:
   - **Email**: `test@example.com`
   - **Password**: `TestPassword123!`
   - **Name**: `Test User`
3. Click **Register**

**Expected Result**:
- Success message displayed
- Automatically logged in
- Redirected to organization selection/creation page

### Step 2.2: Create Organization

1. If prompted, create a new organization:
   - **Name**: `Test Organization`
2. Click **Create Organization**

**Expected Result**:
- Organization created
- Redirected to organization dashboard/overview

### Step 2.3: Verify Login

1. Log out (if logout button available)
2. Navigate to `http://localhost:3000/login`
3. Login with credentials:
   - **Email**: `test@example.com`
   - **Password**: `TestPassword123!`
4. Click **Login**

**Expected Result**:
- Successfully logged in
- Redirected to organization view

---

## Phase 3: AWS Account Setup

### Step 3.1: Prepare AWS Account

**Note**: This requires AWS Console access. Perform these steps in AWS Console.

1. **Log into AWS Console**
   - Navigate to IAM service
   - Go to **Roles** section

2. **Create Permissions Policy First (Before Creating Role)**

   **Important**: Create the permissions policy first, then attach it to the role during role creation.
   
   a. In IAM console, go to **Policies** section (not Roles)
   
   b. Click **Create policy**
   
   c. Switch to **JSON** tab
   
   d. Delete any default JSON and paste the following **permissions policy**:
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
   
   **Note**: This is a permissions policy (not a trust policy). It does NOT need a Principal field - that's only for trust policies.
   
   e. Click **Next**
   
   f. **Policy name**: `LambdaColdStartAnalyzerReadOnly`
   
   g. **Description**: `Read-only access for Lambda and CloudWatch Logs`
   
   h. Click **Create policy**
   
   i. Remember this policy name for the next step

3. **Create IAM Role for Lambda Cold-Start Analyzer**

   a. Go to **Roles** section in IAM console
   
   b. Click **Create role**
   
   c. Select **Trusted entity type**: `AWS account`
   
   d. **Account ID**: Enter the AWS account ID that will **assume** this role
   
   **⚠️ Critical for Cross-Account Setup**:
   - If your application/user credentials are in account `005023962834` and the role will be in account `173148986568`, enter `005023962834` here (the account that will assume the role)
   - The Principal in the trust policy will be set to allow this account to assume the role
   - For same-account setup, enter the same account ID where the role exists
   
   **Example**:
   - Your AWS credentials (user/app): Account `005023962834`
   - Target AWS account (where Lambdas are): Account `173148986568`
   - **Enter `005023962834` in the Account ID field** (not `173148986568`)
   
   e. **Options**: Check "Require external ID"
   
   f. **External ID**: Generate a unique string (e.g., `lca-external-id-2025-11-19`)
   
   **Optional: If you need to manually edit the trust policy JSON**, you may see this default template in AWS Console:
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
   
   **Modify it to** (replace `YOUR_ACCOUNT_ID` with your 12-digit AWS account ID and `lca-external-id-2025-11-19` with your chosen external ID):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "Statement1",
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
         },
         "Action": "sts:AssumeRole",
         "Condition": {
           "StringEquals": {
             "sts:ExternalId": "lca-external-id-2025-11-19"
           }
         }
       }
     ]
   }
   ```
   
   **Note**: When you select "AWS account" and check "Require external ID" in the console, AWS automatically generates the trust policy with the correct Principal and Condition. You typically don't need to manually edit this JSON. Trust policies have a Principal (who can assume the role) and do NOT have a Resource field.
   
   g. Click **Next**

4. **Attach Permissions Policy to Role**

   a. On the "Add permissions" page, search for: `LambdaColdStartAnalyzerReadOnly`
   
   b. Check the box next to the policy you created in step 2
   
   c. Click **Next**

5. **Name and Create Role**

   a. **Role name**: `LambdaColdStartAnalyzerRole`
   
   b. **Description**: `Read-only access for Lambda Cold-Start Analyzer`
   
   c. Click **Create role**

6. **Copy Role ARN**

   - Format: `arn:aws:iam::123456789012:role/LambdaColdStartAnalyzerRole`
   - Save this ARN for Step 3.2

**Expected Result**: IAM role created with ARN saved.

**🔧 Troubleshooting: "User is not authorized to perform: sts:AssumeRole" Error**

If you get an error like:
```
User: arn:aws:iam::005023962834:user/username is not authorized to perform: 
sts:AssumeRole on resource: arn:aws:iam::173148986568:role/LambdaColdStartAnalyzerRole
```

**The Problem**: The trust policy Principal doesn't match the account trying to assume the role.

**Your Situation**:
- Your AWS user/credentials: Account `005023962834` ✓
- Role exists in: Account `173148986568` ✓
- Trust policy Principal: `arn:aws:iam::173148986568:root` ❌ (WRONG!)

**The Fix**:
1. Go to IAM Console → Roles → `LambdaColdStartAnalyzerRole`
2. Click **Trust relationships** tab
3. Click **Edit trust policy**
4. Change the Principal from:
   ```json
   "Principal": {
     "AWS": "arn:aws:iam::173148986568:root"
   }
   ```
   To (use the account that will assume the role):
   ```json
   "Principal": {
     "AWS": "arn:aws:iam::005023962834:root"
   }
   ```
5. Keep the ExternalId condition as-is
6. Click **Update policy**

**Corrected Trust Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::005023962834:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "lca-external-id-2025-11-19"
        }
      }
    }
  ]
}
```

**Remember**: 
- **Principal** = Account that will ASSUME the role (where your app/user is)
- **Role ARN** = Account where the role EXISTS (where your Lambdas are)
- These can be different accounts (cross-account setup)

### Step 3.2: Connect AWS Account in Application

1. **Navigate to AWS Accounts Settings**
   - In the application, go to **Settings** → **AWS Accounts**
   - Or directly: `http://localhost:3000/settings/aws-accounts`

2. **Add AWS Account**
   - Click **Add AWS Account** button
   - Fill in the form:
     - **AWS Account ID**: Your 12-digit AWS account ID
     - **IAM Role ARN**: `arn:aws:iam::YOUR_ACCOUNT_ID:role/LambdaColdStartAnalyzerRole`
     - **External ID**: The exact external ID you used in Step 3.1 (e.g., `lca-external-id-2025-11-19`)
     - **Default Region**: `us-east-1` (or your preferred region)
   - Click **Save**

**Expected Result**:
- AWS account added to the list
- Status shows as "Connected" or "Not Connected"

3. **Test Connection**
   - Click **Test Connection** button next to the account
   - Wait for connection test

**Expected Result**:
- Success message: "Connection successful"
- Account status updated to "Connected"

**If Connection Fails**:
- Verify IAM role ARN is correct
- Check External ID matches exactly
- Ensure IAM role trust policy includes your account
- Verify role has correct permissions attached

---

## Phase 4: Lambda Function Discovery

### Step 4.1: Scan Lambda Functions

1. **Navigate to Functions Page**
   - Go to **Functions** in the navigation
   - Or: `http://localhost:3000/orgs/{orgId}/functions`

2. **Initiate Scan**
   - Click **Scan Lambdas** button (if available)
   - Or go to AWS Accounts settings and click **Scan Lambdas**
   - Select regions to scan (e.g., `us-east-1`, `us-west-2`)
   - Click **Start Scan**

**Expected Result**:
- Scan progress indicator
- Functions appear in the list after scan completes
- Functions show with details: name, region, runtime, memory, timeout

### Step 4.2: Verify Function List

1. **Check Function Display**
   - Functions should be listed in a table
   - Each function shows:
     - Function name
     - Region
     - Runtime (e.g., `nodejs20.x`, `python3.11`)
     - Memory (MB)
     - Timeout (ms)

2. **Test Filtering**
   - Filter by **Region**: Select a region from dropdown
   - Filter by **Runtime**: Select a runtime (e.g., `nodejs20.x`)
   - **Search**: Type function name or part of it

**Expected Result**:
- Filters work correctly
- Search returns matching functions
- Results update in real-time

### Step 4.3: View Function Details

1. **Open Function Detail Page**
   - Click on any function name in the list
   - Or navigate: `http://localhost:3000/orgs/{orgId}/functions/{functionId}`

**Expected Result**:
- Function detail page loads
- Shows function metadata
- Tabs available: Metrics, Bundle Audit, Alerts

---

## Phase 5: Cold Start Metrics

### Step 5.1: View Metrics (If Available)

1. **Navigate to Metrics Tab**
   - On function detail page, click **Metrics** tab

2. **Check for Existing Metrics**
   - If metrics exist, you'll see:
     - Cold vs Warm invocation counts
     - P50, P90, P99 initialization times
     - Time range selector

**Expected Result**:
- Metrics displayed (if function has CloudWatch logs)
- Or empty state message if no metrics available

### Step 5.2: Refresh Metrics

1. **Trigger Metrics Refresh**
   - Click **Refresh Metrics** button
   - Select time range (e.g., `7d`, `14d`, `30d`)
   - Click **Refresh**

**Expected Result**:
- Loading indicator appears
- After processing (may take 1-2 minutes):
  - Metrics appear with data
  - Cold count, warm count displayed
  - Percentile values shown

**Note**: Rate limit applies - max 1 refresh per 5 minutes per function.

### Step 5.3: View Region-Specific Metrics

1. **Select Region** (if function exists in multiple regions)
   - Use region selector dropdown
   - Select different region

**Expected Result**:
- Metrics update for selected region
- Region-specific data displayed

### Step 5.4: View Metrics Charts

1. **Navigate to Metrics Buckets**
   - Metrics should show time-series data
   - Charts display trends over time

**Expected Result**:
- Charts render correctly
- Data points visible
- Time range selector works

### Step 5.5: Export Metrics

1. **Export as CSV**
   - Click **Export CSV** button (if available)
   - Or use API: `GET /functions/{id}/metrics/export.csv?range=7d`

**Expected Result**:
- CSV file downloads
- Contains metrics data

2. **Export as PDF**
   - Click **Export PDF** button (if available)
   - Or use API: `GET /functions/{id}/metrics/export.pdf?range=7d`

**Expected Result**:
- PDF file downloads
- Contains formatted metrics report

---

## Phase 6: Bundle Audit

### Step 6.1: Prepare Lambda Deployment Package

1. **Create Test Lambda Bundle**
   - Create a simple Lambda function
   - Package it as ZIP file
   - Example structure:
     ```
     lambda-function.zip
     ├── index.js
     ├── package.json
     └── node_modules/
         └── ...
     ```

2. **Ensure Bundle Size**
   - Bundle should be under upload limit (check `.env` for `BUNDLE_AUDIT_MAX_SIZE_MB`)
   - Typical size: 1-50 MB

### Step 6.2: Upload Bundle

1. **Navigate to Bundle Audit Tab**
   - On function detail page, click **Bundle Audit** tab

2. **Upload Bundle**
   - Click **Upload Bundle** or drag-and-drop area
   - Select your ZIP file
   - Click **Upload**

**Expected Result**:
- Upload progress indicator
- File uploads successfully
- Status shows as "Processing"

### Step 6.3: Wait for Processing

1. **Monitor Processing Status**
   - Status should change from "Processing" to "Completed"
   - This may take 30 seconds to 2 minutes depending on bundle size

**Expected Result**:
- Status updates to "Completed"
- Bundle insight appears

### Step 6.4: View Bundle Analysis

1. **Review Bundle Insights**
   - Total size (bytes)
   - Bundle score (0-100)
   - Dependency count
   - Top dependencies list
   - Size breakdown
   - Recommendations

**Expected Result**:
- All metrics displayed
- Recommendations shown (e.g., "Move heavy dependencies to Lambda layers")

### Step 6.5: View Bundle History

1. **Check Upload History**
   - Scroll to see previous uploads
   - Each upload shows:
     - Upload date
     - Status
     - Bundle score
     - Size

**Expected Result**:
- History list displays
- Previous uploads visible

---

## Phase 7: Alerts & Monitoring

### Step 7.1: Configure Alert Thresholds

1. **Set Environment Variables** (if not already set)
   ```bash
   # In .env file
   ALERT_P90_THRESHOLD_MS=2000  # Alert if P90 init > 2000ms
   ALERT_COLD_RATIO=0.1         # Alert if cold ratio > 10%
   ```

2. **Restart API** (if needed)
   ```bash
   # Stop and restart
   pnpm dev
   ```

### Step 7.2: Trigger Alert Evaluation

1. **Refresh Metrics for Function with High Cold Starts**
   - Select a function that has high cold start ratio or slow init times
   - Refresh metrics (Step 5.2)

**Expected Result**:
- If thresholds exceeded, alerts are created automatically
- Alerts appear in Alerts tab

### Step 7.3: View Alerts

1. **Navigate to Alerts Tab**
   - On function detail page, click **Alerts** tab
   - Or go to: `http://localhost:3000/orgs/{orgId}/alerts`

2. **Review Alert List**
   - Alerts show:
     - Metric type (e.g., `p90_init_ms`, `cold_ratio`)
     - Severity (warning, critical)
     - Message
     - Observed value vs threshold
     - Status (open/resolved)
     - Region

**Expected Result**:
- Alerts displayed (if any exist)
- Alert details visible

### Step 7.4: Test Alert Resolution

1. **Resolve Alert** (if UI supports it)
   - Click **Resolve** button on an alert
   - Or use API: Update alert status to "resolved"

**Expected Result**:
- Alert status changes to "resolved"
- Alert removed from open alerts list

---

## Phase 8: Scheduled Metrics Refresh

### Step 8.1: Configure Scheduler

1. **Set Environment Variables**
   ```bash
   # In .env file
   METRICS_REFRESH_CRON=0 3 * * *  # Daily at 3 AM
   METRICS_REFRESH_TZ=UTC
   METRICS_REFRESH_RANGE=7d
   ```

2. **Restart API**
   ```bash
   # Stop and restart to load new config
   pnpm dev
   ```

### Step 8.2: Verify Scheduler Initialization

1. **Check API Logs**
   - Look for log message: "Registering metrics refresh cron"
   - Should show: "Loaded X active refresh schedules"

**Expected Result**:
- Scheduler initialized
- Default schedules created for all functions

### Step 8.3: Test Manual Trigger (Optional)

1. **Manually Trigger Refresh** (for testing)
   - Use API endpoint or wait for scheduled time
   - Or temporarily set cron to run every minute for testing

**Expected Result**:
- Metrics refresh jobs execute
- Functions get metrics updated automatically

---

## Phase 9: Custom Dashboards

### Step 9.1: Create Dashboard

1. **Navigate to Dashboards**
   - Go to: `http://localhost:3000/orgs/{orgId}/dashboard`

2. **Create New Dashboard**
   - Click **Create Dashboard** or **Add Dashboard**
   - Fill in:
     - **Name**: `Performance Overview`
     - **Description**: `Key metrics for all functions`
   - Click **Save**

**Expected Result**:
- Dashboard created
- Empty dashboard displayed

### Step 9.2: Add Dashboard Cards

1. **Add Metric Cards**
   - Click **Add Card** or similar button
   - Select card type:
     - P90 Init Time
     - Cold Ratio
     - Bundle Score
     - Function Count
   - Configure card settings
   - Click **Add**

**Expected Result**:
- Card added to dashboard
- Card displays metric data

### Step 9.3: Arrange Dashboard Layout

1. **Drag and Drop Cards** (if supported)
   - Rearrange cards by dragging
   - Resize cards if supported

**Expected Result**:
- Layout updates
- Changes saved automatically

### Step 9.4: View Dashboard

1. **Review Dashboard**
   - All cards should display data
   - Metrics update based on latest data

**Expected Result**:
- Dashboard renders correctly
- All cards show metrics

---

## Phase 10: Team Activity & Search

### Step 10.1: View Team Activity

1. **Navigate to Activity Feed**
   - Go to: `http://localhost:3000/orgs/{orgId}/activity`
   - Or check activity section in overview

2. **Review Activity List**
   - Activities show:
     - Action type (e.g., "function.scanned", "bundle.uploaded")
     - User who performed action
     - Timestamp
     - Details

**Expected Result**:
- Activity feed displays
- Recent actions visible

### Step 10.2: Test Search Functionality

1. **Use Global Search**
   - Look for search bar in navigation
   - Type function name (e.g., "api")
   - Press Enter or click search

2. **Review Search Results**
   - Results show:
     - Functions matching query
     - Dashboards matching query
     - Bundles matching query
     - Alerts matching query

**Expected Result**:
- Search returns relevant results
- Results are clickable and navigate to correct pages

---

## Phase 11: Notification Channels

### Step 11.1: Create Slack Webhook (Optional)

1. **Create Slack Incoming Webhook**
   - Go to Slack App settings
   - Create new Incoming Webhook
   - Copy webhook URL (e.g., `https://hooks.slack.com/services/...`)

### Step 11.2: Add Notification Channel

1. **Navigate to Notifications** (if UI available)
   - Or use API: `POST /orgs/{orgId}/notifications`

2. **Create Channel**
   - **Type**: `slack`
   - **Target**: Your Slack webhook URL
   - **Description**: `Engineering team alerts`
   - Click **Save**

**Expected Result**:
- Notification channel created
- Channel appears in list

### Step 11.3: Test Notification

1. **Trigger Alert** (Step 7.2)
   - Create an alert by refreshing metrics for a problematic function

**Expected Result**:
- If notification channel configured, alert sent to Slack
- Notification appears in Slack channel

---

## Phase 12: Organization Overview

### Step 12.1: View Overview Page

1. **Navigate to Overview**
   - Go to: `http://localhost:3000/orgs/{orgId}`
   - Or click organization name in navigation

2. **Review Overview Dashboard**
   - Key metrics displayed:
     - Function count
     - Bundle count
     - Open alerts count
     - Connected AWS accounts
     - Dashboards count
   - Health score
   - Top functions
   - Recent activity
   - Onboarding checklist

**Expected Result**:
- Overview page loads
- All metrics displayed correctly
- Checklist shows progress

---

## Phase 13: Multi-Region Testing

### Step 13.1: Scan Multiple Regions

1. **Add Functions from Multiple Regions**
   - In AWS Accounts settings, scan multiple regions
   - Or manually add functions from different regions

**Expected Result**:
- Functions from all regions appear in list
- Region filter works correctly

### Step 13.2: View Region-Specific Metrics

1. **Select Function with Multi-Region Deployment**
   - Open function detail page
   - Use region selector
   - Switch between regions

**Expected Result**:
- Metrics update per region
- Region-specific data displayed

---

## Phase 14: Error Handling & Edge Cases

### Step 14.1: Test Invalid AWS Credentials

1. **Add AWS Account with Wrong External ID**
   - Try adding account with incorrect External ID
   - Click **Test Connection**

**Expected Result**:
- Error message displayed
- Connection fails gracefully

### Step 14.2: Test Rate Limiting

1. **Rapid Refresh Attempts**
   - Try refreshing metrics multiple times quickly
   - Should hit rate limit after first request

**Expected Result**:
- Rate limit error (429) after first refresh
- `Retry-After` header provided
- User-friendly error message

### Step 14.3: Test Large Bundle Upload

1. **Upload Very Large Bundle** (if limit exists)
   - Try uploading bundle exceeding size limit

**Expected Result**:
- Upload rejected with clear error message
- Size limit enforced

### Step 14.4: Test Missing CloudWatch Logs

1. **Refresh Metrics for Function Without Logs**
   - Select function that has no CloudWatch logs
   - Refresh metrics

**Expected Result**:
- Graceful handling
- Error message or empty state
- No crash

---

## Phase 15: UI/UX Testing

### Step 15.1: Test Dark Mode

1. **Toggle Theme**
   - Click theme toggle button (sun/moon icon)
   - Usually in bottom-right corner

**Expected Result**:
- Theme switches between light and dark
   - Preference persists on page reload

### Step 15.2: Test Responsive Design

1. **Resize Browser Window**
   - Test on mobile viewport (375px width)
   - Test on tablet viewport (768px width)
   - Test on desktop (1920px width)

**Expected Result**:
- Layout adapts correctly
- All features accessible
- No horizontal scrolling

### Step 15.3: Test Navigation

1. **Navigate Through All Pages**
   - Functions
   - Dashboards
   - Bundles
   - Alerts
   - Settings
   - Overview

**Expected Result**:
- All pages load correctly
- Navigation works smoothly
- No broken links

---

## Phase 16: API Testing (Optional)

### Step 16.1: Test Authentication Endpoints

```bash
# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"Test123!","name":"API Test"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"Test123!"}'

# Save the accessToken from response
```

### Step 16.2: Test Protected Endpoints

```bash
# List functions
curl -X GET http://localhost:3001/orgs/{orgId}/functions \
  -H "Authorization: Bearer {accessToken}"

# Get metrics
curl -X GET http://localhost:3001/functions/{functionId}/metrics?range=7d \
  -H "Authorization: Bearer {accessToken}"
```

**Expected Result**:
- All API endpoints return expected responses
- Authentication works correctly
- Error handling appropriate

---

## Verification Checklist

After completing all phases, verify:

- [ ] User can register and login
- [ ] Organization can be created
- [ ] AWS account can be connected
- [ ] IAM role trust relationship works
- [ ] Lambda functions can be scanned
- [ ] Functions appear in list with correct metadata
- [ ] Metrics can be refreshed
- [ ] Metrics display correctly (cold/warm counts, percentiles)
- [ ] Region-specific metrics work
- [ ] Bundle can be uploaded
- [ ] Bundle analysis completes successfully
- [ ] Bundle insights display correctly
- [ ] Alerts are created when thresholds exceeded
- [ ] Alerts can be viewed
- [ ] Scheduled metrics refresh works (or at least initializes)
- [ ] Dashboard can be created
- [ ] Dashboard cards display metrics
- [ ] Activity feed shows recent actions
- [ ] Search returns relevant results
- [ ] Notification channels can be created
- [ ] Overview page displays all metrics
- [ ] Multi-region functions work correctly
- [ ] Error handling is graceful
- [ ] Dark mode works
- [ ] Responsive design works
- [ ] All navigation links work

---

## Troubleshooting Common Issues

### Issue: Database Connection Failed
**Solution**: 
- Verify PostgreSQL is running: `docker compose ps`
- Check `DATABASE_URL` in `.env`
- Ensure port 5433 is not in use

### Issue: Redis Connection Failed
**Solution**:
- Verify Redis is running: `docker compose ps`
- Check `REDIS_URL` in `.env`
- Ensure port 6379 is not in use

### Issue: AWS AssumeRole Fails
**Solution**:
- Verify IAM role ARN is correct
- Check External ID matches exactly (case-sensitive)
- Ensure trust policy includes your account
- Verify role has required permissions

### Issue: Metrics Refresh Returns Empty
**Solution**:
- Check if Lambda function has CloudWatch logs
- Verify log group exists: `/aws/lambda/{function-name}`
- Ensure function has been invoked recently
- Check CloudWatch Logs Insights permissions

### Issue: Bundle Upload Stuck in Processing
**Solution**:
- Verify Redis is running
- Check API logs for BullMQ errors
- Verify S3/MinIO bucket exists and is accessible
- Check bundle size is within limits

### Issue: Alerts Not Created
**Solution**:
- Verify alert thresholds are set in `.env`
- Check if metrics exceed thresholds
- Review API logs for alert evaluation errors
- Ensure scheduler is running

---

## Test Data Recommendations

For comprehensive testing, ensure you have:

1. **Lambda Functions with Various Characteristics**:
   - Function with high cold start ratio (>10%)
   - Function with slow initialization (>2000ms P90)
   - Function with fast initialization (<500ms P90)
   - Function in multiple regions
   - Function with large deployment package
   - Function with small deployment package

2. **CloudWatch Logs**:
   - Functions should have recent invocations
   - Logs should contain REPORT lines with Init Duration

3. **Test Bundles**:
   - Small bundle (<1MB) for quick testing
   - Medium bundle (5-10MB) for realistic testing
   - Large bundle (if testing limits)

---

## Completion

Once all phases are completed successfully, the application is fully functional and ready for use. Document any issues found during testing for future improvements.

