-- CreateTable
CREATE TABLE "refill_reports" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "refillDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volumeRefilled" DOUBLE PRECISION NOT NULL,
    "previousLevel" INTEGER,
    "currentLevel" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION,
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refill_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "refill_reports" ADD CONSTRAINT "refill_reports_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refill_reports" ADD CONSTRAINT "refill_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
