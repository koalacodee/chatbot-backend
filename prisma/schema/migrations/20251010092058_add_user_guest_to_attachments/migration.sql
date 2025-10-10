-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "guest_id" UUID,
ADD COLUMN     "user_id" UUID;

-- CreateIndex
CREATE INDEX "attachments_user_id_idx" ON "attachments"("user_id");

-- CreateIndex
CREATE INDEX "attachments_guest_id_idx" ON "attachments"("guest_id");
