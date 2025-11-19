-- CreateTable
CREATE TABLE "RegionMetricsSnapshot" (
    "id" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "coldCount" INTEGER NOT NULL DEFAULT 0,
    "warmCount" INTEGER NOT NULL DEFAULT 0,
    "p50InitMs" INTEGER,
    "p90InitMs" INTEGER,
    "p99InitMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionMetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegionMetricsSnapshot_functionId_region_periodStart_idx" ON "RegionMetricsSnapshot"("functionId", "region", "periodStart");

-- AddForeignKey
ALTER TABLE "RegionMetricsSnapshot" ADD CONSTRAINT "RegionMetricsSnapshot_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
