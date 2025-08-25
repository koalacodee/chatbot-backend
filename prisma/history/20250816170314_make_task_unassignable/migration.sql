/*
  Warnings:

  - You are about to drop the column `user_id` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the `guest_refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `target_id` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'CLOSED');

-- DropForeignKey
ALTER TABLE "guest_refresh_tokens" DROP CONSTRAINT "guest_refresh_tokens_guest_id_fkey";

-- DropForeignKey
ALTER TABLE "guest_refresh_tokens" DROP CONSTRAINT "guest_refresh_tokens_token_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_approver_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assignee_id_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_refresh_tokens" DROP CONSTRAINT "user_refresh_tokens_token_id_fkey";

-- DropForeignKey
ALTER TABLE "user_refresh_tokens" DROP CONSTRAINT "user_refresh_tokens_user_id_fkey";

-- DropIndex
DROP INDEX "tickets_user_id_idx";

-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "password" CHAR(97),
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "target_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "assignee_id" DROP NOT NULL,
ALTER COLUMN "approver_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "user_id",
ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "guest_refresh_tokens";

-- DropTable
DROP TABLE "user_refresh_tokens";

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
