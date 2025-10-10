-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "is_global" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "attachments_is_global_idx" ON "attachments"("is_global");
