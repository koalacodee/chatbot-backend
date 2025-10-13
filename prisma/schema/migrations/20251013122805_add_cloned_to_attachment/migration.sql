-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "cloned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "attachments_cloned_idx" ON "attachments"("cloned");
