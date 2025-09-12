/*
  Warnings:

  - The values [view_all_dashboard,manage_departments,approve_staff_requests,manage_site_config,manage_supervisors,manage_drivers] on the enum `AdminPermissions` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminPermissions_new" AS ENUM ('view_analytics', 'manage_sub_departments', 'manage_promotions', 'view_user_activity', 'manage_staff_directly', 'manage_tasks');
ALTER TABLE "supervisors" ALTER COLUMN "permissions" TYPE "AdminPermissions_new"[] USING ("permissions"::text::"AdminPermissions_new"[]);
ALTER TYPE "AdminPermissions" RENAME TO "AdminPermissions_old";
ALTER TYPE "AdminPermissions_new" RENAME TO "AdminPermissions";
DROP TYPE "AdminPermissions_old";
COMMIT;
