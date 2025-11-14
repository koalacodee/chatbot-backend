-- CreateTable
CREATE TABLE "task_delegation_submissions" (
    "id" UUID NOT NULL,
    "delegation_id" UUID NOT NULL,
    "performer_admin_id" UUID,
    "performer_supervisor_id" UUID,
    "performer_employee_id" UUID,
    "notes" TEXT,
    "feedback" TEXT,
    "status" "task_submission_status" NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_admin_id" UUID,
    "reviewed_by_supervisor_id" UUID,

    CONSTRAINT "task_delegation_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_delegation_submissions_delegation_id_idx" ON "task_delegation_submissions"("delegation_id");

-- CreateIndex
CREATE INDEX "task_delegation_submissions_performer_admin_id_idx" ON "task_delegation_submissions"("performer_admin_id");

-- CreateIndex
CREATE INDEX "task_delegation_submissions_performer_supervisor_id_idx" ON "task_delegation_submissions"("performer_supervisor_id");

-- CreateIndex
CREATE INDEX "task_delegation_submissions_performer_employee_id_idx" ON "task_delegation_submissions"("performer_employee_id");

-- CreateIndex
CREATE INDEX "task_delegation_submissions_status_idx" ON "task_delegation_submissions"("status");

-- CreateIndex
CREATE INDEX "task_delegation_submissions_reviewed_by_admin_id_reviewed_b_idx" ON "task_delegation_submissions"("reviewed_by_admin_id", "reviewed_by_supervisor_id");

-- AddForeignKey
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_delegation_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "task_delegations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_performer_admin_id_fkey" FOREIGN KEY ("performer_admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_performer_supervisor_id_fkey" FOREIGN KEY ("performer_supervisor_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_performer_employee_id_fkey" FOREIGN KEY ("performer_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_reviewed_by_supervisor_id_fkey" FOREIGN KEY ("reviewed_by_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
