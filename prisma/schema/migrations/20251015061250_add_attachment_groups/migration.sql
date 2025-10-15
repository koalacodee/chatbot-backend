-- CreateTable
CREATE TABLE "attachment_groups" (
    "id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "ips" VARCHAR(255)[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachment_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AttachmentToAttachmentGroup" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AttachmentToAttachmentGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "attachment_groups_key_idx" ON "attachment_groups"("key");

-- CreateIndex
CREATE INDEX "attachment_groups_created_by_id_idx" ON "attachment_groups"("created_by_id");

-- CreateIndex
CREATE INDEX "_AttachmentToAttachmentGroup_B_index" ON "_AttachmentToAttachmentGroup"("B");

-- AddForeignKey
ALTER TABLE "attachment_groups" ADD CONSTRAINT "attachment_groups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AttachmentToAttachmentGroup" ADD CONSTRAINT "_AttachmentToAttachmentGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AttachmentToAttachmentGroup" ADD CONSTRAINT "_AttachmentToAttachmentGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "attachment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
