import { Module } from '@nestjs/common';
import { ActivityLogRepository } from './domain/repositories/activity-log.repository';
import { PrismaActivityLogRepository } from './infrastructure/repositories/prisma-activity-log.repository';

@Module({
  providers: [
    { provide: ActivityLogRepository, useClass: PrismaActivityLogRepository },
  ],
  exports: [ActivityLogRepository],
})
export class ActivityLogModule {}
