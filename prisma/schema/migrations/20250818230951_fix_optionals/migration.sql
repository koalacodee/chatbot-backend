-- AlterTable
ALTER TABLE "questions" ALTER COLUMN "creator_supervisor_id" DROP NOT NULL,
ALTER COLUMN "creator_admin_id" DROP NOT NULL,
ALTER COLUMN "creator_employee_id" DROP NOT NULL;
