/*
  Warnings:

  - You are about to drop the column `mime_type` on the `profile_pictures` table. All the data in the column will be lost.
  - You are about to drop the column `original_name` on the `profile_pictures` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `profile_pictures` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profile_pictures" DROP COLUMN "mime_type",
DROP COLUMN "original_name",
DROP COLUMN "size";
