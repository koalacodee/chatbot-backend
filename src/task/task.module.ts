import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskRepository } from './domain/repositories/task.repository';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { DepartmentModule } from 'src/department/department.module';
import { SharedModule } from 'src/shared/shared.module';
import { TaskController } from './interface/http/task.controller';
import { AdminTaskController } from './interface/http/controllers/admin-task.controller';
import { SupervisorTaskController } from './interface/http/controllers/supervisor-task.controller';
import * as UseCases from './application/use-cases';
import { TaskApprovedListener } from './application/listeners/task-approved.listener';
import { TaskPerformedListener } from './application/listeners/task-performed.listener';
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
  controllers: [TaskController, AdminTaskController, SupervisorTaskController],
  providers: [
    {
      provide: TaskRepository,
      useClass: PrismaTaskRepository,
    },
    ...Object.values(UseCases),
    TaskApprovedListener,
    TaskPerformedListener,
    ReminderQueueService,
    ReminderProcessor,
  ],
  exports: [TaskRepository, ReminderQueueService],
})
export class TaskModule {}
