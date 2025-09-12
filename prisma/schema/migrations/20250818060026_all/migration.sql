-- CreateEnum
CREATE TYPE "AdminPermissions" AS ENUM ('view_all_dashboard', 'manage_departments', 'manage_promotions', 'approve_staff_requests', 'manage_site_config', 'manage_supervisors', 'view_user_activity', 'manage_staff_directly');

-- CreateEnum
CREATE TYPE "permissions" AS ENUM ('handle_tickets', 'handle_tasks', 'add_faqs', 'view_analytics', 'close_tickets');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "task_attachment_type" AS ENUM ('assigner', 'assignee');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('to_do', 'seen', 'pending_review', 'pending_supervisor_review', 'completed');

-- CreateEnum
CREATE TYPE "rating" AS ENUM ('satisfied', 'neutral', 'dissatisfied');

-- CreateEnum
CREATE TYPE "support_ticket_status" AS ENUM ('new', 'seen', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('supervisor', 'admin', 'employee', 'driver');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "interaction_type" AS ENUM ('like', 'dislike', 'view');

-- CreateEnum
CREATE TYPE "vehicle_license_status" AS ENUM ('active', 'expiring_soon', 'expired');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('active', 'in_maintenance', 'out_of_service');

-- CreateEnum
CREATE TYPE "violation_type" AS ENUM ('speeding', 'missed_maintenance');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "audience_type" AS ENUM ('customer', 'supervisor', 'employee', 'all');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" CHAR(97) NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisors" (
    "id" UUID NOT NULL,
    "permissions" "AdminPermissions"[],
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permissions" "permissions"[],
    "supervisor_id" UUID NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255),
    "password" CHAR(97),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "target_id" UUID NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "answer" TEXT,
    "department_id" UUID NOT NULL,
    "knowledge_chunk_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "creator_supervisor_id" UUID NOT NULL,
    "creator_admin_id" UUID NOT NULL,
    "creator_employee_id" UUID NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_interactions" (
    "id" UUID NOT NULL,
    "type" "interaction_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "question_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,

    CONSTRAINT "question_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "point_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "role" "message_role" NOT NULL,
    "conversation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrieved_chunks" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "knowledge_chunk_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "retrieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retrieved_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "guest_id" UUID,
    "question" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "point_id" UUID,
    "ticket_code" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "is_auto_generated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "status" "support_ticket_status" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "answered_at" TIMESTAMP(3),
    "assignee_id" UUID,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_answers" (
    "id" UUID NOT NULL,
    "support_ticket_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "answerer_supervisor_id" UUID,
    "answerer_employee_id" UUID,
    "answerer_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rating" "rating",

    CONSTRAINT "support_ticket_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "assignee_id" UUID,
    "assigner_id" UUID NOT NULL,
    "approver_supervisor_id" UUID,
    "approver_admin_id" UUID,
    "status" "task_status" NOT NULL DEFAULT 'to_do',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "assigner_notes" TEXT,
    "feedback" TEXT,
    "performer_employee_id" UUID,
    "performer_supervisor_id" UUID,
    "performer_admin_id" UUID,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_answers" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "expiration_time" TIMESTAMP(3),
    "keys" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "target_id" UUID NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "make" VARCHAR(255) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "plate_number" VARCHAR(255) NOT NULL,
    "vin" VARCHAR(255) NOT NULL,
    "status" "vehicle_status" NOT NULL DEFAULT 'active',
    "driver_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "next_maintenance_date" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_licenses" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "license_number" VARCHAR(255) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "insurance_policy_number" VARCHAR(255),
    "insurance_expiry_date" TIMESTAMP(3),
    "status" "vehicle_license_status",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "trigger_event_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violation_rules" (
    "id" UUID NOT NULL,
    "type" "violation_type" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "fine_amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_requests" (
    "id" UUID NOT NULL,
    "requested_by_supervisor_id" UUID NOT NULL,
    "new_employee_email" VARCHAR(255) NOT NULL,
    "new_employee_full_name" VARCHAR(255),
    "new_employee_designation" VARCHAR(255),
    "status" "request_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_admin_id" UUID,
    "rejection_reason" TEXT,
    "acknowledged_by_supervisor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employee_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,
    "activity" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL,
    "item_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "audience" "audience_type" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_by_admin_id" UUID NOT NULL,
    "created_by_supervisor_id" UUID NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DepartmentToSupervisor" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DepartmentToSupervisor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_user_id_key" ON "supervisors"("user_id");

-- CreateIndex
CREATE INDEX "supervisors_user_id_idx" ON "supervisors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "guests_email_key" ON "guests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "guests_phone_key" ON "guests"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE INDEX "questions_department_id_idx" ON "questions"("department_id");

-- CreateIndex
CREATE INDEX "questions_creator_supervisor_id_idx" ON "questions"("creator_supervisor_id");

-- CreateIndex
CREATE INDEX "question_interactions_question_id_idx" ON "question_interactions"("question_id");

-- CreateIndex
CREATE INDEX "question_interactions_guest_id_idx" ON "question_interactions"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_interactions_question_id_guest_id_key" ON "question_interactions"("question_id", "guest_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_point_id_idx" ON "knowledge_chunks"("point_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_department_id_idx" ON "knowledge_chunks"("department_id");

-- CreateIndex
CREATE INDEX "conversations_guest_id_is_deleted_idx" ON "conversations"("guest_id", "is_deleted");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "retrieved_chunks_message_id_key" ON "retrieved_chunks"("message_id");

-- CreateIndex
CREATE INDEX "retrieved_chunks_knowledge_chunk_id_idx" ON "retrieved_chunks"("knowledge_chunk_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_code_key" ON "tickets"("ticket_code");

-- CreateIndex
CREATE INDEX "tickets_point_id_is_auto_generated_idx" ON "tickets"("point_id", "is_auto_generated");

-- CreateIndex
CREATE INDEX "tickets_department_id_idx" ON "tickets"("department_id");

-- CreateIndex
CREATE INDEX "tickets_guest_id_idx" ON "tickets"("guest_id");

-- CreateIndex
CREATE INDEX "support_tickets_guest_id_idx" ON "support_tickets"("guest_id");

-- CreateIndex
CREATE INDEX "support_tickets_department_id_status_idx" ON "support_tickets"("department_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_answers_support_ticket_id_key" ON "support_ticket_answers"("support_ticket_id");

-- CreateIndex
CREATE INDEX "support_ticket_answers_answerer_supervisor_id_answerer_empl_idx" ON "support_ticket_answers"("answerer_supervisor_id", "answerer_employee_id", "answerer_admin_id");

-- CreateIndex
CREATE INDEX "tasks_department_id_idx" ON "tasks"("department_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_assigner_id_idx" ON "tasks"("assigner_id");

-- CreateIndex
CREATE INDEX "tasks_approver_admin_id_approver_supervisor_id_status_idx" ON "tasks"("approver_admin_id", "approver_supervisor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_answers_ticket_id_key" ON "ticket_answers"("ticket_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "attachments_target_id_idx" ON "attachments"("target_id");

-- CreateIndex
CREATE INDEX "vehicles_driver_id_status_idx" ON "vehicles"("driver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_licenses_vehicle_id_key" ON "vehicle_licenses"("vehicle_id");

-- CreateIndex
CREATE INDEX "violations_driver_id_idx" ON "violations"("driver_id");

-- CreateIndex
CREATE INDEX "violations_vehicle_id_idx" ON "violations"("vehicle_id");

-- CreateIndex
CREATE INDEX "violations_rule_id_is_paid_idx" ON "violations"("rule_id", "is_paid");

-- CreateIndex
CREATE INDEX "employee_requests_requested_by_supervisor_id_idx" ON "employee_requests"("requested_by_supervisor_id");

-- CreateIndex
CREATE INDEX "employee_requests_resolved_by_admin_id_status_idx" ON "employee_requests"("resolved_by_admin_id", "status");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "promotions_created_by_admin_id_is_active_created_by_supervi_idx" ON "promotions"("created_by_admin_id", "is_active", "created_by_supervisor_id");

-- CreateIndex
CREATE INDEX "_DepartmentToSupervisor_B_index" ON "_DepartmentToSupervisor"("B");

-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_knowledge_chunk_id_fkey" FOREIGN KEY ("knowledge_chunk_id") REFERENCES "knowledge_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_supervisor_id_fkey" FOREIGN KEY ("creator_supervisor_id") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_admin_id_fkey" FOREIGN KEY ("creator_admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_employee_id_fkey" FOREIGN KEY ("creator_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieved_chunks" ADD CONSTRAINT "retrieved_chunks_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieved_chunks" ADD CONSTRAINT "retrieved_chunks_knowledge_chunk_id_fkey" FOREIGN KEY ("knowledge_chunk_id") REFERENCES "knowledge_chunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "support_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_answerer_supervisor_id_fkey" FOREIGN KEY ("answerer_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_answerer_employee_id_fkey" FOREIGN KEY ("answerer_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_answerer_admin_id_fkey" FOREIGN KEY ("answerer_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigner_id_fkey" FOREIGN KEY ("assigner_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approver_supervisor_id_fkey" FOREIGN KEY ("approver_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_approver_admin_id_fkey" FOREIGN KEY ("approver_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_performer_employee_id_fkey" FOREIGN KEY ("performer_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_performer_supervisor_id_fkey" FOREIGN KEY ("performer_supervisor_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_performer_admin_id_fkey" FOREIGN KEY ("performer_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_answers" ADD CONSTRAINT "ticket_answers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_licenses" ADD CONSTRAINT "vehicle_licenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "violation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_requested_by_supervisor_id_fkey" FOREIGN KEY ("requested_by_supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_resolved_by_admin_id_fkey" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_supervisor_id_fkey" FOREIGN KEY ("created_by_supervisor_id") REFERENCES "supervisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToSupervisor" ADD CONSTRAINT "_DepartmentToSupervisor_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToSupervisor" ADD CONSTRAINT "_DepartmentToSupervisor_B_fkey" FOREIGN KEY ("B") REFERENCES "supervisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
