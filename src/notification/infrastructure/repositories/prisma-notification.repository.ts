import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRecipient } from 'src/notification/domain/entities/notification-recipient.entity';

@Injectable()
export class PrismaNotificationRepository extends NotificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  toDomain(prismaNotification: {
    id: string;
    title: string;
    type: string;
    recipients?: {
      id: string;
      userId: string;
      seen: boolean;
    }[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return Notification.create({
      id: prismaNotification.id,
      recipients: prismaNotification?.recipients?.map((recipient) =>
        NotificationRecipient.create({
          id: recipient.id,
          notificationId: prismaNotification.id,
          userId: recipient.userId,
          seen: recipient.seen,
        }),
      ),
      title: prismaNotification.title,
      type: prismaNotification.type,
      createdAt: prismaNotification.createdAt,
      updatedAt: prismaNotification.updatedAt,
    });
  }

  async findAll(): Promise<Notification[]> {
    const all = await this.prisma.notification.findMany({
      include: { recipients: true },
    });
    return all.map((notification) => this.toDomain(notification));
  }

  async findById(id: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: { recipients: true },
    });
    return notification ? this.toDomain(notification) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.notification.delete({ where: { id } });
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { recipients: { some: { userId } } },
      include: { recipients: true },
    });
    return notifications.map((notification) => this.toDomain(notification));
  }

  async save(notification: Notification) {
    const notificationData = {
      id: notification.id,
      title: notification.title,
      type: notification.type,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };

    const createdNotification = await this.prisma.notification.upsert({
      where: { id: notification.id },
      create: notificationData,
      update: notificationData,
    });

    if (notification.recipients.length > 0) {
      // Validate that all recipient user IDs exist
      const userIds = notification.recipients.map(r => r.userId);
      const existingUsers = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true }
      });
      const existingUserIds = new Set(existingUsers.map(u => u.id));
      
      // Filter out non-existent users
      const validRecipients = notification.recipients.filter(recipient => 
        existingUserIds.has(recipient.userId)
      );
      
      if (validRecipients.length > 0) {
        await this.prisma.$transaction(
          validRecipients.map((recipient) => {
            const data = {
              id: recipient.id.toString(),
              notificationId: notification.id,
              userId: recipient.userId,
              seen: recipient.seen,
            };
            return this.prisma.recipientNotification.upsert({
              where: { id: recipient.id.toString() },
              create: data,
              update: data,
            });
          }),
        );
      }
    }

    return this.toDomain(createdNotification);
  }

  async findUnseenNotifications(userId: string): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { recipients: { some: { userId, seen: false } } },
    });
    return notifications.map((notification) => this.toDomain(notification));
  }

  async markAllAsSeen(userId: string): Promise<void> {
    await this.prisma.recipientNotification.updateMany({
      where: { userId },
      data: {
        seen: true,
      },
    });
  }
}
