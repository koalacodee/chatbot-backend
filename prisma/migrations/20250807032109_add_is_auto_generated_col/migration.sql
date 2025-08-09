-- DropIndex
DROP INDEX "tickets_point_id_idx";

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "is_auto_generated" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "tickets_point_id_is_auto_generated_idx" ON "tickets"("point_id", "is_auto_generated");
