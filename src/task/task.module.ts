import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskRepository } from './domain/repositories/task.repository';
import { TaskSubmissionRepository } from './domain/repositories/task-submission.repository';
import { TaskPresetRepository } from './domain/repositories/task-preset.repository';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';
import { PrismaTaskSubmissionRepository } from './infrastructure/repositories/prisma-task-submission.repository';
import { PrismaTaskPresetRepository } from './infrastructure/repositories/prisma-task-preset.repository';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { DepartmentModule } from 'src/department/department.module';
import { SharedModule } from 'src/shared/shared.module';
import { TaskController } from './interface/http/task.controller';
import { TaskSubmissionController } from './interface/http/controllers/task-submission.controller';
import { AdminTaskController } from './interface/http/controllers/admin-task.controller';
import { SupervisorTaskController } from './interface/http/controllers/supervisor-task.controller';
import * as UseCases from './application/use-cases';
import { TaskApprovedListener } from './application/listeners/task-approved.listener';
import { TaskPerformedListener } from './application/listeners/task-performed.listener';
import { TaskPresetCreatedListener } from './application/listeners/task-preset-created.listener';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { ReminderQueueService } from './infrastructure/queues/reminder.queue';
import { ReminderProcessor } from './infrastructure/queues/reminder.processor';

@Module({
  imports: [
    PrismaModule,
    DepartmentModule,
    SharedModule,
    ActivityLogModule,
    BullModule.registerQueue({
      name: 'task-reminders',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    TaskController,
    TaskSubmissionController,
    AdminTaskController,
    SupervisorTaskController,
  ],
  providers: [
    {
      provide: TaskRepository,
      useClass: PrismaTaskRepository,
    },
    {
      provide: TaskSubmissionRepository,
      useClass: PrismaTaskSubmissionRepository,
    },
    {
      provide: 'TaskPresetRepository',
      useClass: PrismaTaskPresetRepository,
    },
    ...Object.values(UseCases),
    TaskApprovedListener,
    TaskPerformedListener,
    TaskPresetCreatedListener,
    ReminderQueueService,
    ReminderProcessor,
  ],
  exports: [
    TaskRepository,
    TaskSubmissionRepository,
    'TaskPresetRepository',
    ReminderQueueService,
  ],
})
export class TaskModule {}
