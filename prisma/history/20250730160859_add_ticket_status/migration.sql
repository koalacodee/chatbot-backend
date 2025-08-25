-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'answered', 'rejected');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'pending';
