import { Module } from '@nestjs/common';
import { PushManagerService } from './application/services/push-manager.service';
import { PushNotificationService } from './application/services/push-notification.service';
import { PushManagerController } from './interface/http/push-manager.controller';
import { PushSubscriptionRepository } from './domain/repositories/push-subscription.repository';
import { DrizzlePushSubscriptionRepository } from './infrastructure/repositories/drizzle-push-subscription.repository';

@Module({
  providers: [
    PushManagerService,
    PushNotificationService,
    {
      provide: PushSubscriptionRepository,
      useClass: DrizzlePushSubscriptionRepository,
    },
  ],
  controllers: [PushManagerController],
  exports: [PushManagerService, PushNotificationService],
})
export class PushManagerModule {}
