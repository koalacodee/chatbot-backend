/*
  Warnings:

  - The values [staff_request] on the enum `ActivityLogType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `occurred_at` to the `activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityLogType_new" AS ENUM ('ticket_answered', 'task_performed', 'task_approved', 'faq_created', 'faq_updated', 'promotion_created', 'staff_request_created');
ALTER TABLE "activity_logs" ALTER COLUMN "type" TYPE "ActivityLogType_new" USING ("type"::text::"ActivityLogType_new");
ALTER TYPE "ActivityLogType" RENAME TO "ActivityLogType_old";
ALTER TYPE "ActivityLogType_new" RENAME TO "ActivityLogType";
DROP TYPE "ActivityLogType_old";
COMMIT;

-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "occurred_at" TIMESTAMP(3) NOT NULL;
