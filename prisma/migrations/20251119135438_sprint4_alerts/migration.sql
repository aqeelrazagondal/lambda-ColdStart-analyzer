-- CreateTable
CREATE TABLE "FunctionAlert" (
    "id" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "observedValue" INTEGER,
    "threshold" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FunctionAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunctionAlert_functionId_status_idx" ON "FunctionAlert"("functionId", "status");

-- AddForeignKey
ALTER TABLE "FunctionAlert" ADD CONSTRAINT "FunctionAlert_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
