ALTER TABLE "departments" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD COLUMN "forwarded_message" text;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD COLUMN "forwarded_to_supervisor_id" uuid;--> statement-breakpoint
ALTER TABLE "task_delegation_submissions" ADD CONSTRAINT "task_delegation_submissions_forwarded_to_supervisor_id_fkey" FOREIGN KEY ("forwarded_to_supervisor_id") REFERENCES "public"."supervisors"("id") ON DELETE set null ON UPDATE cascade;