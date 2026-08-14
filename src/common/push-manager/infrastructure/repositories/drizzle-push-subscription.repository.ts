import { Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, lt } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { pushSubscriptions } from 'src/common/drizzle/schema';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { PushSubscription } from '../../domain/entities/push-subscription.entity';
import { PushSubscriptionRepository } from '../../domain/repositories/push-subscription.repository';

type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

/** `keys` is a jsonb column, so it arrives untyped and has to be narrowed on read. */
interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

@Injectable()
export class DrizzlePushSubscriptionRepository extends PushSubscriptionRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  /**
   * The Prisma version inlined this same `PushSubscription.create({...})` block four
   * times. One mapper instead, with the `mode: 'string'` timestamps rehydrated to the
   * Dates the entity's getters promise.
   */
  private toDomain(row: PushSubscriptionRow): PushSubscription {
    return PushSubscription.create({
      id: UUID.create(row.id),
      userId: row.userId,
      endpoint: row.endpoint,
      expirationTime: row.expirationTime ? new Date(row.expirationTime) : null,
      keys: row.keys as PushSubscriptionKeys,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  async create(subscription: PushSubscription): Promise<PushSubscription> {
    const [created] = await this.db
      .insert(pushSubscriptions)
      .values({
        id: subscription.id.value,
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime?.toISOString() ?? null,
        keys: subscription.keys,
        createdAt: subscription.createdAt.toISOString(),
        // `@updatedAt` in the Prisma schema, so Prisma stamped this on write regardless
        // of what the entity carried. Drizzle has no such hook.
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return this.toDomain(created);
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .orderBy(desc(pushSubscriptions.createdAt));

    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<PushSubscription | null> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async update(subscription: PushSubscription): Promise<PushSubscription> {
    const [updated] = await this.db
      .update(pushSubscriptions)
      .set({
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime?.toISOString() ?? null,
        keys: subscription.keys,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pushSubscriptions.id, subscription.id.value))
      .returning();

    // Prisma's `update` threw P2025 on a missing row; keep it a failure rather than
    // silently returning nothing, but as a 404 instead of a 500.
    if (!updated) throw new NotFoundException('Push subscription not found');

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    // `expiration_time < now()` is already false for NULL, so Prisma's extra
    // `not: null` was redundant.
    await this.db
      .delete(pushSubscriptions)
      .where(lt(pushSubscriptions.expirationTime, new Date().toISOString()));
  }
}
