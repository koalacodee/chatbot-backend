-- CreateTable
CREATE TABLE "recipient_notifications" (
    "id" UUID NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,

    CONSTRAINT "recipient_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipient_notifications_seen_idx" ON "recipient_notifications"("seen");

-- CreateIndex
CREATE INDEX "recipient_notifications_user_id_idx" ON "recipient_notifications"("user_id");

-- CreateIndex
CREATE INDEX "recipient_notifications_notification_id_idx" ON "recipient_notifications"("notification_id");

-- AddForeignKey
ALTER TABLE "recipient_notifications" ADD CONSTRAINT "recipient_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_notifications" ADD CONSTRAINT "recipient_notifications_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
