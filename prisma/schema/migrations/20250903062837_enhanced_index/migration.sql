-- DropIndex
DROP INDEX "support_tickets_department_id_status_idx";

-- CreateIndex
CREATE INDEX "activity_logs_type_idx" ON "activity_logs"("type");

-- CreateIndex
CREATE INDEX "activity_logs_occurred_at_idx" ON "activity_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "questions_views_idx" ON "questions"("views");

-- CreateIndex
CREATE INDEX "questions_department_id_views_idx" ON "questions"("department_id", "views");

-- CreateIndex
CREATE INDEX "support_tickets_department_id_idx" ON "support_tickets"("department_id");

CREATE INDEX "idx_support_tickets_subject_lower" ON "support_tickets"(LOWER(TRIM(subject)));

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex

CREATE INDEX idx_promotions_active_dates ON promotions(is_active, start_date, end_date, created_at DESC);