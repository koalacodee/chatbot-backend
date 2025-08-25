/*
  Warnings:

  - You are about to drop the column `user_id` on the `conversations` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `departments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `user_id` on the `push_subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `user_id` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to alter the column `token` on the `refresh_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `status` on the `tickets` table. All the data in the column will be lost.
  - You are about to alter the column `ticket_code` on the `tickets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `name` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `email` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - A unique constraint covering the columns `[attachment_id]` on the table `questions` will be added. If there are existing duplicate values, this will fail.
  - Made the column `guest_id` on table `conversations` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `knowledge_chunks` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `creator_id` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `retrieved_chunks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "permissions" AS ENUM ('handle_tickets', 'handle_tasks', 'add_faqs', 'view_analytics', 'close_tickets', 'view_all_dashboard', 'manage_departments', 'manage_promotions', 'approve_staff_requests', 'manage_supervisors', 'view_user_activity', 'manage_staff_directly');

-- CreateEnum
CREATE TYPE "task_attachment_type" AS ENUM ('assigner', 'assignee');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('to_do', 'seen', 'pending_review', 'pending_supervisor_review', 'completed');

-- CreateEnum
CREATE TYPE "rating" AS ENUM ('satisfied', 'neutral', 'dissatisfied');

-- CreateEnum
CREATE TYPE "support_ticket_status" AS ENUM ('new', 'seen', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('supervisor', 'admin', 'employee', 'driver');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "interaction_type" AS ENUM ('like', 'dislike', 'view');

-- CreateEnum
CREATE TYPE "vehicle_license_status" AS ENUM ('active', 'expiring_soon', 'expired');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('active', 'in_maintenance', 'out_of_service');

-- CreateEnum
CREATE TYPE "violation_type" AS ENUM ('speeding', 'missed_maintenance');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "audience_type" AS ENUM ('customer', 'supervisor', 'employee', 'all');

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "user_id",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "guest_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "parent_id" UUID,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "knowledge_chunks" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "role",
ADD COLUMN     "role" "message_role" NOT NULL;

-- AlterTable
ALTER TABLE "push_subscriptions" ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "attachment_id" UUID,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creator_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "user_id",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "token" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "retrieved_chunks" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "status",
ALTER COLUMN "ticket_code" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "permissions" "permissions"[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
DROP COLUMN "role",
ADD COLUMN     "role" "user_role" NOT NULL;

-- DropEnum
DROP TYPE "MessageRole";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "TicketStatus";

-- CreateTable
CREATE TABLE "user_refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_refresh_tokens" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "token_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_interactions" (
    "id" UUID NOT NULL,
    "type" "interaction_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "question_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,

    CONSTRAINT "question_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attachments" (
    "id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "status" "support_ticket_status" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "answered_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_answers" (
    "id" UUID NOT NULL,
    "support_ticket_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "answerer_id" UUID NOT NULL,
    "assigned_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rating" "rating",

    CONSTRAINT "support_ticket_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "assignee_id" UUID NOT NULL,
    "assigner_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'to_do',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "assigner_notes" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "type" "task_attachment_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_answer_attachments" (
    "id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "support_ticket_answer_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_answer_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_attachments" (
    "id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "support_ticket_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "data_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "make" VARCHAR(255) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "plate_number" VARCHAR(255) NOT NULL,
    "vin" VARCHAR(255) NOT NULL,
    "status" "vehicle_status" NOT NULL DEFAULT 'active',
    "driver_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "next_maintenance_date" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_licenses" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "license_number" VARCHAR(255) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "insurance_policy_number" VARCHAR(255),
    "insurance_expiry_date" TIMESTAMP(3),
    "status" "vehicle_license_status",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_license_attachments" (
    "id" UUID NOT NULL,
    "vehicle_license_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_license_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_photos" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "trigger_event_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_attachments" (
    "id" UUID NOT NULL,
    "violation_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violation_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_rules" (
    "id" UUID NOT NULL,
    "type" "violation_type" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "fine_amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_requests" (
    "id" UUID NOT NULL,
    "requested_by_supervisor_id" UUID NOT NULL,
    "new_employee_email" VARCHAR(255) NOT NULL,
    "new_employee_full_name" VARCHAR(255),
    "new_employee_designation" VARCHAR(255),
    "status" "request_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_admin_id" UUID,
    "rejection_reason" TEXT,
    "acknowledged_by_supervisor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employee_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,
    "activity" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL,
    "item_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "attachment_id" UUID NOT NULL,
    "audience" "audience_type" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_by_user_id" UUID NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_attachments" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_refresh_tokens_token_id_key" ON "user_refresh_tokens"("token_id");

-- CreateIndex
CREATE INDEX "user_refresh_tokens_user_id_idx" ON "user_refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guests_email_key" ON "guests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "guests_phone_key" ON "guests"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "guest_refresh_tokens_token_id_key" ON "guest_refresh_tokens"("token_id");

-- CreateIndex
CREATE INDEX "guest_refresh_tokens_guest_id_idx" ON "guest_refresh_tokens"("guest_id");

-- CreateIndex
CREATE INDEX "question_interactions_question_id_idx" ON "question_interactions"("question_id");

-- CreateIndex
CREATE INDEX "question_interactions_guest_id_idx" ON "question_interactions"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_interactions_question_id_guest_id_key" ON "question_interactions"("question_id", "guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_attachments_attachment_id_key" ON "question_attachments"("attachment_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_attachments_question_id_key" ON "question_attachments"("question_id");

-- CreateIndex
CREATE INDEX "support_tickets_guest_id_idx" ON "support_tickets"("guest_id");

-- CreateIndex
CREATE INDEX "support_tickets_department_id_status_idx" ON "support_tickets"("department_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_answers_support_ticket_id_key" ON "support_ticket_answers"("support_ticket_id");

-- CreateIndex
CREATE INDEX "support_ticket_answers_answerer_id_idx" ON "support_ticket_answers"("answerer_id");

-- CreateIndex
CREATE INDEX "support_ticket_answers_assigned_id_idx" ON "support_ticket_answers"("assigned_id");

-- CreateIndex
CREATE INDEX "tasks_department_id_idx" ON "tasks"("department_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_assigner_id_idx" ON "tasks"("assigner_id");

-- CreateIndex
CREATE INDEX "tasks_approver_id_status_idx" ON "tasks"("approver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_attachments_task_id_key" ON "task_attachments"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_attachments_attachment_id_key" ON "task_attachments"("attachment_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_answer_attachments_attachment_id_key" ON "support_ticket_answer_attachments"("attachment_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_answer_attachments_support_ticket_answer_id_key" ON "support_ticket_answer_attachments"("support_ticket_answer_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_attachments_attachment_id_key" ON "support_ticket_attachments"("attachment_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_attachments_support_ticket_id_key" ON "support_ticket_attachments"("support_ticket_id");

-- CreateIndex
CREATE INDEX "vehicles_driver_id_status_idx" ON "vehicles"("driver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_licenses_vehicle_id_key" ON "vehicle_licenses"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_license_attachments_vehicle_license_id_key" ON "vehicle_license_attachments"("vehicle_license_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_license_attachments_attachment_id_key" ON "vehicle_license_attachments"("attachment_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_photos_attachment_id_key" ON "vehicle_photos"("attachment_id");

-- CreateIndex
CREATE INDEX "vehicle_photos_vehicle_id_idx" ON "vehicle_photos"("vehicle_id");

-- CreateIndex
CREATE INDEX "violations_driver_id_idx" ON "violations"("driver_id");

-- CreateIndex
CREATE INDEX "violations_vehicle_id_idx" ON "violations"("vehicle_id");

-- CreateIndex
CREATE INDEX "violations_rule_id_is_paid_idx" ON "violations"("rule_id", "is_paid");

-- CreateIndex
CREATE UNIQUE INDEX "violation_attachments_violation_id_key" ON "violation_attachments"("violation_id");

-- CreateIndex
CREATE UNIQUE INDEX "violation_attachments_attachment_id_key" ON "violation_attachments"("attachment_id");

-- CreateIndex
CREATE INDEX "employee_requests_requested_by_supervisor_id_idx" ON "employee_requests"("requested_by_supervisor_id");

-- CreateIndex
CREATE INDEX "employee_requests_resolved_by_admin_id_status_idx" ON "employee_requests"("resolved_by_admin_id", "status");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "promotions_created_by_user_id_is_active_idx" ON "promotions"("created_by_user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_attachments_promotion_id_key" ON "promotion_attachments"("promotion_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_attachments_attachment_id_key" ON "promotion_attachments"("attachment_id");

-- CreateIndex
CREATE INDEX "conversations_guest_id_is_deleted_idx" ON "conversations"("guest_id", "is_deleted");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_department_id_idx" ON "knowledge_chunks"("department_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "questions_attachment_id_key" ON "questions"("attachment_id");

-- CreateIndex
CREATE INDEX "questions_department_id_idx" ON "questions"("department_id");

-- CreateIndex
CREATE INDEX "questions_creator_id_idx" ON "questions"("creator_id");

-- CreateIndex
CREATE INDEX "retrieved_chunks_knowledge_chunk_id_idx" ON "retrieved_chunks"("knowledge_chunk_id");

-- CreateIndex
CREATE INDEX "tickets_department_id_idx" ON "tickets"("department_id");

-- CreateIndex
CREATE INDEX "tickets_user_id_idx" ON "tickets"("user_id");

-- CreateIndex
CREATE INDEX "tickets_guest_id_idx" ON "tickets"("guest_id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- AddForeignKey
ALTER TABLE "user_refresh_tokens" ADD CONSTRAINT "user_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_refresh_tokens" ADD CONSTRAINT "user_refresh_tokens_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "refresh_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_refresh_tokens" ADD CONSTRAINT "guest_refresh_tokens_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_refresh_tokens" ADD CONSTRAINT "guest_refresh_tokens_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "refresh_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "support_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_answerer_id_fkey" FOREIGN KEY ("answerer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_assigned_id_fkey" FOREIGN KEY ("assigned_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigner_id_fkey" FOREIGN KEY ("assigner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answer_attachments" ADD CONSTRAINT "support_ticket_answer_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answer_attachments" ADD CONSTRAINT "support_ticket_answer_attachments_support_ticket_answer_id_fkey" FOREIGN KEY ("support_ticket_answer_id") REFERENCES "support_ticket_answers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "support_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_licenses" ADD CONSTRAINT "vehicle_licenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_license_attachments" ADD CONSTRAINT "vehicle_license_attachments_vehicle_license_id_fkey" FOREIGN KEY ("vehicle_license_id") REFERENCES "vehicle_licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_license_attachments" ADD CONSTRAINT "vehicle_license_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "violation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violation_attachments" ADD CONSTRAINT "violation_attachments_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violation_attachments" ADD CONSTRAINT "violation_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_requested_by_supervisor_id_fkey" FOREIGN KEY ("requested_by_supervisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_resolved_by_admin_id_fkey" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_attachments" ADD CONSTRAINT "promotion_attachments_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_attachments" ADD CONSTRAINT "promotion_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
