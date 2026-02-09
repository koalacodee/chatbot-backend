ALTER TABLE "question_interactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "question_interactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "question_interactions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "supervisors" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "supervisors" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "supervisors" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ALTER COLUMN "submitted_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ALTER COLUMN "submitted_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ALTER COLUMN "reviewed_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_delegations" ALTER COLUMN "target_sub_department_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "task_delegations" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_delegations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "task_delegations" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_delegations" ALTER COLUMN "completed_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_presets" ALTER COLUMN "due_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_presets" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_presets" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "task_presets" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_submissions" ALTER COLUMN "submitted_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "task_submissions" ALTER COLUMN "submitted_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "task_submissions" ALTER COLUMN "reviewed_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "completed_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "due_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "reminder_start_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;