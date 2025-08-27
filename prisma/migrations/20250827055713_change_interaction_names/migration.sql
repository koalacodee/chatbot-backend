/*
  Warnings:

  - The values [like,dislike] on the enum `interaction_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "interaction_type_new" AS ENUM ('satisfaction', 'dissatisfaction', 'view');
ALTER TABLE "question_interactions" ALTER COLUMN "type" TYPE "interaction_type_new" USING ("type"::text::"interaction_type_new");
ALTER TYPE "interaction_type" RENAME TO "interaction_type_old";
ALTER TYPE "interaction_type_new" RENAME TO "interaction_type";
DROP TYPE "interaction_type_old";
COMMIT;
