/*
  Warnings:

  - You are about to drop the column `sectorId` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "actionTaken" TEXT,
ADD COLUMN     "actionTakenAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "sectorId";

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
