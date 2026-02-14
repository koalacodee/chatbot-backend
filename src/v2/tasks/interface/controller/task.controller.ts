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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { EmployeePermissions, SupervisorPermissions } from '@/rbac/decorators';
import { AdminAuth } from '@/rbac/decorators/admin.decorator';
import { EmployeePermissionsEnum } from '@/employee/domain/entities/employee.entity';
import { SupervisorPermissionsEnum } from '@/supervisor/domain/entities/supervisor.entity';
import { ExportFileService } from '@/export/domain/services/export-file.service';

// ── Use Cases ──────────────────────────────────────────────────────────
import {
  // Core Task Management
  CreateTaskUseCase,
  UpdateTaskUseCase,
  DeleteTaskUseCase,
  GetTaskUseCase,
  GetAllTasksUseCase,
  CountTasksUseCase,
  RestartTaskUseCase,
  ExportTasksUseCase,
  // Task Querying & Filtering
  GetMyTasksUseCase,
  GetTeamTasksUseCase,
  GetTeamTasksForSupervisorUseCase,
  GetDepartmentLevelTasksUseCase,
  GetSubDepartmentTasksUseCase,
  GetIndividualLevelTasksUseCase,
  GetTasksWithFiltersUseCase,
  // Task Submission & Review
  SubmitTaskForReviewUseCase,
  SubmitTaskSubmissionUseCase,
  GetTaskSubmissionUseCase,
  ApproveTaskUseCase,
  ApproveTaskSubmissionUseCase,
  RejectTaskUseCase,
  RejectTaskSubmissionUseCase,
  MarkTaskSeenUseCase,
  // Task Delegation
  DelegateTaskUseCase,
  GetMyDelegationsUseCase,
  GetDelegationUseCase,
  GetDelegablesUseCase,
  UpdateDelegationUseCase,
  DeleteDelegationUseCase,
  GetDelegationsForTaskUseCase,
  GetDelegationsForSubDepartmentUseCase,
  GetDelegationsForEmployeeUseCase,
  ApproveTaskDelegationUseCase,
  ForwardTaskDelegationSubmissionUseCase,
  RejectTaskDelegationSubmissionUseCase,
  MarkDelegationSeenUseCase,
  // Task Presets
  SaveTaskPresetUseCase,
  GetTaskPresetsUseCase,
  DeleteTaskPresetUseCase,
  // Task Visibility
  GetTaskVisibilityUseCase,
  GetTasksVisibilityUseCase,
} from '../../application/use-cases';

