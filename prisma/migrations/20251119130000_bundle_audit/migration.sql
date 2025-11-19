-- CreateEnum
CREATE TYPE "BundleUploadStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "BundleUpload" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "originalFilename" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "BundleUploadStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BundleUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleInsight" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "totalSizeBytes" INTEGER NOT NULL,
    "uncompressedBytes" INTEGER,
    "fileCount" INTEGER,
    "dependencyCount" INTEGER,
    "score" INTEGER NOT NULL,
    "topDependencies" JSONB,
    "sizeBreakdown" JSONB,
    "recommendations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BundleUpload_orgId_idx" ON "BundleUpload"("orgId");
CREATE INDEX "BundleUpload_functionId_idx" ON "BundleUpload"("functionId");
CREATE UNIQUE INDEX "BundleInsight_uploadId_key" ON "BundleInsight"("uploadId");
CREATE INDEX "BundleInsight_functionId_idx" ON "BundleInsight"("functionId");

-- AddForeignKey
ALTER TABLE "BundleUpload" ADD CONSTRAINT "BundleUpload_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BundleUpload" ADD CONSTRAINT "BundleUpload_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BundleUpload" ADD CONSTRAINT "BundleUpload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BundleInsight" ADD CONSTRAINT "BundleInsight_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "BundleUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BundleInsight" ADD CONSTRAINT "BundleInsight_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

