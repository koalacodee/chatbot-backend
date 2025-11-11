-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('csv', 'json');

-- CreateTable
CREATE TABLE "exports" (
    "id" UUID NOT NULL,
    "type" "ExportType" NOT NULL,
    "object_path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rows" INTEGER NOT NULL,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exports_type_idx" ON "exports"("type");
