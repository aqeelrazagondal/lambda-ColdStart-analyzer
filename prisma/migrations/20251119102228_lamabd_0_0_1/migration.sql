-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('owner', 'admin', 'viewer');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUser" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,

    CONSTRAINT "OrganizationUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwsAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "roleArn" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "defaultRegion" TEXT,
    "connectedAt" TIMESTAMP(3),

    CONSTRAINT "AwsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LambdaFunction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "awsAccountId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "functionArn" TEXT NOT NULL,
    "functionName" TEXT NOT NULL,
    "runtime" TEXT,
    "memoryMb" INTEGER,
    "timeoutMs" INTEGER,
    "lastScannedAt" TIMESTAMP(3),

    CONSTRAINT "LambdaFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColdStartMetrics" (
    "id" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "coldCount" INTEGER NOT NULL DEFAULT 0,
    "warmCount" INTEGER NOT NULL DEFAULT 0,
    "p50InitMs" INTEGER,
    "p90InitMs" INTEGER,
    "p99InitMs" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'logs_insights',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColdStartMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUser_orgId_userId_key" ON "OrganizationUser"("orgId", "userId");

-- CreateIndex
CREATE INDEX "LambdaFunction_orgId_idx" ON "LambdaFunction"("orgId");

-- CreateIndex
CREATE INDEX "LambdaFunction_awsAccountId_region_idx" ON "LambdaFunction"("awsAccountId", "region");

-- CreateIndex
CREATE UNIQUE INDEX "LambdaFunction_orgId_functionArn_key" ON "LambdaFunction"("orgId", "functionArn");

-- CreateIndex
CREATE INDEX "ColdStartMetrics_functionId_periodStart_idx" ON "ColdStartMetrics"("functionId", "periodStart");

-- AddForeignKey
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUser" ADD CONSTRAINT "OrganizationUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwsAccount" ADD CONSTRAINT "AwsAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LambdaFunction" ADD CONSTRAINT "LambdaFunction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LambdaFunction" ADD CONSTRAINT "LambdaFunction_awsAccountId_fkey" FOREIGN KEY ("awsAccountId") REFERENCES "AwsAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColdStartMetrics" ADD CONSTRAINT "ColdStartMetrics_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
