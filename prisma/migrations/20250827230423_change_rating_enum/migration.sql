/*
  Warnings:

  - The values [satisfied,neutral,dissatisfied] on the enum `rating` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "rating_new" AS ENUM ('satisfaction', 'dissatisfaction');
ALTER TABLE "support_ticket_answers" ALTER COLUMN "rating" TYPE "rating_new" USING ("rating"::text::"rating_new");
ALTER TYPE "rating" RENAME TO "rating_old";
ALTER TYPE "rating_new" RENAME TO "rating";
DROP TYPE "rating_old";
COMMIT;