// ── DTOs ───────────────────────────────────────────────────────────────
import {
  CreateTaskRequestDto,
  CreateTaskResponseDto,
} from '../dto/create-task.dto';
import {
  UpdateTaskRequestDto,
  UpdateTaskResponseDto,
} from '../dto/update-task.dto';
import { GetTaskResponseDto } from '../dto/get-task.dto';
import {
  GetAllTasksRequestDto,
  GetAllTasksResponseDto,
} from '../dto/get-all-tasks.dto';
import { CountTasksResponseDto } from '../dto/count-tasks.dto';
import {
  ExportTasksRequestDto,
  ExportTasksResponseDto,
} from '../dto/export-tasks.dto';
import {
  GetMyTasksRequestDto,
  GetMyTasksResponseDto,
} from '../dto/get-my-tasks.dto';
import {
  GetTeamTasksRequestDto,
  GetTeamTasksResponseDto,
} from '../dto/get-team-tasks.dto';
import {
  GetTeamTasksForSupervisorRequestDto,
  GetTeamTasksForSupervisorResponseDto,
} from '../dto/get-team-tasks-for-supervisor.dto';
import {
  GetDepartmentLevelTasksRequestDto,
  GetDepartmentLevelTasksResponseDto,
} from '../dto/get-department-level-tasks.dto';
import {
  GetSubDepartmentTasksRequestDto,
  GetSubDepartmentTasksResponseDto,
} from '../dto/get-sub-department-tasks.dto';
import {
  GetIndividualLevelTasksRequestDto,
  GetIndividualLevelTasksResponseDto,
} from '../dto/get-individual-level-tasks.dto';
import {
  GetTasksWithFiltersRequestDto,
  GetTasksWithFiltersResponseDto,
} from '../dto/get-tasks-with-filters.dto';
import {
  SubmitTaskForReviewRequestDto,
  SubmitTaskForReviewResponseDto,
} from '../dto/submit-task-for-review.dto';
import {
  SubmitTaskSubmissionRequestDto,
  SubmitTaskSubmissionResponseDto,
} from '../dto/submit-task-submission.dto';
import {
  GetTaskSubmissionResponseDto,
  GetTaskSubmissionsByTaskResponseDto,
} from '../dto/get-task-submission.dto';
import { ApproveTaskRequestDto } from '../dto/approve-task.dto';
import {
  ApproveTaskSubmissionRequestDto,
  ApproveTaskSubmissionResponseDto,
} from '../dto/approve-task-submission.dto';
import {
  RejectTaskRequestDto,
  RejectTaskResponseDto,
} from '../dto/reject-task.dto';
import {
  RejectTaskSubmissionRequestDto,
  RejectTaskSubmissionResponseDto,
} from '../dto/reject-task-submission.dto';
import { MarkTaskSeenResponseDto } from '../dto/mark-task-seen.dto';
import {
  DelegateTaskRequestDto,
  DelegateTaskResponseDto,
} from '../dto/delegate-task.dto';
import {
  GetMyDelegationsRequestDto,
  GetMyDelegationsResponseDto,
} from '../dto/get-my-delegations.dto';
import { GetDelegationResponseDto } from '../dto/get-delegation.dto';
import {
  GetDelegablesRequestDto,
  DelegableResponseDto,
} from '../dto/get-delegables.dto';
import { UpdateDelegationRequestDto } from '../dto/update-delegation.dto';
import {
  GetDelegationsForTaskRequestDto,
  GetDelegationsForTaskResponseDto,
} from '../dto/get-delegations-for-task.dto';
import {
  GetDelegationsForSubDepartmentRequestDto,
  GetDelegationsForSubDepartmentResponseDto,
} from '../dto/get-delegations-for-sub-department.dto';
import {
  GetDelegationsForEmployeeRequestDto,
  GetDelegationsForEmployeeResponseDto,
} from '../dto/get-delegations-for-employee.dto';
import {
  ApproveTaskDelegationRequestDto,
  ApproveTaskDelegationResponseDto,
} from '../dto/approve-task-delegation.dto';
import {
  ForwardTaskDelegationSubmissionRequestDto,
  ForwardTaskDelegationSubmissionResponseDto,
} from '../dto/forward-task-delegation-submission.dto';
import {
  RejectTaskDelegationSubmissionRequestDto,
  RejectTaskDelegationSubmissionResponseDto,
} from '../dto/reject-task-delegation-submission.dto';
import { MarkDelegationSeenResponseDto } from '../dto/mark-delegation-seen.dto';
import {
  SaveTaskPresetRequestDto,
  SaveTaskPresetResponseDto,
} from '../dto/save-task-preset.dto';
import {
  GetTaskPresetsRequestDto,
  GetTaskPresetsResponseDto,
} from '../dto/get-task-presets.dto';
import { GetTaskVisibilityResponseDto } from '../dto/get-task-visibility.dto';
import { GetTasksVisibilityResponseDto } from '../dto/get-tasks-visibility.dto';
import { RestartTaskResponseDto } from '../dto/restart-task.dto';
import { DeleteTaskResponseDto } from '../dto/delete-task.dto';
import { IdDto } from '../dto/Id.dto';
import { TaskIdDto } from '../dto/task-id.dto';
import { SubmissionIdDto } from '../dto/submission-id.dto';
import { SubDepartmentIdDto } from '../dto/sub-department-id.dto';
import { DelegationIdDto } from '../dto/delegation-id.dto';
import { PresetIdDto } from '../dto/preset-id.dto';

