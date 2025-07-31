import { Module } from '@nestjs/common';
import { PushManagerService } from './application/services/push-manager.service';
import { PushNotificationService } from './application/services/push-notification.service';
import { PushManagerController } from './interface/http/push-manager.controller';
import { PushSubscriptionRepository } from './domain/repositories/push-subscription.repository';
import { PrismaPushSubscriptionRepository } from './infrastructure/repositories/prisma-push-subscription.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    PushManagerService,
    PushNotificationService,
    {
      provide: PushSubscriptionRepository,
      useClass: PrismaPushSubscriptionRepository,
    },
  ],
  controllers: [PushManagerController],
  exports: [PushManagerService, PushNotificationService],
})
export class PushManagerModule {}
