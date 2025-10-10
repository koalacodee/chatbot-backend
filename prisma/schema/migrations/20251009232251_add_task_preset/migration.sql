-- CreateTable
CREATE TABLE "task_presets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "assignee_id" UUID,
    "assigner_id" UUID NOT NULL,
    "assigner_role" VARCHAR(20) NOT NULL,
    "approver_id" UUID,
    "assignment_type" "task_assignment_type" NOT NULL,
    "priority" "task_priority" NOT NULL DEFAULT 'medium',
    "target_department_id" UUID,
    "target_sub_department_id" UUID,
    "reminder_interval" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_presets_assigner_id_idx" ON "task_presets"("assigner_id");

-- CreateIndex
CREATE INDEX "task_presets_assigner_role_idx" ON "task_presets"("assigner_role");

-- CreateIndex
CREATE INDEX "task_presets_name_idx" ON "task_presets"("name");
