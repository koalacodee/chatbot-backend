import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskRepository } from './domain/repositories/task.repository';
import { TaskSubmissionRepository } from './domain/repositories/task-submission.repository';
import { TaskDelegationRepository } from './domain/repositories/task-delegation.repository';
import { TaskDelegationSubmissionRepository } from './domain/repositories/task-delegation-submission.repository';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { DepartmentModule } from 'src/department/department.module';
import { SharedModule } from 'src/shared/shared.module';
import { TaskController } from './interface/http/task.controller';
import { TaskSubmissionController } from './interface/http/controllers/task-submission.controller';
import { AdminTaskController } from './interface/http/controllers/admin-task.controller';
import { SupervisorTaskController } from './interface/http/controllers/supervisor-task.controller';
import { TaskDelegationController } from './interface/http/controllers/task-delegation.controller';
import * as UseCases from './application/use-cases';
import { TaskApprovedListener } from './application/listeners/task-approved.listener';
import { TaskPerformedListener } from './application/listeners/task-performed.listener';
import { TaskPresetCreatedListener } from './application/listeners/task-preset-created.listener';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { ReminderQueueService } from './infrastructure/queues/reminder.queue';
import { ReminderProcessor } from './infrastructure/queues/reminder.processor';
import { DelegationReminderQueueService } from './infrastructure/queues/delegation-reminder.queue';
import { DelegationReminderProcessor } from './infrastructure/queues/delegation-reminder.processor';
import { ExportModule } from 'src/export/export.module';
import { DrizzleTaskRepository } from './infrastructure/repositories/drizzle/drizzle-task.repository';
import { DrizzleTaskSubmissionRepository } from './infrastructure/repositories/drizzle/drizzle-task-submission.repository';
import { DrizzleTaskDelegationRepository } from './infrastructure/repositories/drizzle/drizzle-task-delegation.repository';
import { DrizzleTaskDelegationSubmissionRepository } from './infrastructure/repositories/drizzle/drizzle-task-delegation-submission.repository';
import { DrizzleTaskPresetRepository } from './infrastructure/repositories/drizzle/drizzle-task-preset.repository';

@Module({
  imports: [
    PrismaModule,
    DepartmentModule,
    SharedModule,
    ActivityLogModule,
    ExportModule,
    BullModule.registerQueue({
      name: 'task-reminders',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'task-delegation-reminders',
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
    TaskDelegationController,
  ],
  providers: [
    {
      provide: TaskRepository,
      useClass: DrizzleTaskRepository,
    },
    {
      provide: TaskSubmissionRepository,
      useClass: DrizzleTaskSubmissionRepository,
    },
    {
      provide: TaskDelegationRepository,
      useClass: DrizzleTaskDelegationRepository,
    },
    {
      provide: TaskDelegationSubmissionRepository,
      useClass: DrizzleTaskDelegationSubmissionRepository,
    },
    {
      provide: 'TaskPresetRepository',
      useClass: DrizzleTaskPresetRepository,
    },
    ...Object.values(UseCases),
    TaskApprovedListener,
    TaskPerformedListener,
    TaskPresetCreatedListener,
    ReminderQueueService,
    ReminderProcessor,
    DelegationReminderQueueService,
    DelegationReminderProcessor,
  ],
  exports: [
    TaskRepository,
    TaskSubmissionRepository,
    TaskDelegationRepository,
    TaskDelegationSubmissionRepository,
    'TaskPresetRepository',
    ReminderQueueService,
    DelegationReminderQueueService,
  ],
})
export class TaskModule {}
