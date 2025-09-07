/*
  Warnings:

  - Added the required column `title` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "title" VARCHAR(255) NOT NULL,
ADD COLUMN     "type" VARCHAR(255) NOT NULL;
