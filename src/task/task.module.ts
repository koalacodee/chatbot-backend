import { Module } from '@nestjs/common';
import { TaskRepository } from './domain/repositories/task.repository';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';

@Module({
  providers: [
    {
      provide: TaskRepository,
      useClass: PrismaTaskRepository,
    },
  ],
  exports: [TaskRepository],
})
export class TaskModule {}
