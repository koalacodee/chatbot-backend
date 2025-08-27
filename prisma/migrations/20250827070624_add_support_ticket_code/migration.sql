/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `support_tickets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `support_tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "code" VARCHAR(10) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_code_key" ON "support_tickets"("code");
