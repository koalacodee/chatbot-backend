-- AlterTable
ALTER TABLE "support_ticket_interactions" ADD COLUMN     "anonymous_id" UUID;

-- CreateIndex
CREATE INDEX "support_ticket_interactions_anonymous_id_idx" ON "support_ticket_interactions"("anonymous_id");
