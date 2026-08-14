import { Injectable } from '@nestjs/common';
import { SQL, and, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  notifications,
  recipientNotifications,
  users,
} from 'src/common/drizzle/schema';
import { NotificationRecipient } from 'src/notification/domain/entities/notification-recipient.entity';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import {
  NotificationRepository,
  UnseenNotificationsResult,
} from 'src/notification/domain/repositories/notification.repository';

type NotificationRow = typeof notifications.$inferSelect;
type RecipientRow = typeof recipientNotifications.$inferSelect;

/** A notification row paired with the recipient row a join produced (null when none). */
interface JoinedRow {
  notification: NotificationRow;
  recipient: RecipientRow | null;
}

@Injectable()
export class DrizzleNotificationRepository extends NotificationRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(row: NotificationRow, recipients: RecipientRow[]) {
    return Notification.create({
      id: row.id,
      title: row.title,
      type: row.type,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      recipients: recipients.map((recipient) =>
        NotificationRecipient.create({
          id: recipient.id,
          notificationId: row.id,
          userId: recipient.userId,
          seen: recipient.seen,
        }),
      ),
    });
  }

  /**
   * The join fans a notification out across its recipients, so rows are folded back into
   * one entity per notification here. Insertion order is preserved, which keeps whatever
   * ordering the query asked for.
   */
  private fold(rows: JoinedRow[]): Notification[] {
    const byId = new Map<string, { row: NotificationRow; recipients: RecipientRow[] }>();

    for (const { notification, recipient } of rows) {
      const entry = byId.get(notification.id) ?? {
        row: notification,
        recipients: [],
      };

      if (recipient) entry.recipients.push(recipient);

      byId.set(notification.id, entry);
    }

    return [...byId.values()].map((entry) =>
      this.toDomain(entry.row, entry.recipients),
    );
  }

  /** Notifications matching `where`, each carrying every one of its recipients. */
  private async loadWithAllRecipients(where?: SQL): Promise<Notification[]> {
    const rows = await this.db
      .select({ notification: notifications, recipient: recipientNotifications })
      .from(notifications)
      .leftJoin(
        recipientNotifications,
        eq(recipientNotifications.notificationId, notifications.id),
      )
      .where(where);

    return this.fold(rows);
  }

  async findAll(): Promise<Notification[]> {
    return this.loadWithAllRecipients();
  }

  async findById(id: string): Promise<Notification | null> {
    const found = await this.loadWithAllRecipients(eq(notifications.id, id));

    return found[0] ?? null;
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(notifications).where(eq(notifications.id, id));
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    // Prisma's `recipients: { some: { userId } }` — the notification is selected by one
    // recipient, but every recipient is still returned, so the membership test stays a
    // subquery rather than becoming the join condition.
    return this.loadWithAllRecipients(
      inArray(
        notifications.id,
        this.db
          .select({ notificationId: recipientNotifications.notificationId })
          .from(recipientNotifications)
          .where(eq(recipientNotifications.userId, userId)),
      ),
    );
  }

  async findUnseenNotifications(
    userId: string,
  ): Promise<UnseenNotificationsResult> {
    // Here the filter and the projection agree — this user's unseen rows both choose the
    // notification and are the only recipients returned — so one inner join does the work
    // Prisma needed a `where.some` plus a filtered `include` for.
    const rows = await this.db
      .select({ notification: notifications, recipient: recipientNotifications })
      .from(notifications)
      .innerJoin(
        recipientNotifications,
        and(
          eq(recipientNotifications.notificationId, notifications.id),
          eq(recipientNotifications.userId, userId),
          eq(recipientNotifications.seen, false),
        ),
      );

    const domainNotifications = this.fold(rows);

    const counts: Record<string, number> = {};

    for (const notification of domainNotifications) {
      counts[notification.type] = (counts[notification.type] || 0) + 1;
    }

    return { notifications: domainNotifications, counts };
  }

  async save(notification: Notification): Promise<Notification> {
    const values = {
      id: notification.id,
      title: notification.title,
      type: notification.type,
      createdAt: notification.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
    };

    await this.db.transaction(async (tx) => {
      await tx
        .insert(notifications)
        .values(values)
        .onConflictDoUpdate({
          target: notifications.id,
          set: {
            title: values.title,
            type: values.type,
            updatedAt: values.updatedAt,
          },
        });


      if (notification.recipients.length === 0) return;

      // recipient_notifications.user_id has an FK to users, so a stale recipient would
      // abort the whole write. Filter to ids that actually exist, as before.
      const userIds = notification.recipients.map(
        (recipient) => recipient.userId,
      );

      const existing = await tx
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, userIds));

      const existingIds = new Set(existing.map((user) => user.id));

      const validRecipients = notification.recipients.filter((recipient) =>
        existingIds.has(recipient.userId),
      );

      if (validRecipients.length === 0) return;

      await tx
        .insert(recipientNotifications)
        .values(
          validRecipients.map((recipient) => ({
            id: recipient.id.toString(),
            seen: recipient.seen,
            userId: recipient.userId,
            notificationId: notification.id,
          })),
        )
        // The Prisma version used `create`, so re-saving a notification threw on the
        // duplicate recipient id. Nothing depends on that throw, and a save should be
        // repeatable.
        .onConflictDoNothing();
    });

    // Re-read so the returned entity carries recipients persisted by earlier saves too,
    // not just the ones supplied on this call.
    const saved = await this.findById(notification.id);

    return saved ?? this.toDomain({ ...values }, []);
  }

  async markAllAsSeen(userId: string): Promise<void> {
    await this.db
      .update(recipientNotifications)
      .set({ seen: true })
      .where(eq(recipientNotifications.userId, userId));
  }

  async markNotificationsAsSeen(
    userId: string,
    notificationIds: string[],
  ): Promise<void> {
    if (notificationIds.length === 0) return;

    await this.db
      .update(recipientNotifications)
      .set({ seen: true })
      .where(
        and(
          eq(recipientNotifications.userId, userId),
          inArray(recipientNotifications.notificationId, notificationIds),
        ),
      );
  }
}
