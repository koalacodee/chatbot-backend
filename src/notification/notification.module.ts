import { Global, Module } from '@nestjs/common';
import { NotificationRepository } from './domain/repositories/notification.repository';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { NotificationController } from './interface/notification.controller';
import { GetUnseenNotificationsUseCase } from './application/use-cases/get-unseen-notifications.use-case';
import { NotificationRecipientResolverService } from './domain/services/notification-recipient-resolver.service';
import { NotificationEmailService } from './application/services/notification-email.service';
import { DepartmentModule } from 'src/department/department.module';
import { TaskModule } from 'src/task/task.module';
import * as listeners from './application/listeners';

@Global()
@Module({
  imports: [DepartmentModule, TaskModule],
  providers: [
    {
      provide: NotificationRepository,
      useClass: PrismaNotificationRepository,
    },
    GetUnseenNotificationsUseCase,
    NotificationRecipientResolverService,
    NotificationEmailService,
    // Event listeners
    ...Object.values(listeners),
  ],
  exports: [NotificationRepository],
  controllers: [NotificationController],
})
export class NotificationModule {}
