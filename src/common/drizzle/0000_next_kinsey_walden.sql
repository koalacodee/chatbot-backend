-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."ActivityLogType" AS ENUM('ticket_answered', 'task_performed', 'task_approved', 'faq_created', 'faq_updated', 'promotion_created', 'staff_request_created');--> statement-breakpoint
CREATE TYPE "public"."AdminPermissions" AS ENUM('view_analytics', 'manage_sub_departments', 'manage_promotions', 'view_user_activity', 'manage_staff_directly', 'manage_tasks', 'manage_attachment_groups');--> statement-breakpoint
CREATE TYPE "public"."DepartmentVisibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."ExportType" AS ENUM('csv', 'json');--> statement-breakpoint
CREATE TYPE "public"."TicketStatus" AS ENUM('PENDING', 'IN_PROGRESS', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."TranslationLanguage" AS ENUM('en', 'es', 'fr', 'de', 'ar', 'pt', 'ru', 'zh', 'ja', 'tr');--> statement-breakpoint
CREATE TYPE "public"."audience_type" AS ENUM('customer', 'supervisor', 'employee', 'all');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('satisfaction', 'dissatisfaction', 'view');--> statement-breakpoint
CREATE TYPE "public"."permissions" AS ENUM('handle_tickets', 'handle_tasks', 'add_faqs', 'view_analytics', 'close_tickets', 'manage_knowledge_chunks', 'manage_attachment_groups');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('satisfaction', 'dissatisfaction');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_interaction_type" AS ENUM('satisfaction', 'dissatisfaction');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('new', 'seen', 'answered', 'closed');--> statement-breakpoint
CREATE TYPE "public"."task_assignment_type" AS ENUM('individual', 'department', 'sub_department');--> statement-breakpoint
CREATE TYPE "public"."task_attachment_type" AS ENUM('assigner', 'assignee');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('to_do', 'seen', 'pending_review', 'completed');--> statement-breakpoint
CREATE TYPE "public"."task_submission_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('supervisor', 'admin', 'employee', 'driver');--> statement-breakpoint
CREATE TYPE "public"."vehicle_license_status" AS ENUM('active', 'expiring_soon', 'expired');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('active', 'in_maintenance', 'out_of_service');--> statement-breakpoint
CREATE TYPE "public"."violation_type" AS ENUM('speeding', 'missed_maintenance');--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"visibility" "DepartmentVisibility" DEFAULT 'public' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_sub_departments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"employee_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"assigned_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"department_id" uuid NOT NULL,
	"point_id" uuid,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"driving_license_expiry" date NOT NULL,
	"licensing_number" varchar(255) NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"conversation_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"role" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_pictures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_by_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"ips" varchar(255)[],
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"expires_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"audience" "audience_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"start_date" timestamp(3),
	"end_date" timestamp(3),
	"created_by_admin_id" uuid,
	"created_by_supervisor_id" uuid
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" varchar(255) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"target_id" uuid,
	"expiration_date" timestamp(3),
	"original_name" varchar(500) NOT NULL,
	"filename" varchar(500) NOT NULL,
	"guest_id" uuid,
	"user_id" uuid,
	"is_global" boolean DEFAULT false NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"cloned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" varchar(255) NOT NULL,
	"meta" jsonb NOT NULL,
	"title" text NOT NULL,
	"type" "ActivityLogType" NOT NULL,
	"occurred_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255),
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guest_id" uuid,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"ended_at" timestamp(3),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"anonymous_id" uuid
);
--> statement-breakpoint
CREATE TABLE "employee_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requested_by_supervisor_id" uuid NOT NULL,
	"new_employee_email" varchar(255) NOT NULL,
	"new_employee_full_name" varchar(255) NOT NULL,
	"new_employee_designation" varchar(255),
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"resolved_at" timestamp(3),
	"resolved_by_admin_id" uuid,
	"rejection_reason" text,
	"acknowledged_by_supervisor" boolean DEFAULT false NOT NULL,
	"new_employee_job_title" varchar(255) NOT NULL,
	"new_employee_username" varchar(255) NOT NULL,
	"temporary_password" varchar(255) NOT NULL,
	"new_employee_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" "permissions"[],
	"supervisor_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"endpoint" text NOT NULL,
	"expiration_time" timestamp(3),
	"keys" jsonb NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"revoked_at" timestamp(3),
	"target_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"answer" text,
	"department_id" uuid NOT NULL,
	"knowledge_chunk_id" uuid,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"creator_supervisor_id" uuid,
	"creator_admin_id" uuid,
	"creator_employee_id" uuid,
	"dissatisfaction" integer DEFAULT 0 NOT NULL,
	"satisfaction" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"available_langs" text[] DEFAULT '{"RAY"}'
);
--> statement-breakpoint
CREATE TABLE "supervisors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"permissions" "AdminPermissions""[],
	"user_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipient_notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retrieved_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message_id" uuid NOT NULL,
	"knowledge_chunk_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"retrieved_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_interactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"support_ticket_id" uuid NOT NULL,
	"guest_id" uuid,
	"type" "support_ticket_interaction_type" NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"anonymous_id" uuid
);
--> statement-breakpoint
CREATE TABLE "support_ticket_answers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"support_ticket_id" uuid NOT NULL,
	"content" text NOT NULL,
	"answerer_supervisor_id" uuid,
	"answerer_employee_id" uuid,
	"answerer_admin_id" uuid,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"rating" "rating"
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"department_id" uuid NOT NULL,
	"status" "support_ticket_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"answered_at" timestamp(3),
	"assignee_id" uuid,
	"code" varchar(10) NOT NULL,
	"guest_email" varchar(255) NOT NULL,
	"guest_name" varchar(255) NOT NULL,
	"guest_phone" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_presets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"due_date" timestamp(3),
	"assignee_id" uuid,
	"assigner_id" uuid NOT NULL,
	"assigner_role" varchar(20) NOT NULL,
	"approver_id" uuid,
	"assignment_type" "task_assignment_type" NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"target_department_id" uuid,
	"target_sub_department_id" uuid,
	"reminder_interval" integer,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"performer_admin_id" uuid,
	"performer_supervisor_id" uuid,
	"performer_employee_id" uuid,
	"notes" text,
	"feedback" text,
	"status" "task_submission_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reviewed_at" timestamp(3),
	"reviewed_by_admin_id" uuid,
	"reviewed_by_supervisor_id" uuid,
	"delegation_submission_id" uuid
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guest_id" uuid,
	"question" text NOT NULL,
	"department_id" uuid NOT NULL,
	"point_id" uuid,
	"ticket_code" varchar(255) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"status" "TicketStatus" DEFAULT 'PENDING' NOT NULL,
	"is_auto_generated" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"make" varchar(255) NOT NULL,
	"model" varchar(255) NOT NULL,
	"year" integer NOT NULL,
	"plate_number" varchar(255) NOT NULL,
	"vin" varchar(255) NOT NULL,
	"status" "vehicle_status" DEFAULT 'active' NOT NULL,
	"driver_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"notes" text,
	"next_maintenance_date" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "vehicle_licenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"license_number" varchar(255) NOT NULL,
	"issue_date" timestamp(3) NOT NULL,
	"expiry_date" timestamp(3) NOT NULL,
	"insurance_policy_number" varchar(255),
	"insurance_expiry_date" timestamp(3),
	"status" "vehicle_license_status",
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lang" "TranslationLanguage" NOT NULL,
	"content" text NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"sub_target" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "violation_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "violation_type" NOT NULL,
	"threshold" integer NOT NULL,
	"fine_amount" integer NOT NULL,
	"description" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"assignee_id" uuid,
	"status" "task_status" DEFAULT 'to_do' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"completed_at" timestamp(3),
	"assignment_type" "task_assignment_type" NOT NULL,
	"target_department_id" uuid,
	"target_sub_department_id" uuid,
	"assigner_admin_id" uuid,
	"assigner_supervisor_id" uuid,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp(3),
	"reminder_interval" integer,
	"creator_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" char(97) NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"employee_id" varchar(255),
	"job_title" varchar(255),
	"username" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_interactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "interaction_type" NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"question_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_answers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "violations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"driver_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"trigger_event_id" varchar(255) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "ExportType" NOT NULL,
	"object_path" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"rows" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_delegations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"assignee_id" uuid,
	"target_sub_department_id" uuid NOT NULL,
	"status" "task_status" DEFAULT 'to_do' NOT NULL,
	"assignment_type" "task_assignment_type" NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"completed_at" timestamp(3),
	"delegator_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_delegation_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"delegation_id" uuid NOT NULL,
	"performer_admin_id" uuid,
	"performer_supervisor_id" uuid,
	"performer_employee_id" uuid,
	"notes" text,
	"feedback" text,
	"status" "task_submission_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reviewed_at" timestamp(3),
	"reviewed_by_admin_id" uuid,
	"reviewed_by_supervisor_id" uuid,
	"forwarded" boolean DEFAULT false NOT NULL,
	"task_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_DepartmentToSupervisor" (
	"A" uuid NOT NULL,
	"B" uuid NOT NULL,
	CONSTRAINT "_DepartmentToSupervisor_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "_AttachmentToAttachmentGroup" (
	"A" uuid NOT NULL,
	"B" uuid NOT NULL,
	CONSTRAINT "_AttachmentToAttachmentGroup_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee_sub_departments" ADD CONSTRAINT "employee_sub_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee_sub_departments" ADD CONSTRAINT "employee_sub_departments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profile_pictures" ADD CONSTRAINT "profile_pictures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attachment_groups" ADD CONSTRAINT "attachment_groups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_supervisor_id_fkey" FOREIGN KEY ("created_by_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_requested_by_supervisor_id_fkey" FOREIGN KEY ("requested_by_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee_requests" ADD CONSTRAINT "employee_requests_resolved_by_admin_id_fkey" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "question_views" ADD CONSTRAINT "question_views_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_admin_id_fkey" FOREIGN KEY ("creator_admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_employee_id_fkey" FOREIGN KEY ("creator_employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_supervisor_id_fkey" FOREIGN KEY ("creator_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_knowledge_chunk_id_fkey" FOREIGN KEY ("knowledge_chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "recipient_notifications" ADD CONSTRAINT "recipient_notifications_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "recipient_notifications" ADD CONSTRAINT "recipient_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "retrieved_chunks" ADD CONSTRAINT "retrieved_chunks_knowledge_chunk_id_fkey" FOREIGN KEY ("knowledge_chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "retrieved_chunks" ADD CONSTRAINT "retrieved_chunks_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket_interactions" ADD CONSTRAINT "support_ticket_interactions_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket_interactions" ADD CONSTRAINT "support_ticket_interactions_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_answerer_admin_id_fkey" FOREIGN KEY ("answerer_admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_answerer_employee_id_fkey" FOREIGN KEY ("answerer_employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_answerer_supervisor_id_fkey" FOREIGN KEY ("answerer_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket_answers" ADD CONSTRAINT "support_ticket_answers_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_performer_admin_id_fkey" FOREIGN KEY ("performer_admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_performer_employee_id_fkey" FOREIGN KEY ("performer_employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_performer_supervisor_id_fkey" FOREIGN KEY ("performer_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_reviewed_by_supervisor_id_fkey" FOREIGN KEY ("reviewed_by_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_delegation_submission_id_fkey" FOREIGN KEY ("delegation_submission_id") REFERENCES "public"."task_delegation_submissions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "vehicle_licenses" ADD CONSTRAINT "vehicle_licenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigner_admin_id_fkey" FOREIGN KEY ("assigner_admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigner_supervisor_id_fkey" FOREIGN KEY ("assigner_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_target_department_id_fkey" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_target_sub_department_id_fkey" FOREIGN KEY ("target_sub_department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "question_interactions" ADD CONSTRAINT "question_interactions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ticket_answers" ADD CONSTRAINT "ticket_answers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."violation_rules"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_target_sub_department_id_fkey" FOREIGN KEY ("target_sub_department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegations" ADD CONSTRAINT "task_delegations_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_delegation_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "public"."task_delegations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_performer_admin_id_fkey" FOREIGN KEY ("performer_admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_performer_supervisor_id_fkey" FOREIGN KEY ("performer_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_performer_employee_id_fkey" FOREIGN KEY ("performer_employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_reviewed_by_supervisor_id_fkey" FOREIGN KEY ("reviewed_by_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_DepartmentToSupervisor" ADD CONSTRAINT "_DepartmentToSupervisor_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_DepartmentToSupervisor" ADD CONSTRAINT "_DepartmentToSupervisor_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."supervisors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_AttachmentToAttachmentGroup" ADD CONSTRAINT "_AttachmentToAttachmentGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_AttachmentToAttachmentGroup" ADD CONSTRAINT "_AttachmentToAttachmentGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."attachment_groups"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_user_id_key" ON "admins" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "departments_parent_id_idx" ON "departments" USING btree ("parent_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "employee_sub_departments_department_id_idx" ON "employee_sub_departments" USING btree ("department_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "employee_sub_departments_employee_id_department_id_key" ON "employee_sub_departments" USING btree ("employee_id" uuid_ops,"department_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "employee_sub_departments_employee_id_idx" ON "employee_sub_departments" USING btree ("employee_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunks_department_id_idx" ON "knowledge_chunks" USING btree ("department_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunks_point_id_idx" ON "knowledge_chunks" USING btree ("point_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_licensing_number_key" ON "drivers" USING btree ("licensing_number" text_ops);--> statement-breakpoint
CREATE INDEX "drivers_supervisor_id_idx" ON "drivers" USING btree ("supervisor_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "profile_pictures_user_id_key" ON "profile_pictures" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "attachment_groups_created_by_id_idx" ON "attachment_groups" USING btree ("created_by_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "attachment_groups_key_idx" ON "attachment_groups" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "promotions_created_by_admin_id_is_active_created_by_supervi_idx" ON "promotions" USING btree ("created_by_admin_id" uuid_ops,"is_active" bool_ops,"created_by_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "attachments_cloned_idx" ON "attachments" USING btree ("cloned" bool_ops);--> statement-breakpoint
CREATE INDEX "attachments_guest_id_idx" ON "attachments" USING btree ("guest_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "attachments_is_global_idx" ON "attachments" USING btree ("is_global" bool_ops);--> statement-breakpoint
CREATE INDEX "attachments_target_id_idx" ON "attachments" USING btree ("target_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "attachments_user_id_idx" ON "attachments" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "activity_logs_occurred_at_idx" ON "activity_logs" USING btree ("occurred_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "activity_logs_type_idx" ON "activity_logs" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "guests_email_key" ON "guests" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "guests_phone_key" ON "guests" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE INDEX "conversations_guest_id_is_deleted_idx" ON "conversations" USING btree ("guest_id" bool_ops,"is_deleted" bool_ops);--> statement-breakpoint
CREATE INDEX "employee_requests_requested_by_supervisor_id_idx" ON "employee_requests" USING btree ("requested_by_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "employee_requests_resolved_by_admin_id_status_idx" ON "employee_requests" USING btree ("resolved_by_admin_id" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "question_views_guest_id_idx" ON "question_views" USING btree ("guest_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "question_views_question_id_guest_id_key" ON "question_views" USING btree ("question_id" uuid_ops,"guest_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "question_views_question_id_idx" ON "question_views" USING btree ("question_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "questions_creator_supervisor_id_idx" ON "questions" USING btree ("creator_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "questions_department_id_idx" ON "questions" USING btree ("department_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "questions_department_id_views_idx" ON "questions" USING btree ("department_id" int4_ops,"views" uuid_ops);--> statement-breakpoint
CREATE INDEX "questions_views_idx" ON "questions" USING btree ("views" int4_ops);--> statement-breakpoint
CREATE INDEX "supervisors_user_id_idx" ON "supervisors" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "supervisors_user_id_key" ON "supervisors" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "recipient_notifications_notification_id_idx" ON "recipient_notifications" USING btree ("notification_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "recipient_notifications_seen_idx" ON "recipient_notifications" USING btree ("seen" bool_ops);--> statement-breakpoint
CREATE INDEX "recipient_notifications_user_id_idx" ON "recipient_notifications" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "retrieved_chunks_knowledge_chunk_id_idx" ON "retrieved_chunks" USING btree ("knowledge_chunk_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "retrieved_chunks_message_id_key" ON "retrieved_chunks" USING btree ("message_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "support_ticket_interactions_anonymous_id_idx" ON "support_ticket_interactions" USING btree ("anonymous_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "support_ticket_interactions_guest_id_idx" ON "support_ticket_interactions" USING btree ("guest_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "support_ticket_interactions_support_ticket_id_idx" ON "support_ticket_interactions" USING btree ("support_ticket_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "support_ticket_interactions_support_ticket_id_key" ON "support_ticket_interactions" USING btree ("support_ticket_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "support_ticket_answers_answerer_supervisor_id_answerer_empl_idx" ON "support_ticket_answers" USING btree ("answerer_supervisor_id" uuid_ops,"answerer_employee_id" uuid_ops,"answerer_admin_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "support_ticket_answers_support_ticket_id_key" ON "support_ticket_answers" USING btree ("support_ticket_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_support_tickets_subject_lower" ON "support_tickets" USING btree (lower(TRIM(BOTH FROM subject)) text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_code_key" ON "support_tickets" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "support_tickets_department_id_idx" ON "support_tickets" USING btree ("department_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "task_presets_assigner_id_idx" ON "task_presets" USING btree ("assigner_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_presets_assigner_role_idx" ON "task_presets" USING btree ("assigner_role" text_ops);--> statement-breakpoint
CREATE INDEX "task_presets_name_idx" ON "task_presets" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "task_submissions_performer_admin_id_idx" ON "task_submissions" USING btree ("performer_admin_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_submissions_performer_employee_id_idx" ON "task_submissions" USING btree ("performer_employee_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_submissions_performer_supervisor_id_idx" ON "task_submissions" USING btree ("performer_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_submissions_reviewed_by_admin_id_reviewed_by_superviso_idx" ON "task_submissions" USING btree ("reviewed_by_admin_id" uuid_ops,"reviewed_by_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_submissions_status_idx" ON "task_submissions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "task_submissions_task_id_idx" ON "task_submissions" USING btree ("task_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tickets_department_id_idx" ON "tickets" USING btree ("department_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tickets_guest_id_idx" ON "tickets" USING btree ("guest_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tickets_point_id_is_auto_generated_idx" ON "tickets" USING btree ("point_id" uuid_ops,"is_auto_generated" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_ticket_code_key" ON "tickets" USING btree ("ticket_code" text_ops);--> statement-breakpoint
CREATE INDEX "vehicles_driver_id_status_idx" ON "vehicles" USING btree ("driver_id" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_licenses_vehicle_id_key" ON "vehicle_licenses" USING btree ("vehicle_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "translations_lang_idx" ON "translations" USING btree ("lang" enum_ops);--> statement-breakpoint
CREATE INDEX "translations_target_id_idx" ON "translations" USING btree ("target_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tasks_assignee_id_idx" ON "tasks" USING btree ("assignee_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tasks_assigner_admin_id_idx" ON "tasks" USING btree ("assigner_admin_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tasks_assigner_supervisor_id_idx" ON "tasks" USING btree ("assigner_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tasks_priority_idx" ON "tasks" USING btree ("priority" enum_ops);--> statement-breakpoint
CREATE INDEX "tasks_target_department_id_idx" ON "tasks" USING btree ("target_department_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "tasks_target_sub_department_id_idx" ON "tasks" USING btree ("target_sub_department_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_employee_id_key" ON "users" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "question_interactions_guest_id_idx" ON "question_interactions" USING btree ("guest_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "question_interactions_question_id_guest_id_key" ON "question_interactions" USING btree ("question_id" uuid_ops,"guest_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "question_interactions_question_id_idx" ON "question_interactions" USING btree ("question_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_answers_ticket_id_key" ON "ticket_answers" USING btree ("ticket_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "violations_driver_id_idx" ON "violations" USING btree ("driver_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "violations_rule_id_is_paid_idx" ON "violations" USING btree ("rule_id" uuid_ops,"is_paid" bool_ops);--> statement-breakpoint
CREATE INDEX "violations_vehicle_id_idx" ON "violations" USING btree ("vehicle_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "exports_type_idx" ON "exports" USING btree ("type" enum_ops);--> statement-breakpoint
CREATE INDEX "task_delegations_assignee_id_idx" ON "task_delegations" USING btree ("assignee_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegations_delegator_id_idx" ON "task_delegations" USING btree ("delegator_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegations_status_idx" ON "task_delegations" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "task_delegations_target_sub_department_id_idx" ON "task_delegations" USING btree ("target_sub_department_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegations_task_id_idx" ON "task_delegations" USING btree ("task_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegation_submissions_delegation_id_idx" ON "task_delegation_submissions" USING btree ("delegation_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegation_submissions_performer_admin_id_idx" ON "task_delegation_submissions" USING btree ("performer_admin_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegation_submissions_performer_employee_id_idx" ON "task_delegation_submissions" USING btree ("performer_employee_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegation_submissions_performer_supervisor_id_idx" ON "task_delegation_submissions" USING btree ("performer_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegation_submissions_reviewed_by_admin_id_reviewed_b_idx" ON "task_delegation_submissions" USING btree ("reviewed_by_admin_id" uuid_ops,"reviewed_by_supervisor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "task_delegation_submissions_status_idx" ON "task_delegation_submissions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "_DepartmentToSupervisor_B_index" ON "_DepartmentToSupervisor" USING btree ("B" uuid_ops);--> statement-breakpoint
CREATE INDEX "_AttachmentToAttachmentGroup_B_index" ON "_AttachmentToAttachmentGroup" USING btree ("B" uuid_ops);
*/