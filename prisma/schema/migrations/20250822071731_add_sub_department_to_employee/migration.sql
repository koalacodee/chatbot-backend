/*
  Warnings:

  - Added the required column `sub_department_id` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "sub_department_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_sub_department_id_fkey" FOREIGN KEY ("sub_department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
