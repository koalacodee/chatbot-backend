-- CreateTable
CREATE TABLE "attachment_group_members" (
    "id" UUID NOT NULL,
    "attachment_group_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,

    CONSTRAINT "attachment_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attachment_group_members_attachment_group_id_idx" ON "attachment_group_members"("attachment_group_id");

-- CreateIndex
CREATE INDEX "attachment_group_members_member_id_idx" ON "attachment_group_members"("member_id");

-- AddForeignKey
ALTER TABLE "attachment_group_members" ADD CONSTRAINT "attachment_group_members_attachment_group_id_fkey" FOREIGN KEY ("attachment_group_id") REFERENCES "attachment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
