import { Global, Module } from '@nestjs/common';
import { NotificationRepository } from './domain/repositories/notification.repository';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { NotificationController } from './interface/notification.controller';
import { GetUnseenNotificationsUseCase } from './application/use-cases/get-unseen-notifications.use-case';

@Global()
@Module({
  providers: [
    {
      provide: NotificationRepository,
      useClass: PrismaNotificationRepository,
    },
    GetUnseenNotificationsUseCase,
  ],
  exports: [NotificationRepository],
  controllers: [NotificationController],
})
export class NotificationModule {}
