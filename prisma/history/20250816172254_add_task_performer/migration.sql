-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "performer_id" UUID;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_performer_id_fkey" FOREIGN KEY ("performer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
