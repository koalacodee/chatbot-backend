/*
  Warnings:

  - Added the required column `expiration_date` to the `attachments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_name` to the `attachments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "expiration_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "original_name" VARCHAR(500) NOT NULL;
