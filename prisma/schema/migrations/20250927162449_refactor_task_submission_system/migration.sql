/*
  Warnings:

  - You are about to drop the column `approver_admin_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `approver_supervisor_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `assigner_notes` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `performer_admin_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `performer_employee_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `performer_supervisor_id` on the `tasks` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "task_submission_status" AS ENUM ('submitted', 'approved', 'rejected');

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_approver_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_approver_supervisor_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_performer_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_performer_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_performer_supervisor_id_fkey";

-- DropIndex
DROP INDEX "tasks_approver_admin_id_approver_supervisor_id_status_idx";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "approver_admin_id",
DROP COLUMN "approver_supervisor_id",
DROP COLUMN "assigner_notes",
DROP COLUMN "feedback",
DROP COLUMN "performer_admin_id",
DROP COLUMN "performer_employee_id",
DROP COLUMN "performer_supervisor_id";

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "performer_admin_id" UUID,
    "performer_supervisor_id" UUID,
    "performer_employee_id" UUID,
    "notes" TEXT,
    "feedback" TEXT,
    "status" "task_submission_status" NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_admin_id" UUID,
    "reviewed_by_supervisor_id" UUID,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_submissions_task_id_idx" ON "task_submissions"("task_id");

-- CreateIndex
CREATE INDEX "task_submissions_performer_admin_id_idx" ON "task_submissions"("performer_admin_id");

-- CreateIndex
CREATE INDEX "task_submissions_performer_supervisor_id_idx" ON "task_submissions"("performer_supervisor_id");

-- CreateIndex
CREATE INDEX "task_submissions_performer_employee_id_idx" ON "task_submissions"("performer_employee_id");

-- CreateIndex
CREATE INDEX "task_submissions_status_idx" ON "task_submissions"("status");

-- CreateIndex
CREATE INDEX "task_submissions_reviewed_by_admin_id_reviewed_by_superviso_idx" ON "task_submissions"("reviewed_by_admin_id", "reviewed_by_supervisor_id");

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_performer_admin_id_fkey" FOREIGN KEY ("performer_admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_performer_supervisor_id_fkey" FOREIGN KEY ("performer_supervisor_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_performer_employee_id_fkey" FOREIGN KEY ("performer_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_reviewed_by_supervisor_id_fkey" FOREIGN KEY ("reviewed_by_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
