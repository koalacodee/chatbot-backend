/*
  Warnings:

  - The values [pending_supervisor_review] on the enum `task_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('low', 'medium', 'high');

-- AlterEnum
BEGIN;
CREATE TYPE "task_status_new" AS ENUM ('to_do', 'seen', 'pending_review', 'completed');
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "task_status_new" USING ("status"::text::"task_status_new");
ALTER TYPE "task_status" RENAME TO "task_status_old";
ALTER TYPE "task_status_new" RENAME TO "task_status";
DROP TYPE "task_status_old";
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'to_do';
COMMIT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "priority" "task_priority" NOT NULL DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");
