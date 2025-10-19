-- CreateEnum
CREATE TYPE "TranslationLanguage" AS ENUM ('en', 'es', 'fr', 'de', 'ar', 'pt', 'ru', 'zh', 'ja', 'tr');

-- CreateTable
CREATE TABLE "translations" (
    "id" UUID NOT NULL,
    "lang" "TranslationLanguage" NOT NULL,
    "content" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translations_target_id_idx" ON "translations"("target_id");

-- CreateIndex
CREATE INDEX "translations_lang_idx" ON "translations"("lang");
