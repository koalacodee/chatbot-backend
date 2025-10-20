-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "available_langs" TEXT[] DEFAULT ARRAY[]::TEXT[];
