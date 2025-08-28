-- AlterTable
ALTER TABLE "water_levels" ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "level" SET DATA TYPE DOUBLE PRECISION;
