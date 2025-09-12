-- CreateEnum
CREATE TYPE "support_ticket_interaction_type" AS ENUM ('satisfaction', 'dissatisfaction');

-- CreateTable
CREATE TABLE "support_ticket_interactions" (
    "id" UUID NOT NULL,
    "support_ticket_id" UUID NOT NULL,
    "guest_id" UUID,
    "type" "support_ticket_interaction_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_interactions_support_ticket_id_key" ON "support_ticket_interactions"("support_ticket_id");

-- CreateIndex
CREATE INDEX "support_ticket_interactions_support_ticket_id_idx" ON "support_ticket_interactions"("support_ticket_id");

-- CreateIndex
CREATE INDEX "support_ticket_interactions_guest_id_idx" ON "support_ticket_interactions"("guest_id");

-- AddForeignKey
ALTER TABLE "support_ticket_interactions" ADD CONSTRAINT "support_ticket_interactions_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "support_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_interactions" ADD CONSTRAINT "support_ticket_interactions_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
