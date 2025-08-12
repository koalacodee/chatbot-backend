/*
  Warnings:

  - You are about to drop the column `attachment_id` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `attachment_id` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the `promotion_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `support_ticket_answer_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `support_ticket_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `task_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vehicle_license_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vehicle_photos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `violation_attachments` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `target_id` to the `attachments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "promotion_attachments" DROP CONSTRAINT "promotion_attachments_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "promotion_attachments" DROP CONSTRAINT "promotion_attachments_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "question_attachments" DROP CONSTRAINT "question_attachments_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "question_attachments" DROP CONSTRAINT "question_attachments_question_id_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_answer_attachments" DROP CONSTRAINT "support_ticket_answer_attachments_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_answer_attachments" DROP CONSTRAINT "support_ticket_answer_attachments_support_ticket_answer_id_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_attachments" DROP CONSTRAINT "support_ticket_attachments_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_attachments" DROP CONSTRAINT "support_ticket_attachments_support_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "task_attachments" DROP CONSTRAINT "task_attachments_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "task_attachments" DROP CONSTRAINT "task_attachments_task_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_license_attachments" DROP CONSTRAINT "vehicle_license_attachments_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_license_attachments" DROP CONSTRAINT "vehicle_license_attachments_vehicle_license_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_photos" DROP CONSTRAINT "vehicle_photos_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_photos" DROP CONSTRAINT "vehicle_photos_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "violation_attachments" DROP CONSTRAINT "violation_attachments_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "violation_attachments" DROP CONSTRAINT "violation_attachments_violation_id_fkey";

-- DropIndex
DROP INDEX "questions_attachment_id_key";

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "target_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "attachment_id";

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "attachment_id";

-- DropTable
DROP TABLE "promotion_attachments";

-- DropTable
DROP TABLE "question_attachments";

-- DropTable
DROP TABLE "support_ticket_answer_attachments";

-- DropTable
DROP TABLE "support_ticket_attachments";

-- DropTable
DROP TABLE "task_attachments";

-- DropTable
DROP TABLE "vehicle_license_attachments";

-- DropTable
DROP TABLE "vehicle_photos";

-- DropTable
DROP TABLE "violation_attachments";

-- CreateIndex
CREATE INDEX "attachments_target_id_idx" ON "attachments"("target_id");
