/*
  Warnings:

  - Added the required column `task_id` to the `task_delegation_submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "task_delegation_submissions" ADD COLUMN     "forwarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "task_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
