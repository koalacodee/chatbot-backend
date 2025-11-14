-- AlterTable
ALTER TABLE "task_submissions" ADD COLUMN     "delegation_submission_id" UUID;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_delegation_submission_id_fkey" FOREIGN KEY ("delegation_submission_id") REFERENCES "task_delegation_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
