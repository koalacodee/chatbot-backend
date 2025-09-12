/*
  Warnings:

  - You are about to drop the column `activity` on the `activity_logs` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `activity_logs` table. All the data in the column will be lost.
  - Added the required column `meta` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActivityLogType" AS ENUM ('ticket_answered', 'task_performed', 'task_approved', 'faq_created', 'faq_updated', 'promotion_created', 'staff_request');

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "activity",
DROP COLUMN "details",
ADD COLUMN     "meta" JSONB NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" "ActivityLogType" NOT NULL;
