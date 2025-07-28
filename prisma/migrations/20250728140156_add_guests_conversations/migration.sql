/*
  Warnings:

  - A unique constraint covering the columns `[guest_id]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "guest_id" UUID,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "conversations_guest_id_key" ON "conversations"("guest_id");
