import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PushSubscriptionRepository } from '../../domain/repositories/push-subscription.repository';
import { PushSubscription } from '../../domain/entities/push-subscription.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class PrismaPushSubscriptionRepository extends PushSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(subscription: PushSubscription): Promise<PushSubscription> {
    const created = await this.prisma.pushSubscription.create({
      data: {
        id: subscription.id.value,
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: subscription.keys as any,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    });

    return PushSubscription.create({
      id: UUID.create(created.id),
      userId: created.userId,
      endpoint: created.endpoint,
      expirationTime: created.expirationTime,
      keys: created.keys as { p256dh: string; auth: string },
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub) =>
      PushSubscription.create({
        id: UUID.create(sub.id),
        userId: sub.userId,
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: sub.keys as { p256dh: string; auth: string },
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      }),
    );
  }

  async findById(id: string): Promise<PushSubscription | null> {
    const subscription = await this.prisma.pushSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      return null;
    }

    return PushSubscription.create({
      id: UUID.create(subscription.id),
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: subscription.keys as { p256dh: string; auth: string },
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    });
  }

  async update(subscription: PushSubscription): Promise<PushSubscription> {
    const updated = await this.prisma.pushSubscription.update({
      where: { id: subscription.id.value },
      data: {
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: subscription.keys as any,
        updatedAt: subscription.updatedAt,
      },
    });

    return PushSubscription.create({
      id: UUID.create(updated.id),
      userId: updated.userId,
      endpoint: updated.endpoint,
      expirationTime: updated.expirationTime,
      keys: updated.keys as { p256dh: string; auth: string },
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pushSubscription.delete({
      where: { id },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: {
        expirationTime: {
          not: null,
          lt: new Date(),
        },
      },
    });
  }
}
