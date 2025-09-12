/*
  Warnings:

  - Added the required column `assignment_type` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "task_assignment_type" AS ENUM ('individual', 'department', 'sub_department');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "assignment_type" "task_assignment_type" NOT NULL,
ADD COLUMN     "target_department_id" UUID,
ADD COLUMN     "target_sub_department_id" UUID;

-- CreateIndex
CREATE INDEX "tasks_target_department_id_idx" ON "tasks"("target_department_id");

-- CreateIndex
CREATE INDEX "tasks_target_sub_department_id_idx" ON "tasks"("target_sub_department_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_target_department_id_fkey" FOREIGN KEY ("target_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_target_sub_department_id_fkey" FOREIGN KEY ("target_sub_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
