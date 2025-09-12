/*
  Warnings:

  - Added the required column `guest_email` to the `support_tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guest_name` to the `support_tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guest_phone` to the `support_tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "guest_email" VARCHAR(255) NOT NULL,
ADD COLUMN     "guest_name" VARCHAR(255) NOT NULL,
ADD COLUMN     "guest_phone" VARCHAR(255) NOT NULL;
