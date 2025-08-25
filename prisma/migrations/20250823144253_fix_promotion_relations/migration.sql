-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_created_by_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_created_by_supervisor_id_fkey";

-- AlterTable
ALTER TABLE "promotions" ALTER COLUMN "created_by_admin_id" DROP NOT NULL,
ALTER COLUMN "created_by_supervisor_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_supervisor_id_fkey" FOREIGN KEY ("created_by_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
