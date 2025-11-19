-- CreateTable
CREATE TABLE "TeamActivity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "functionId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamActivity_orgId_createdAt_idx" ON "TeamActivity"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "TeamActivity" ADD CONSTRAINT "TeamActivity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamActivity" ADD CONSTRAINT "TeamActivity_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "LambdaFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamActivity" ADD CONSTRAINT "TeamActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
