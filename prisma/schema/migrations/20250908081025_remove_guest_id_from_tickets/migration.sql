/*
  Warnings:

  - You are about to drop the column `guest_id` on the `support_tickets` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_guest_id_fkey";

-- DropIndex
DROP INDEX "support_tickets_guest_id_idx";

-- AlterTable
ALTER TABLE "support_tickets" DROP COLUMN "guest_id";