@ApiTags('Tasks V2')
@ApiBearerAuth()
@Controller('v2/tasks')
export class TaskController {
  constructor(
    // Core Task Management
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly getTaskUseCase: GetTaskUseCase,
    private readonly getAllTasksUseCase: GetAllTasksUseCase,
    private readonly countTasksUseCase: CountTasksUseCase,
    private readonly restartTaskUseCase: RestartTaskUseCase,
    private readonly exportTasksUseCase: ExportTasksUseCase,
    // Task Querying & Filtering
    private readonly getMyTasksUseCase: GetMyTasksUseCase,
    private readonly getTeamTasksUseCase: GetTeamTasksUseCase,
    private readonly getTeamTasksForSupervisorUseCase: GetTeamTasksForSupervisorUseCase,
    private readonly getDepartmentLevelTasksUseCase: GetDepartmentLevelTasksUseCase,
    private readonly getSubDepartmentTasksUseCase: GetSubDepartmentTasksUseCase,
    private readonly getIndividualLevelTasksUseCase: GetIndividualLevelTasksUseCase,
    private readonly getTasksWithFiltersUseCase: GetTasksWithFiltersUseCase,
    // Task Submission & Review
    private readonly submitTaskForReviewUseCase: SubmitTaskForReviewUseCase,
    private readonly submitTaskSubmissionUseCase: SubmitTaskSubmissionUseCase,
    private readonly getTaskSubmissionUseCase: GetTaskSubmissionUseCase,
    private readonly approveTaskUseCase: ApproveTaskUseCase,
    private readonly approveTaskSubmissionUseCase: ApproveTaskSubmissionUseCase,
    private readonly rejectTaskUseCase: RejectTaskUseCase,
    private readonly rejectTaskSubmissionUseCase: RejectTaskSubmissionUseCase,
    private readonly markTaskSeenUseCase: MarkTaskSeenUseCase,
    // Task Delegation
    private readonly delegateTaskUseCase: DelegateTaskUseCase,
    private readonly getMyDelegationsUseCase: GetMyDelegationsUseCase,
    private readonly getDelegationUseCase: GetDelegationUseCase,
    private readonly getDelegablesUseCase: GetDelegablesUseCase,
    private readonly updateDelegationUseCase: UpdateDelegationUseCase,
    private readonly deleteDelegationUseCase: DeleteDelegationUseCase,
    private readonly getDelegationsForTaskUseCase: GetDelegationsForTaskUseCase,
    private readonly getDelegationsForSubDepartmentUseCase: GetDelegationsForSubDepartmentUseCase,
    private readonly getDelegationsForEmployeeUseCase: GetDelegationsForEmployeeUseCase,
    private readonly approveTaskDelegationUseCase: ApproveTaskDelegationUseCase,
    private readonly forwardTaskDelegationSubmissionUseCase: ForwardTaskDelegationSubmissionUseCase,
    private readonly rejectTaskDelegationSubmissionUseCase: RejectTaskDelegationSubmissionUseCase,
    private readonly markDelegationSeenUseCase: MarkDelegationSeenUseCase,
    // Task Presets
    private readonly saveTaskPresetUseCase: SaveTaskPresetUseCase,
    private readonly getTaskPresetsUseCase: GetTaskPresetsUseCase,
    private readonly deleteTaskPresetUseCase: DeleteTaskPresetUseCase,
    // Task Visibility
    private readonly getTaskVisibilityUseCase: GetTaskVisibilityUseCase,
    private readonly getTasksVisibilityUseCase: GetTasksVisibilityUseCase,
    // External services
    private readonly exportFileService: ExportFileService,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════
  // CORE TASK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created',
    type: CreateTaskResponseDto,
  })
  async createTask(
    @Body() body: CreateTaskRequestDto,
    @Req() req: any,
  ): Promise<CreateTaskResponseDto> {
    const { assigneeId, targetDepartmentId, targetSubDepartmentId, ...rest } =
      body;
    return this.createTaskUseCase.execute(
      {
        ...rest,
        assignee: assigneeId
          ? {
            assigneeId,
            targetDepartmentId: undefined as never,
            targetSubDepartmentId: undefined as never,
          }
          : targetDepartmentId
            ? {
              assigneeId: undefined as never,
              targetDepartmentId,
              targetSubDepartmentId: undefined as never,
            }
            : {
              assigneeId: undefined as never,
              targetDepartmentId: undefined as never,
              targetSubDepartmentId,
            },
        assignerId: req.user.id,
        assignerRole: req.user.role,
      },
      req.user.id,
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated',
    type: UpdateTaskResponseDto,
  })
  async updateTask(
    @Param() { id }: IdDto,
    @Body() body: UpdateTaskRequestDto,
    @Req() req: any,
  ): Promise<UpdateTaskResponseDto> {
    return this.updateTaskUseCase.execute(id, body, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({
    status: 200,
    description: 'Task deleted',
    type: DeleteTaskResponseDto,
  })
  async deleteTask(
    @Param() { id }: IdDto,
    @Req() req: any,
  ): Promise<DeleteTaskResponseDto> {
    const task = await this.deleteTaskUseCase.execute(id, req.user.id);
    return task.toJSON();
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Count all tasks for user' })
  @ApiResponse({
    status: 200,
    description: 'Task count',
    type: CountTasksResponseDto,
  })
  async countTasks(@Req() req: any): Promise<CountTasksResponseDto> {
    const count = await this.countTasksUseCase.execute(req.user.id);
    return { count };
  }

  @Post(':id/restart')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Restart a task' })
  @ApiResponse({
    status: 200,
    description: 'Task restarted',
    type: RestartTaskResponseDto,
  })
  async restartTask(
    @Param() { id }: IdDto,
    @Req() req: any,
  ): Promise<RestartTaskResponseDto> {
    return this.restartTaskUseCase.execute(id, req.user.id);
  }

  @Post('export')
  @HttpCode(HttpStatus.CREATED)
  @AdminAuth()
  @ApiOperation({ summary: 'Export tasks (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tasks exported' })
  async exportTasks(
    @Body() body: ExportTasksRequestDto,
    @Req() req: any,
  ): Promise<ExportTasksResponseDto & { shareKey: string }> {
    const exportEntity = await this.exportTasksUseCase.execute({
      userId: req.user.id,
      batchSize: body.batchSize,
      start: body.start,
      end: body.end,
    });
    const { shareKey } = await this.exportFileService.genShareKey(
      exportEntity.id,
    );
    return { ...exportEntity.toJSON(), shareKey };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TASK QUERYING & FILTERING
  // ═══════════════════════════════════════════════════════════════════════

  @Get('my-tasks')
  @HttpCode(HttpStatus.OK)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Get my tasks (employee)' })
  @ApiResponse({
    status: 200,
    description: 'My tasks retrieved',
    type: GetMyTasksResponseDto,
  })
  async getMyTasks(
    @Query() query: GetMyTasksRequestDto,
    @Req() req: any,
  ): Promise<GetMyTasksResponseDto> {
    return this.getMyTasksUseCase.execute({
      userId: req.user.id,
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
      status: query.status,
      priority: query.priority,
      search: query.search,
      departmentId: query.departmentId,
      subDepartmentId: query.subDepartmentId,
    });
  }

  @Get('team-tasks')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get team tasks' })
  @ApiResponse({
    status: 200,
    description: 'Team tasks retrieved',
    type: GetTeamTasksResponseDto,
  })
  async getTeamTasks(
    @Query() query: GetTeamTasksRequestDto,
    @Req() req: any,
  ): Promise<GetTeamTasksResponseDto> {
    return this.getTeamTasksUseCase.execute({
      userId: req.user.id,
      employeeId: query.employeeId,
      subDepartmentId: query.subDepartmentId,
      departmentId: query.departmentId,
      status: query.status ? [query.status] : undefined,
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
    });
  }

  @Get('team-tasks/supervisor')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get team tasks for supervisor (combined view)' })
  @ApiResponse({
    status: 200,
    description: 'Supervisor team tasks retrieved',
    type: GetTeamTasksForSupervisorResponseDto,
  })
  async getTeamTasksForSupervisor(
    @Query() query: GetTeamTasksForSupervisorRequestDto,
    @Req() req: any,
  ): Promise<GetTeamTasksForSupervisorResponseDto> {
    return this.getTeamTasksForSupervisorUseCase.execute({
      supervisorUserId: req.user.id,
      status: query.status ? [query.status] : undefined,
      priority: query.priority ? [query.priority] : undefined,
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
      search: query.search,
      departmentId: query.departmentId,
      subDepartmentId: query.subDepartmentId,
    });
  }

  @Get('department-level')
  @HttpCode(HttpStatus.OK)
  @AdminAuth()
  @ApiOperation({ summary: 'Get department-level tasks (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Department-level tasks retrieved',
    type: GetDepartmentLevelTasksResponseDto,
  })
  async getDepartmentLevelTasks(
    @Query() query: GetDepartmentLevelTasksRequestDto,
    @Req() req: any,
  ): Promise<GetDepartmentLevelTasksResponseDto> {
    return this.getDepartmentLevelTasksUseCase.execute(
      req.user.id,
      query.departmentId,
      {
        status: query.status ? [query.status] : undefined,
        priority: query.priority ? [query.priority] : undefined,
        search: query.search,
        cursor: {
          cursor: query.cursor,
          pageSize: query.pageSize,
          direction: query.direction,
        },
      },
    );
  }

  @Get('sub-department-level')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get sub-department level tasks' })
  @ApiResponse({
    status: 200,
    description: 'Sub-department tasks retrieved',
    type: GetSubDepartmentTasksResponseDto,
  })
  async getSubDepartmentTasks(
    @Query() query: GetSubDepartmentTasksRequestDto,
    @Req() req: any,
  ): Promise<GetSubDepartmentTasksResponseDto> {
    return this.getSubDepartmentTasksUseCase.execute(
      req.user.id,
      query.subDepartmentId,
      {
        status: query.status ? [query.status] : undefined,
        priority: query.priority ? [query.priority] : undefined,
        search: query.search,
        cursor: {
          cursor: query.cursor,
          pageSize: query.pageSize,
          direction: query.direction,
        },
      },
    );
  }

  @Get('individual-level')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get individual-level (employee) tasks' })
  @ApiResponse({
    status: 200,
    description: 'Individual-level tasks retrieved',
    type: GetIndividualLevelTasksResponseDto,
  })
  async getIndividualLevelTasks(
    @Query() query: GetIndividualLevelTasksRequestDto,
    @Req() req: any,
  ): Promise<GetIndividualLevelTasksResponseDto> {
    return this.getIndividualLevelTasksUseCase.execute(req.user.id, {
      assigneeId: query.assigneeId,
      status: query.status ? [query.status] : undefined,
      priority: query.priority ? [query.priority] : undefined,
      search: query.search,
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
    });
  }

  @Get('search/filters')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get tasks with filters' })
  @ApiResponse({
    status: 200,
    description: 'Filtered tasks retrieved',
    type: GetTasksWithFiltersResponseDto,
  })
  async getTasksWithFilters(
    @Query() query: GetTasksWithFiltersRequestDto,
    @Req() req: any,
  ): Promise<GetTasksWithFiltersResponseDto> {
    return this.getTasksWithFiltersUseCase.execute(req.user.id, {
      status: query.status ? [query.status] : undefined,
      priority: query.priority ? [query.priority] : undefined,
      search: query.search,
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
      start: query.start,
      end: query.end,
      assigneeId: query.assigneeId,
      departmentId: query.departmentId,
    });
  }

  @Get('all')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get all tasks (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'All tasks retrieved',
    type: GetAllTasksResponseDto,
  })
  async getAllTasks(
    @Query() query: GetAllTasksRequestDto,
    @Req() req: any,
  ): Promise<GetAllTasksResponseDto> {
    return this.getAllTasksUseCase.execute(req.user.id, {
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TASK SUBMISSION & REVIEW
  // ═══════════════════════════════════════════════════════════════════════

  @Post(':taskId/submit-review')
  @HttpCode(HttpStatus.CREATED)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Submit a task for review' })
  @ApiResponse({
    status: 201,
    description: 'Task submitted for review',
    type: SubmitTaskForReviewResponseDto,
  })
  async submitTaskForReview(
    @Param() { taskId }: TaskIdDto,
    @Body() body: SubmitTaskForReviewRequestDto,
    @Req() req: any,
  ): Promise<SubmitTaskForReviewResponseDto> {
    return this.submitTaskForReviewUseCase.execute({
      taskId,
      submittedBy: req.user.id,
      notes: body.notes,
      attach: body.attach,
      chooseAttachments: body.chooseAttachments,
    });
  }

  @Post(':taskId/approve')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Approve a task' })
  @ApiResponse({ status: 200, description: 'Task approved' })
  async approveTask(
    @Param() { taskId }: TaskIdDto,
    @Body() body: ApproveTaskRequestDto,
    @Req() req: any,
  ): Promise<void> {
    return this.approveTaskUseCase.execute(taskId, req.user.id, body.feedback);
  }

  @Post(':taskId/reject')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Reject a task' })
  @ApiResponse({
    status: 200,
    description: 'Task rejected',
    type: RejectTaskResponseDto,
  })
  async rejectTask(
    @Param() { taskId }: TaskIdDto,
    @Body() body: RejectTaskRequestDto,
    @Req() req: any,
  ): Promise<RejectTaskResponseDto> {
    return this.rejectTaskUseCase.execute(taskId, req.user.id, body.reason);
  }

  @Post(':taskId/seen')
  @HttpCode(HttpStatus.OK)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Mark a task as seen' })
  @ApiResponse({
    status: 200,
    description: 'Task marked as seen',
    type: MarkTaskSeenResponseDto,
  })
  async markTaskSeen(
    @Param() { taskId }: TaskIdDto,
    @Req() req: any,
  ): Promise<MarkTaskSeenResponseDto> {
    return this.markTaskSeenUseCase.execute({ taskId }, req.user.id);
  }

  // ── Task Submissions ─────────────────────────────────────────────────

  @Post('submissions/:taskId')
  @HttpCode(HttpStatus.CREATED)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Submit a task submission' })
  @ApiResponse({
    status: 201,
    description: 'Task submission created',
    type: SubmitTaskSubmissionResponseDto,
  })
  async submitTaskSubmission(
    @Param() { taskId }: TaskIdDto,
    @Body() body: SubmitTaskSubmissionRequestDto,
    @Req() req: any,
  ): Promise<SubmitTaskSubmissionResponseDto> {
    return this.submitTaskSubmissionUseCase.execute({
      taskId,
      submittedBy: req.user.id,
      notes: body.notes,
      attach: body.attach,
      chooseAttachments: body.chooseAttachments,
    });
  }

  @Post('submissions/:submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Approve a task submission' })
  @ApiResponse({
    status: 200,
    description: 'Task submission approved',
    type: ApproveTaskSubmissionResponseDto,
  })
  async approveTaskSubmission(
    @Param() { submissionId }: SubmissionIdDto,
    @Body() body: ApproveTaskSubmissionRequestDto,
    @Req() req: any,
  ): Promise<ApproveTaskSubmissionResponseDto> {
    const result = await this.approveTaskSubmissionUseCase.execute(
      submissionId,
      req.user.id,
      body.feedback,
    );
    return result.toJSON();
  }

  @Post('submissions/:submissionId/reject')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Reject a task submission' })
  @ApiResponse({
    status: 200,
    description: 'Task submission rejected',
    type: RejectTaskSubmissionResponseDto,
  })
  async rejectTaskSubmission(
    @Param() { submissionId }: SubmissionIdDto,
    @Body() body: RejectTaskSubmissionRequestDto,
    @Req() req: any,
  ): Promise<RejectTaskSubmissionResponseDto> {
    return this.rejectTaskSubmissionUseCase.execute(
      submissionId,
      req.user.id,
      body.reason,
    );
  }

  @Get('submissions/:submissionId')
  @HttpCode(HttpStatus.OK)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Get a task submission by ID' })
  @ApiResponse({
    status: 200,
    description: 'Task submission retrieved',
    type: GetTaskSubmissionResponseDto,
  })
  async getTaskSubmission(
    @Param() { submissionId }: SubmissionIdDto,
    @Req() req: any,
  ): Promise<GetTaskSubmissionResponseDto> {
    return this.getTaskSubmissionUseCase.execute(submissionId, req.user.id);
  }

  @Get('submissions/task/:taskId')
  @HttpCode(HttpStatus.OK)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Get all submissions for a task' })
  @ApiResponse({
    status: 200,
    description: 'Task submissions retrieved',
    type: GetTaskSubmissionsByTaskResponseDto,
  })
  async getTaskSubmissionsByTask(
    @Param() { taskId }: TaskIdDto,
    @Req() req: any,
  ): Promise<GetTaskSubmissionsByTaskResponseDto> {
    return this.getTaskSubmissionUseCase.executeByTaskId(taskId, req.user.id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TASK DELEGATION
  // ═══════════════════════════════════════════════════════════════════════

  @Post('delegations')
  @HttpCode(HttpStatus.CREATED)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Delegate a task' })
  @ApiResponse({
    status: 201,
    description: 'Task delegated',
    type: DelegateTaskResponseDto,
  })
  async delegateTask(
    @Body() body: DelegateTaskRequestDto,
    @Req() req: any,
  ): Promise<DelegateTaskResponseDto> {
    const delegation = await this.delegateTaskUseCase.execute(
      {
        taskId: body.taskId,
        assigneeId: body.assigneeId,
        targetSubDepartmentId: body.targetSubDepartmentId,
      },
      req.user.id,
    );
    return delegation.toJSON();
  }

  @Get('delegations/delegables')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Get delegable employees and sub-departments' })
  @ApiResponse({
    status: 200,
    description: 'Delegables retrieved',
    type: [DelegableResponseDto],
  })
  async getDelegables(
    @Query() query: GetDelegablesRequestDto,
    @Req() req: any,
  ): Promise<DelegableResponseDto[]> {
    return this.getDelegablesUseCase.execute(
      req.user.id,
      req.user.role,
      query.search,
    );
  }

  @Get('delegations/my')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Get my delegations (supervisor)' })
  @ApiResponse({
    status: 200,
    description: 'My delegations retrieved',
    type: GetMyDelegationsResponseDto,
  })
  async getMyDelegations(
    @Query() query: GetMyDelegationsRequestDto,
    @Req() req: any,
  ): Promise<GetMyDelegationsResponseDto> {
    return this.getMyDelegationsUseCase.execute(req.user.id, {
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
      status: query.status ? [query.status] : undefined,
    });
  }

  @Get('delegations/employee')
  @HttpCode(HttpStatus.OK)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Get delegations assigned to employee' })
  @ApiResponse({
    status: 200,
    description: 'Employee delegations retrieved',
    type: GetDelegationsForEmployeeResponseDto,
  })
  async getDelegationsForEmployee(
    @Query() query: GetDelegationsForEmployeeRequestDto,
    @Req() req: any,
  ): Promise<GetDelegationsForEmployeeResponseDto> {
    return this.getDelegationsForEmployeeUseCase.execute(req.user.id, {
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
      status: query.status ? [query.status] : undefined,
    });
  }

  @Get('delegations/task/:taskId')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get delegations for a specific task' })
  @ApiResponse({
    status: 200,
    description: 'Task delegations retrieved',
    type: GetDelegationsForTaskResponseDto,
  })
  async getDelegationsForTask(
    @Param() { taskId }: TaskIdDto,
    @Query() query: GetDelegationsForTaskRequestDto,
  ): Promise<GetDelegationsForTaskResponseDto> {
    return this.getDelegationsForTaskUseCase.execute(taskId, {
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
      status: query.status ? [query.status] : undefined,
    });
  }

  @Get('delegations/sub-department/:subDepartmentId')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get delegations for a sub-department' })
  @ApiResponse({
    status: 200,
    description: 'Sub-department delegations retrieved',
    type: GetDelegationsForSubDepartmentResponseDto,
  })
  async getDelegationsForSubDepartment(
    @Param() { subDepartmentId }: SubDepartmentIdDto,
    @Query() query: GetDelegationsForSubDepartmentRequestDto,
  ): Promise<GetDelegationsForSubDepartmentResponseDto> {
    return this.getDelegationsForSubDepartmentUseCase.execute(subDepartmentId, {
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
      status: query.status ? [query.status] : undefined,
    });
  }

  @Get('delegations/:delegationId')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Get a specific delegation' })
  @ApiResponse({
    status: 200,
    description: 'Delegation retrieved',
    type: GetDelegationResponseDto,
  })
  async getDelegation(
    @Param() { delegationId }: DelegationIdDto,
    @Req() req: any,
  ): Promise<GetDelegationResponseDto> {
    return this.getDelegationUseCase.execute(delegationId, req.user.id);
  }

  @Put('delegations/:delegationId')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Update a delegation' })
  @ApiResponse({ status: 200, description: 'Delegation updated' })
  async updateDelegation(
    @Param() { delegationId }: DelegationIdDto,
    @Body() body: UpdateDelegationRequestDto,
    @Req() req: any,
  ): Promise<void> {
    return this.updateDelegationUseCase.execute(delegationId, req.user.id, {
      status: body.status,
    });
  }

  @Delete('delegations/:delegationId')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Delete a delegation' })
  @ApiResponse({ status: 200, description: 'Delegation deleted' })
  async deleteDelegation(
    @Param() { delegationId }: DelegationIdDto,
    @Req() req: any,
  ): Promise<void> {
    return this.deleteDelegationUseCase.execute(delegationId, req.user.id);
  }

  @Post('delegations/:delegationId/seen')
  @HttpCode(HttpStatus.OK)
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Mark a delegation as seen' })
  @ApiResponse({
    status: 200,
    description: 'Delegation marked as seen',
    type: MarkDelegationSeenResponseDto,
  })
  async markDelegationSeen(
    @Param() { delegationId }: DelegationIdDto,
    @Req() req: any,
  ): Promise<MarkDelegationSeenResponseDto> {
    return this.markDelegationSeenUseCase.execute(
      { delegationId },
      req.user.id,
    );
  }

  // ── Delegation Submissions ───────────────────────────────────────────

  @Post('delegations/submissions/:submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Approve a delegation submission' })
  @ApiResponse({
    status: 200,
    description: 'Delegation submission approved',
    type: ApproveTaskDelegationResponseDto,
  })
  async approveDelegationSubmission(
    @Param() { submissionId }: SubmissionIdDto,
    @Body() body: ApproveTaskDelegationRequestDto,
    @Req() req: any,
  ): Promise<ApproveTaskDelegationResponseDto> {
    return this.approveTaskDelegationUseCase.execute({
      submissionId,
      reviewerId: req.user.id,
      feedback: body.feedback,
    });
  }

  @Post('delegations/submissions/:submissionId/reject')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Reject a delegation submission' })
  @ApiResponse({
    status: 200,
    description: 'Delegation submission rejected',
    type: RejectTaskDelegationSubmissionResponseDto,
  })
  async rejectDelegationSubmission(
    @Param() { submissionId }: SubmissionIdDto,
    @Body() body: RejectTaskDelegationSubmissionRequestDto,
    @Req() req: any,
  ): Promise<RejectTaskDelegationSubmissionResponseDto> {
    return this.rejectTaskDelegationSubmissionUseCase.execute({
      submissionId,
      reviewerId: req.user.id,
      feedback: body.feedback,
    });
  }

  @Post('delegations/submissions/:submissionId/forward')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Forward a delegation submission' })
  @ApiResponse({
    status: 200,
    description: 'Delegation submission forwarded',
    type: ForwardTaskDelegationSubmissionResponseDto,
  })
  async forwardDelegationSubmission(
    @Param() { submissionId }: SubmissionIdDto,
    @Body() body: ForwardTaskDelegationSubmissionRequestDto,
    @Req() req: any,
  ): Promise<ForwardTaskDelegationSubmissionResponseDto> {
    const result = await this.forwardTaskDelegationSubmissionUseCase.execute({
      submissionId,
      delegatorUserId: req.user.id,
      message: body.message,
      targetSupervisorId: body.targetSupervisorId,
    });
    return result.toJSON();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TASK PRESETS
  // ═══════════════════════════════════════════════════════════════════════

  @Post('presets')
  @HttpCode(HttpStatus.CREATED)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Save a task as a preset' })
  @ApiResponse({
    status: 201,
    description: 'Task preset created',
    type: SaveTaskPresetResponseDto,
  })
  async saveTaskPreset(
    @Body() body: SaveTaskPresetRequestDto,
    @Req() req: any,
  ): Promise<SaveTaskPresetResponseDto> {
    return this.saveTaskPresetUseCase.execute({
      taskId: body.taskId,
      presetName: body.presetName,
      userId: req.user.id,
    });
  }

  @Get('presets')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get task presets' })
  @ApiResponse({
    status: 200,
    description: 'Task presets retrieved',
    type: GetTaskPresetsResponseDto,
  })
  async getTaskPresets(
    @Query() query: GetTaskPresetsRequestDto,
    @Req() req: any,
  ): Promise<GetTaskPresetsResponseDto> {
    return this.getTaskPresetsUseCase.execute({
      userId: req.user.id,
      cursor: {
        cursor: query.cursor,
        pageSize: query.pageSize,
        direction: query.direction,
      },
    });
  }

  @Delete('presets/:presetId')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Delete a task preset' })
  @ApiResponse({ status: 200, description: 'Task preset deleted' })
  async deleteTaskPreset(
    @Param() { presetId }: PresetIdDto,
    @Req() req: any,
  ): Promise<void> {
    return this.deleteTaskPresetUseCase.execute(presetId, req.user.id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TASK VISIBILITY
  // ═══════════════════════════════════════════════════════════════════════

  @Get('visibility')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({
    summary: 'Get visible departments and sub-departments for task management',
  })
  @ApiResponse({
    status: 200,
    description: 'Task visibility retrieved',
    type: GetTasksVisibilityResponseDto,
  })
  async getTasksVisibility(
    @Req() req: any,
  ): Promise<GetTasksVisibilityResponseDto> {
    return this.getTasksVisibilityUseCase.execute(req.user.id);
  }

  @Get(':taskId/visibility')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get visibility permissions for a specific task' })
  @ApiResponse({
    status: 200,
    description: 'Task visibility retrieved',
    type: GetTaskVisibilityResponseDto,
  })
  async getTaskVisibility(
    @Param() { taskId }: TaskIdDto,
    @Req() req: any,
  ): Promise<GetTaskVisibilityResponseDto> {
    return this.getTaskVisibilityUseCase.execute(taskId, req.user.id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GET SINGLE TASK (must be last to avoid route conflicts with :id)
  // ═══════════════════════════════════════════════════════════════════════

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Get a single task by ID' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved',
    type: GetTaskResponseDto,
  })
  async getTask(
    @Param() { id }: IdDto,
    @Req() req: any,
  ): Promise<GetTaskResponseDto> {
    return this.getTaskUseCase.execute(id, req.user.id);
  }
}
