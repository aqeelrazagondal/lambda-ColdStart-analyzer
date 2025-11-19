/*
  Warnings:

  - The `regions` column on the `FunctionRefreshSchedule` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "FunctionRefreshSchedule" ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "lastRunError" TEXT,
ADD COLUMN     "lastRunStatus" TEXT,
ADD COLUMN     "range" TEXT NOT NULL DEFAULT '7d',
DROP COLUMN "regions",
ADD COLUMN     "regions" JSONB;
