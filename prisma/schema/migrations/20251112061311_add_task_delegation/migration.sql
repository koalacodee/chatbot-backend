-- CreateTable
CREATE TABLE "task_delegations" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "assignee_id" UUID,
    "target_sub_department_id" UUID NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'to_do',
    "assignment_type" "task_assignment_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "delegator_id" UUID NOT NULL,

    CONSTRAINT "task_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_delegations_task_id_idx" ON "task_delegations"("task_id");

-- CreateIndex
CREATE INDEX "task_delegations_assignee_id_idx" ON "task_delegations"("assignee_id");

-- CreateIndex
CREATE INDEX "task_delegations_target_sub_department_id_idx" ON "task_delegations"("target_sub_department_id");

-- CreateIndex
CREATE INDEX "task_delegations_delegator_id_idx" ON "task_delegations"("delegator_id");

-- CreateIndex
CREATE INDEX "task_delegations_status_idx" ON "task_delegations"("status");

-- AddForeignKey
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_target_sub_department_id_fkey" FOREIGN KEY ("target_sub_department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
