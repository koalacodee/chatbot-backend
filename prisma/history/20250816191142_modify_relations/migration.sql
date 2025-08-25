/*
  Warnings:

  - You are about to drop the column `assigned_id` on the `support_ticket_answers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "support_ticket_answers" DROP CONSTRAINT "support_ticket_answers_assigned_id_fkey";

-- DropIndex
DROP INDEX "support_ticket_answers_assigned_id_idx";

-- AlterTable
ALTER TABLE "support_ticket_answers" DROP COLUMN "assigned_id";

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "assignee_id" UUID;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
