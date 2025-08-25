-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "point_id" UUID;

-- CreateIndex
CREATE INDEX "tickets_point_id_idx" ON "tickets"("point_id");
