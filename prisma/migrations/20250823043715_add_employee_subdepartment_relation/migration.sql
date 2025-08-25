/*
  Warnings:

  - You are about to drop the column `sub_department_id` on the `employees` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_sub_department_id_fkey";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "sub_department_id";

-- CreateTable
CREATE TABLE "employee_sub_departments" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_sub_departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_sub_departments_employee_id_idx" ON "employee_sub_departments"("employee_id");

-- CreateIndex
CREATE INDEX "employee_sub_departments_department_id_idx" ON "employee_sub_departments"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_sub_departments_employee_id_department_id_key" ON "employee_sub_departments"("employee_id", "department_id");

-- AddForeignKey
ALTER TABLE "employee_sub_departments" ADD CONSTRAINT "employee_sub_departments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_sub_departments" ADD CONSTRAINT "employee_sub_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
