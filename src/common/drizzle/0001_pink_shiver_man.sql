DROP INDEX "idx_support_tickets_subject_lower";--> statement-breakpoint
ALTER TABLE "supervisors" ALTER COLUMN "permissions" SET DATA TYPE "public"."AdminPermissions"[] USING "permissions"::"public"."AdminPermissions"[];--> statement-breakpoint
CREATE INDEX "idx_support_tickets_subject_lower" ON "support_tickets" USING btree (lower(TRIM(BOTH FROM subject)));--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP COLUMN "original_name";--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP COLUMN "mime_type";--> statement-breakpoint
ALTER TABLE "profile_pictures" DROP COLUMN "size";