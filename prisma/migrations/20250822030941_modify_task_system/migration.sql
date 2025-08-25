/*
  Warnings:

  - You are about to drop the column `assigner_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `tasks` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigner_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_department_id_fkey";

-- DropIndex
DROP INDEX "tasks_assigner_id_idx";

-- DropIndex
DROP INDEX "tasks_department_id_idx";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "assigner_id",
DROP COLUMN "department_id",
ADD COLUMN     "assigner_admin_id" UUID,
ADD COLUMN     "assigner_supervisor_id" UUID;

-- CreateIndex
CREATE INDEX "tasks_assigner_supervisor_id_idx" ON "tasks"("assigner_supervisor_id");

-- CreateIndex
CREATE INDEX "tasks_assigner_admin_id_idx" ON "tasks"("assigner_admin_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigner_supervisor_id_fkey" FOREIGN KEY ("assigner_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigner_admin_id_fkey" FOREIGN KEY ("assigner_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
