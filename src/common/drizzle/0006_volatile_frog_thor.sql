CREATE TABLE "task_reminders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"reminder_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"reminder_interval" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "task_reminders_task_id_index" ON "task_reminders" USING btree ("task_id");