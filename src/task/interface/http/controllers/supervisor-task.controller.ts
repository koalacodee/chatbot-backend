import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetSubDepartmentTasksUseCase } from '../../../application/use-cases/get-sub-department-tasks.use-case';
import { GetIndividualLevelTasksUseCase } from '../../../application/use-cases/get-individual-level-tasks.use-case';
import { GetTeamTasksForSupervisorUseCase } from '../../../application/use-cases/get-team-tasks-for-supervisor.use-case';
import { GetTasksByRoleDto } from '../dto/get-tasks-by-role.dto';
import { Task, TaskPriority, TaskStatus } from '../../../domain/entities/task.entity';
import { SupervisorPermissions } from 'src/rbac/decorators';
import { SupervisorPermissionsEnum as SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { Req } from '@nestjs/common';
import { TaskSubmission } from 'src/task/domain/entities/task-submission.entity';
import { PaginatedResult } from 'src/common/drizzle/helpers/cursor';
import { TaskDelegationSubmission } from 'src/task/domain/entities/task-delegation-submission.entity';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@ApiTags('Supervisor Tasks')
@ApiBearerAuth()
@Controller('tasks/supervisor')
export class SupervisorTaskController {
  constructor(
    private readonly getSubDepartmentTasksUseCase: GetSubDepartmentTasksUseCase,
    private readonly getIndividualLevelTasksUseCase: GetIndividualLevelTasksUseCase,
    private readonly getTeamTasksForSupervisorUseCase: GetTeamTasksForSupervisorUseCase,
  ) { }

  @Get('team-tasks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all team tasks for supervisor (combined)' })
  @ApiResponse({
    status: 200,
    description: 'Team tasks retrieved successfully',
  })
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  async getTeamTasks(
    @Query() query: GetTasksByRoleDto,
    @Req() req: any,
  ): Promise<PaginatedResult<{
    task: (ReturnType<Task['toJSON']> & {
      submissions: ReturnType<TaskSubmission['toJSON']>[];
      delegationSubmissions: ReturnType<TaskDelegationSubmission['toJSON']>[];
    });
    rejectionReason?: string;
    approvalFeedback?: string;
  }> & {
    fileHubAttachments: FilehubAttachmentMessage[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }> {
    return await this.getTeamTasksForSupervisorUseCase.execute(
      {
        status: this.normalizeStatusQuery(query.status),
        priority: this.normalizePriorityQuery(query.priority),
        cursor: query.cursor,
        cursorDir: query.cursorDir,
        limit: query.limit,
        search: query.search,
      },
      req.user.id,
    );
  }

  @Get('sub-department')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sub-department level tasks (Supervisor only)' })
  @ApiResponse({
    status: 200,
    description: 'Sub-department tasks retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Supervisor access required',
  })
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  async getSubDepartmentTasks(@Query() query: GetTasksByRoleDto) {
    const result = await this.getSubDepartmentTasksUseCase.execute({
      subDepartmentId: query.subDepartmentId,
      status: this.normalizeStatusQuery(query.status),
      priority: this.normalizePriorityQuery(query.priority),
      search: query.search,
      cursor: query.cursor,
      cursorDir: query.cursorDir,
      limit: query.limit,
    });

    return {
      success: true,
      data: result.data.map((t) => t.toJSON()),
      meta: result.meta,
      metrics: result.metrics,
      attachments: result.attachments,
      fileHubAttachments: result.fileHubAttachments,
      submissions: result.submissions.map((s) => s.toJSON()),
    };
  }

  @Get('employee-level')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get employee-level tasks within supervisor department',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee-level tasks retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Supervisor access required',
  })
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  async getEmployeeLevelTasks(@Query() query: GetTasksByRoleDto) {
    const result = await this.getIndividualLevelTasksUseCase.execute({
      assigneeId: query.assigneeId,
      departmentId: query.departmentId,
      status: this.normalizeStatusQuery(query.status),
      priority: this.normalizePriorityQuery(query.priority),
      search: query.search,
      cursor: query.cursor,
      cursorDir: query.cursorDir,
      limit: query.limit,
    });

    return {
      success: true,
      data: result.data.map((t) => t.toJSON()),
      meta: result.meta,
      metrics: result.metrics,
      attachments: result.attachments,
      fileHubAttachments: result.fileHubAttachments,
      submissions: result.submissions.map((s) => s.toJSON()),
    };
  }

  private toArray<T>(value?: T | T[]): T[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return Array.isArray(value) ? value : [value];
  }

  private normalizeStatusQuery(
    value?: TaskStatus | TaskStatus[] | string | string[],
  ): TaskStatus[] | undefined {
    const arr = this.toArray(value as any);
    if (!arr?.length) return undefined;
    return arr
      .map((entry) => {
        if (!entry) return undefined;
        const key = entry.toString().toUpperCase() as keyof typeof TaskStatus;
        return TaskStatus[key];
      })
      .filter((entry): entry is TaskStatus => Boolean(entry));
  }

  private normalizePriorityQuery(
    value?: TaskPriority | TaskPriority[] | string | string[],
  ): TaskPriority[] | undefined {
    const arr = this.toArray(value as any);
    if (!arr?.length) return undefined;
    return arr
      .map((entry) => {
        if (!entry) return undefined;
        const key = entry.toString().toUpperCase() as keyof typeof TaskPriority;
        return TaskPriority[key];
      })
      .filter((entry): entry is TaskPriority => Boolean(entry));
  }
}
