DROP INDEX IF EXISTS "idx_support_tickets_subject_lower";--> statement-breakpoint
ALTER TABLE "supervisors" ALTER COLUMN "permissions" SET DATA TYPE "public"."AdminPermissions"[] USING "permissions"::"public"."AdminPermissions"[];--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_subject_lower" ON "support_tickets" USING btree (lower(TRIM(BOTH FROM subject)));--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP COLUMN IF EXISTS "original_name";--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP COLUMN IF EXISTS "mime_type";--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP COLUMN IF EXISTS "size";