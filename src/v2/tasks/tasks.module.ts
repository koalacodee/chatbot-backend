import { Module } from '@nestjs/common';
import { TaskRepository } from './domain/repositories/task.repository';

import { TaskDelegationRepository } from './domain/repositories/task-delegation.repository';
import { DrizzleTaskDelegationRepository } from './infrastructure/repositories/drizzle/task-delegation/task-delegation.repository';
import { DrizzleTaskRepository } from './infrastructure/repositories/drizzle/task/task.repository';
import { TaskSubmissionRepository } from './domain/repositories/task-submission.repository';
import { DrizzleTaskSubmissionRepository } from './infrastructure/repositories/drizzle/task-submission/task-submission.repository';
import { TaskDelegationSubmissionRepository } from './domain/repositories/task-delegation-submission.repository';
import { DrizzleTaskDelegationSubmissionRepository } from './infrastructure/repositories/drizzle/task-delegation-submission/task-delegation-submission.repository';
import { TaskPresetRepository } from './domain/repositories/task-preset.repository';
import { DrizzleTaskPresetRepository } from './infrastructure/repositories/drizzle/task-preset/task-preset.repository';
import * as UseCases from './application/use-cases';
import { TaskController } from './interface/controller/task.controller';
import { DepartmentModule } from '@/department/department.module';
import { EmployeeModule } from '@/employee/employee.module';
import { BullModule } from '@nestjs/bullmq';
import * as Listeners from './application/listeners';
import { ReminderQueueService } from './infrastructure/queues/reminder.queue';
import { ReminderProcessor } from './infrastructure/queues/reminder.processor';
import { DelegationReminderQueueService } from './infrastructure/queues/delegation-reminder.queue';
import { DelegationReminderProcessor } from './infrastructure/queues/delegation-reminder.processor';
import { SharedModule } from '@/shared/shared.module';
import { ActivityLogModule } from '@/activity-log/activity-log.module';
import { ExportModule } from '@/export/export.module';
@Module({
  providers: [
    {
      provide: TaskRepository,
      useClass: DrizzleTaskRepository,
    },
    {
      provide: TaskDelegationRepository,
      useClass: DrizzleTaskDelegationRepository,
    },
    {
      provide: TaskSubmissionRepository,
      useClass: DrizzleTaskSubmissionRepository,
    },
    {
      provide: TaskDelegationSubmissionRepository,
      useClass: DrizzleTaskDelegationSubmissionRepository,
    },
    {
      provide: TaskPresetRepository,
      useClass: DrizzleTaskPresetRepository,
    },
    ReminderQueueService,
    ReminderProcessor,
    DelegationReminderQueueService,
    DelegationReminderProcessor,
    ...Object.values(UseCases),
    ...Object.values(Listeners),
  ],
  controllers: [TaskController],
  imports: [
    DepartmentModule,
    SharedModule,
    ActivityLogModule,
    ExportModule,
    EmployeeModule,
    BullModule.registerQueue({
      name: 'v2-task-reminders',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'v2-task-delegation-reminders',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
})
export class TasksModule {}
