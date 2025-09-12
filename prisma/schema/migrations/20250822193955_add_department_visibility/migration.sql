-- CreateEnum
CREATE TYPE "DepartmentVisibility" AS ENUM ('public', 'private');

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "visibility" "DepartmentVisibility" NOT NULL DEFAULT 'public';
