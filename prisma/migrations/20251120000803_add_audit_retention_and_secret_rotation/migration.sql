-- CreateTable
CREATE TABLE "AuditRetentionPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretRotation" (
    "id" TEXT NOT NULL,
    "secretName" TEXT NOT NULL,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedBy" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "SecretRotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditRetentionPolicy_orgId_key" ON "AuditRetentionPolicy"("orgId");

-- CreateIndex
CREATE INDEX "SecretRotation_secretName_rotatedAt_idx" ON "SecretRotation"("secretName", "rotatedAt");

-- CreateIndex
CREATE INDEX "SecretRotation_rotatedBy_idx" ON "SecretRotation"("rotatedBy");

-- AddForeignKey
ALTER TABLE "AuditRetentionPolicy" ADD CONSTRAINT "AuditRetentionPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
