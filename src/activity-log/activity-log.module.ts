import { Module } from '@nestjs/common';
import { ActivityLogRepository } from './domain/repositories/activity-log.repository';
import { PrismaActivityLogRepository } from './infrastructure/repositories/prisma-activity-log.repository';
import { ActivityLogController } from './interface/http/activity-log.controller';
import * as UseCases from './application/use-cases';

@Module({
  providers: [
    { provide: ActivityLogRepository, useClass: PrismaActivityLogRepository },
    ...Object.values(UseCases),
  ],
  controllers: [ActivityLogController],
  exports: [ActivityLogRepository],
})
export class ActivityLogModule {}
