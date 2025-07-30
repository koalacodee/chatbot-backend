-- AlterTable
ALTER TABLE "knowledge_chunks" ADD COLUMN     "point_id" UUID;

-- CreateIndex
CREATE INDEX "knowledge_chunks_point_id_idx" ON "knowledge_chunks"("point_id");
