import { Module } from '@nestjs/common';
import { TaskRepository } from './domain/repositories/task.repository';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { DepartmentModule } from 'src/department/department.module';
import { SharedModule } from 'src/shared/shared.module';
import { TaskController } from './interface/http/task.controller';
import { AdminTaskController } from './interface/http/controllers/admin-task.controller';
import { SupervisorTaskController } from './interface/http/controllers/supervisor-task.controller';
import {
  CreateTaskUseCase,
  UpdateTaskUseCase,
  GetTaskUseCase,
  GetAllTasksUseCase,
  DeleteTaskUseCase,
  CountTasksUseCase,
  SubmitTaskForReviewUseCase,
  ApproveTaskUseCase,
  RejectTaskUseCase,
  MarkTaskSeenUseCase,
  GetTasksWithFiltersUseCase,
  GetTeamTasksUseCase,
} from './application/use-cases';
import { GetDepartmentLevelTasksUseCase } from './application/use-cases/get-department-level-tasks.use-case';
import { GetSubDepartmentTasksUseCase } from './application/use-cases/get-sub-department-tasks.use-case';
import { GetIndividualLevelTasksUseCase } from './application/use-cases/get-individual-level-tasks.use-case';
import { TaskApprovedListener } from './application/listeners/task-approved.listener';
import { TaskPerformedListener } from './application/listeners/task-performed.listener';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { DepartmentHierarchyService } from './application/services/department-hierarchy.service';

@Module({
  imports: [PrismaModule, DepartmentModule, SharedModule, ActivityLogModule],
  controllers: [TaskController, AdminTaskController, SupervisorTaskController],
  providers: [
    {
      provide: TaskRepository,
      useClass: PrismaTaskRepository,
    },
    CreateTaskUseCase,
    UpdateTaskUseCase,
    GetTaskUseCase,
    GetAllTasksUseCase,
    DeleteTaskUseCase,
    CountTasksUseCase,
    // Non-CRUD
    SubmitTaskForReviewUseCase,
    ApproveTaskUseCase,
    RejectTaskUseCase,
    MarkTaskSeenUseCase,
    GetTasksWithFiltersUseCase,
    GetDepartmentLevelTasksUseCase,
    GetSubDepartmentTasksUseCase,
    GetIndividualLevelTasksUseCase,
    GetTeamTasksUseCase,
    TaskApprovedListener,
    TaskPerformedListener,
    DepartmentHierarchyService,
  ],
  exports: [TaskRepository],
})
export class TaskModule {}
