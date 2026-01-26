import {
  Controller,
  Get,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetDepartmentLevelTasksUseCase } from '../../../application/use-cases/get-department-level-tasks.use-case';
import { GetTasksByRoleDto } from '../dto/get-tasks-by-role.dto';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import { TaskPriority, TaskStatus } from '../../../domain/entities/task.entity';

@ApiTags('Admin Tasks')
@ApiBearerAuth()
@Controller('tasks/admin')
export class AdminTaskController {
  constructor(
    private readonly getDepartmentLevelTasksUseCase: GetDepartmentLevelTasksUseCase,
  ) {}

  @Get('department-level')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get department-level tasks (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Department-level tasks retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @AdminAuth()
  async getDepartmentLevelTasks(@Query() query: GetTasksByRoleDto) {
    const toArray = <T>(val?: T | T[]): T[] | undefined =>
      val === undefined ? undefined : Array.isArray(val) ? val : [val];

    const normalizeStatus = (
      value?: TaskStatus | TaskStatus[] | string | string[],
    ): TaskStatus[] | undefined => {
      const arr = toArray(value as any);
      if (!arr) return undefined;
      return arr
        .map((entry) => {
          if (!entry) return undefined;
          const key = entry.toString().toUpperCase() as keyof typeof TaskStatus;
          return TaskStatus[key];
        })
        .filter((entry): entry is TaskStatus => Boolean(entry));
    };

    const normalizePriority = (
      value?: TaskPriority | TaskPriority[] | string | string[],
    ): TaskPriority[] | undefined => {
      const arr = toArray(value as any);
      if (!arr) return undefined;
      return arr
        .map((entry) => {
          if (!entry) return undefined;
          const key = entry
            .toString()
            .toUpperCase() as keyof typeof TaskPriority;
          return TaskPriority[key];
        })
        .filter((entry): entry is TaskPriority => Boolean(entry));
    };

    const result = await this.getDepartmentLevelTasksUseCase.execute({
      departmentId: query.departmentId,
      status: normalizeStatus(query.status),
      priority: normalizePriority(query.priority),
      search: query.search,
    });

    return {
      success: true,
      data: result.tasks.map((t) => t.toJSON()),
      metrics: result.metrics,
      attachments: result.attachments,
      fileHubAttachments: result.fileHubAttachments,
      submissions: result.submissions.map((s) => s.toJSON()),
    };
  }
}
