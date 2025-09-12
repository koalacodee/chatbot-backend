/*
  Warnings:

  - A unique constraint covering the columns `[licensing_number]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `driving_license_expiry` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licensing_number` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supervisor_id` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_employee_job_title` to the `employee_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_employee_username` to the `employee_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temporary_password` to the `employee_requests` table without a default value. This is not possible if the table is not empty.
  - Made the column `new_employee_full_name` on table `employee_requests` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "driving_license_expiry" DATE NOT NULL,
ADD COLUMN     "licensing_number" VARCHAR(255) NOT NULL,
ADD COLUMN     "supervisor_id" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "employee_requests" ADD COLUMN     "new_employee_job_title" VARCHAR(255) NOT NULL,
ADD COLUMN     "new_employee_username" VARCHAR(255) NOT NULL,
ADD COLUMN     "temporary_password" VARCHAR(255) NOT NULL,
ALTER COLUMN "new_employee_full_name" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "employee_id" VARCHAR(255),
ADD COLUMN     "job_title" VARCHAR(255),
ADD COLUMN     "username" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_licensing_number_key" ON "drivers"("licensing_number");

-- CreateIndex
CREATE INDEX "drivers_supervisor_id_idx" ON "drivers"("supervisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
