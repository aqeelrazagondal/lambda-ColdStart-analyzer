-- DropForeignKey
ALTER TABLE "BundleInsight" DROP CONSTRAINT "BundleInsight_functionId_fkey";

-- DropForeignKey
ALTER TABLE "BundleInsight" DROP CONSTRAINT "BundleInsight_uploadId_fkey";

-- DropForeignKey
ALTER TABLE "BundleUpload" DROP CONSTRAINT "BundleUpload_functionId_fkey";

-- DropForeignKey
ALTER TABLE "BundleUpload" DROP CONSTRAINT "BundleUpload_orgId_fkey";

-- CreateTable
CREATE TABLE "FunctionRefreshSchedule" (
    "id" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "cron" TEXT NOT NULL DEFAULT '0 3 * * *',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "regions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunctionRefreshSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunctionRefreshSchedule_functionId_key" ON "FunctionRefreshSchedule"("functionId");

-- AddForeignKey
ALTER TABLE "BundleUpload" ADD CONSTRAINT "BundleUpload_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleUpload" ADD CONSTRAINT "BundleUpload_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleInsight" ADD CONSTRAINT "BundleInsight_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "BundleUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleInsight" ADD CONSTRAINT "BundleInsight_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionRefreshSchedule" ADD CONSTRAINT "FunctionRefreshSchedule_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
