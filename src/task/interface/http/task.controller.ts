import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
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
  GetMyTasksUseCase,
} from '../../application/use-cases';
import {
  CreateTaskInputDto,
  UpdateTaskInputDto,
  SubmitTaskForReviewInputDto,
  ApproveTaskInputDto,
  RejectTaskInputDto,
  GetTasksWithFiltersDto,
} from './dto';
import { GetTeamTasksDto } from './dto/get-team-tasks.dto';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { TaskStatus } from '@prisma/client';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { EmployeePermissionsEnum as EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { SupervisorPermissionsEnum as SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly createUseCase: CreateTaskUseCase,
    private readonly updateUseCase: UpdateTaskUseCase,
    private readonly getUseCase: GetTaskUseCase,
    private readonly getAllUseCase: GetAllTasksUseCase,
    private readonly deleteUseCase: DeleteTaskUseCase,
    private readonly countUseCase: CountTasksUseCase,
    private readonly submitForReviewUseCase: SubmitTaskForReviewUseCase,
    private readonly approveTaskUseCase: ApproveTaskUseCase,
    private readonly rejectTaskUseCase: RejectTaskUseCase,
    private readonly markTaskSeenUseCase: MarkTaskSeenUseCase,
    private readonly getTasksWithFiltersUseCase: GetTasksWithFiltersUseCase,
    private readonly getTeamTasksUseCase: GetTeamTasksUseCase,
    private readonly getMyTasksUseCase: GetMyTasksUseCase,
  ) {}

  @Post()
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  async create(
    @Body() input: CreateTaskInputDto,
    @Req() req: any,
  ): Promise<{ task: Task; uploadKey?: string }> {
    return this.createUseCase.execute(
      {
        ...input,
        assignerId: req.user.id,
        assignerRole: req.user.role,
        assignmentType: TaskAssignmentType[input.assignmentType],
        status: input.status ?? TaskStatus.TODO,
      },
      req.user.id,
    );
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Put(':id')
  async update(
    @Body() input: UpdateTaskInputDto,
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ task: Task; uploadKey?: string }> {
    const { completedAt, ...rest } = input;
    return this.updateUseCase.execute(
      id,
      {
        ...rest,
        completedAt: completedAt
          ? new Date(completedAt)
          : (completedAt ?? undefined),
      } as any,
      req.user.id,
    );
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Get(':id')
  async getTask(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<{ task: Task; attachments: { [taskId: string]: string[] } }> {
    return this.getUseCase.execute(id, req.user.id);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Get()
  async getAll(
    @Req() req: any,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<{ tasks: Task[]; attachments: { [taskId: string]: string[] } }> {
    const list = await this.getAllUseCase.execute(
      offset ? parseInt(offset, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      req.user.id,
    );
    return list;
  }

  // Filtered retrieval
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Get('search/filters')
  async getWithFilters(
    @Query() query: GetTasksWithFiltersDto,
    @Req() req: any,
  ): Promise<{ tasks: any[]; attachments: { [taskId: string]: string[] } }> {
    const result = await this.getTasksWithFiltersUseCase.execute(
      {
        ...query,
        // class-transformer handles numeric conversion for offset/limit
      },
      req.user.id,
    );
    return {
      tasks: result.tasks.map((t) => t.toJSON()),
      attachments: result.attachments,
    };
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Get('team-tasks')
  async getTeamTasks(
    @Query() query: GetTeamTasksDto,
    @Req() req: any,
  ): Promise<{ tasks: any[]; attachments: { [taskId: string]: string[] } }> {
    const result = await this.getTeamTasksUseCase.execute(query, req.user.id);
    return {
      tasks: result.tasks.map((t) => t.toJSON()),
      attachments: result.attachments,
    };
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any): Promise<Task | null> {
    return this.deleteUseCase.execute(id, req.user.id);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Get('count/all')
  async count(@Req() req: any): Promise<number> {
    return this.countUseCase.execute(req.user.id);
  }

  // Submit for review
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @Post(':id/submit-review')
  async submitForReview(
    @Param('id') id: string,
    @Body() input: SubmitTaskForReviewInputDto,
    @Req() req: any,
  ): Promise<{ task: Task; uploadKey?: string }> {
    return this.submitForReviewUseCase.execute(
      {
        taskId: id,
        submittedBy: req.user.id,
        notes: input.notes,
      },
      req.user.id,
    );
  }

  // Approve
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() req: any): Promise<Task> {
    return this.approveTaskUseCase.execute({ taskId: id }, req.user.id);
  }

  // Reject
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() input: RejectTaskInputDto,
    @Req() req: any,
  ): Promise<Task> {
    return this.rejectTaskUseCase.execute(
      {
        taskId: id,
        feedback: input.feedback,
      },
      req.user.id,
    );
  }

  // Mark seen
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @Post(':id/seen')
  async markSeen(@Param('id') id: string, @Req() req: any): Promise<Task> {
    return this.markTaskSeenUseCase.execute({ taskId: id }, req.user.id);
  }

  // My tasks endpoint for role-based task retrieval
  @Get('my-tasks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get tasks based on user role and hierarchy' })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully based on user role',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        canSubmitWork: { type: 'array', items: { type: 'boolean' } },
      },
    },
  })
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  async getMyTasks(
    @Req() req: any,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.getMyTasksUseCase.execute({
      userId: req.user.id,
      offset: offset ? parseInt(offset, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });

    return {
      success: true,
      data: result.tasks.map((task) => ({
        ...task.toJSON(),
        canSubmitWork: result.canSubmitWork[result.tasks.indexOf(task)],
      })),
      total: result.total,
      metrics: result.metrics,
      attachments: result.attachments,
    };
  }
}
