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
  SaveTaskPresetUseCase,
  GetTaskPresetsUseCase,
  CreateTaskFromPresetUseCase,
  ExportTasksUseCase,
} from '../../application/use-cases';
import {
  CreateTaskInputDto,
  UpdateTaskInputDto,
  GetTasksWithFiltersDto,
  SubmitTaskSubmissionInputDto,
  RejectTaskSubmissionInputDto,
  SaveTaskPresetDto,
  CreateTaskFromPresetDto,
} from './dto';
import { ExportTasksDto } from './dto/export-tasks.dto';
import { GetTeamTasksDto } from './dto/get-team-tasks.dto';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { TaskStatus } from '@prisma/client';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import { EmployeePermissionsEnum as EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { SupervisorPermissionsEnum as SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { TaskIdDto } from './dto/task-id.dto';
import { ExportFileService } from 'src/export/domain/services/export-file.service';
import { TaskSubmission } from 'src/task/domain/entities/task-submission.entity';
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
    private readonly saveTaskPresetUseCase: SaveTaskPresetUseCase,
    private readonly getTaskPresetsUseCase: GetTaskPresetsUseCase,
    private readonly createTaskFromPresetUseCase: CreateTaskFromPresetUseCase,
    private readonly exportTasksUseCase: ExportTasksUseCase,
    private readonly exportFileService: ExportFileService,
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
        savePreset: input.savePreset,
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
  @Post(':taskId/submit-review')
  async submitForReview(
    @Param() { taskId }: TaskIdDto,
    @Body() input: SubmitTaskSubmissionInputDto,
    @Req() req: any,
  ): Promise<{
    submission: ReturnType<typeof TaskSubmission.prototype.toJSON>;
    uploadKey?: string;
    fileHubUploadKey?: string;
  }> {
    return this.submitForReviewUseCase.execute({
      ...input,
      taskId,
      submittedBy: req.user.id,
    });
  }

  // Approve
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Post(':taskId/approve')
  async approve(
    @Param() { taskId }: TaskIdDto,
    @Req() req: any,
  ): Promise<Task> {
    return this.approveTaskUseCase.execute({ taskId }, req.user.id);
  }

  // Reject
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Post(':id/reject')
  async reject(
    @Param() { taskId }: TaskIdDto,
    @Body() input: RejectTaskSubmissionInputDto,
    @Req() req: any,
  ): Promise<Task> {
    return this.rejectTaskUseCase.execute(
      {
        taskId,
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
        fileHubAttachments: { type: 'array', items: { type: 'object' } },
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
      delegations: result.delegations?.map((delegation) => delegation.toJSON()),
      total: result.total,
      metrics: result.metrics,
      attachments: result.attachments,
      delegationAttachments: result?.delegationAttachments,
      fileHubAttachments: result.fileHubAttachments,
    };
  }

  // Task Preset endpoints
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Post('presets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a task as a preset' })
  @ApiResponse({
    status: 201,
    description: 'Task preset created successfully',
  })
  async saveTaskPreset(
    @Body() input: SaveTaskPresetDto,
    @Req() req: any,
  ): Promise<{ preset: any }> {
    const result = await this.saveTaskPresetUseCase.execute({
      taskId: input.taskId,
      presetName: input.presetName,
      userId: req.user.id,
    });

    return {
      preset: result.preset.toJSON(),
    };
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Get('presets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user task presets' })
  @ApiResponse({
    status: 200,
    description: 'Task presets retrieved successfully',
  })
  async getTaskPresets(
    @Req() req: any,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ): Promise<{ presets: any[]; total: number }> {
    const result = await this.getTaskPresetsUseCase.execute({
      userId: req.user.id,
      offset: offset ? parseInt(offset, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      presets: result.presets.map((preset) => preset.toJSON()),
      total: result.total,
    };
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @Post('from-preset')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task from a preset' })
  @ApiResponse({
    status: 201,
    description: 'Task created from preset successfully',
  })
  async createTaskFromPreset(
    @Body() input: CreateTaskFromPresetDto,
    @Req() req: any,
  ): Promise<{ task: Task; uploadKey?: string; fileHubUploadKey?: string }> {
    return this.createTaskFromPresetUseCase.execute({
      presetId: input.presetId,
      assignerId: req.user.id,
      assignerRole: req.user.role,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      assigneeId: input.assigneeId,
      approverId: input.approverId,
      assignmentType: input.assignmentType,
      targetDepartmentId: input.targetDepartmentId,
      targetSubDepartmentId: input.targetSubDepartmentId,
      priority: input.priority,
      attach: input.attach,
      reminderInterval: input.reminderInterval,
    });
  }

  @AdminAuth()
  @Post('export')
  async exportTasks(@Body() body: ExportTasksDto) {
    const exportEntity = await this.exportTasksUseCase.execute({
      start: body.start,
      end: body.end,
    });
    const { shareKey } = await this.exportFileService.genShareKey(
      exportEntity.id,
    );
    return { ...exportEntity.toJSON(), shareKey };
  }
}
