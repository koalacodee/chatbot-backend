/*
  Warnings:

  - Added the required column `name` to the `attachment_group_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `attachment_group_members` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "attachment_group_members" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "member_id" SET DATA TYPE VARCHAR(255);
