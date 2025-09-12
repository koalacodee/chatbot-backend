-- CreateTable
CREATE TABLE "question_views" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_views_question_id_idx" ON "question_views"("question_id");

-- CreateIndex
CREATE INDEX "question_views_guest_id_idx" ON "question_views"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_views_question_id_guest_id_key" ON "question_views"("question_id", "guest_id");

-- AddForeignKey
ALTER TABLE "question_views" ADD CONSTRAINT "question_views_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_views" ADD CONSTRAINT "question_views_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
