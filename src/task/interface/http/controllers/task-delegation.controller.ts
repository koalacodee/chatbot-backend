import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  DelegateTaskUseCase,
  SubmitTaskDelegationForReviewUseCase,
  ApproveTaskDelegationUseCase,
  RejectTaskDelegationUseCase,
  ForwardTaskDelegationSubmissionUseCase,
  GetDelegablesUseCase,
  GetMyDelegationsUseCase,
  MarkDelegationSeenUseCase,
} from '../../../application/use-cases';
import {
  DelegateTaskDto,
  SubmitTaskDelegationForReviewDto,
  ApproveTaskDelegationDto,
  RejectTaskDelegationDto,
  DelegationIdDto,
  SubmissionIdDto,
  GetDelegablesQueryDto,
} from '../dto';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

@ApiTags('Task Delegations')
@Controller('task-delegations')
export class TaskDelegationController {
  constructor(
    private readonly delegateTaskUseCase: DelegateTaskUseCase,
    private readonly submitTaskDelegationForReviewUseCase: SubmitTaskDelegationForReviewUseCase,
    private readonly approveTaskDelegationUseCase: ApproveTaskDelegationUseCase,
    private readonly rejectTaskDelegationUseCase: RejectTaskDelegationUseCase,
    private readonly forwardTaskDelegationSubmissionUseCase: ForwardTaskDelegationSubmissionUseCase,
    private readonly getDelegablesUseCase: GetDelegablesUseCase,
    private readonly getMyDelegationsUseCase: GetMyDelegationsUseCase,
    private readonly markDelegationSeenUseCase: MarkDelegationSeenUseCase,
  ) { }

  @Get('delegables')
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Get employees and sub-departments that can be delegated tasks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegables retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getDelegables(
    @Query() query: GetDelegablesQueryDto,
    @Request() req: any,
  ) {
    const result = await this.getDelegablesUseCase.execute(
      req.user.id,
      query.q,
    );
    return {
      employees: result.employees.map((employee) => employee.toJSON()),
      subDepartments: result.subDepartments.map((dept) => dept.toJSON()),
    };
  }

  @Get('my-delegations')
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Get all delegations created by the supervisor with their submissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegations retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getMyDelegations(
    @Request() req: any,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.getMyDelegationsUseCase.execute({
      userId: req.user.id,
      offset: offset ? parseInt(offset, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });

    return {
      success: true,
      delegations: result.delegations.map((delegation) => delegation.toJSON()),
      submissions: Object.fromEntries(
        Object.entries(result.submissions).map(([key, value]) => [
          key,
          value.map((submission) => submission.toJSON()),
        ]),
      ),
      attachments: result.attachments,
      delegationSubmissionAttachments: result.delegationSubmissionAttachments,
      total: result.total,
    };
  }

  @Post()
  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_TASKS)
  @ApiOperation({ summary: 'Delegate a task to an employee or sub-department' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task delegation created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async delegateTask(
    @Body() input: DelegateTaskDto,
    @Request() req: any,
  ) {
    const result = await this.delegateTaskUseCase.execute(
      {
        taskId: input.taskId,
        assigneeId: input.assigneeId,
        targetSubDepartmentId: input.targetSubDepartmentId,
      },
      req.user.id,
    );
    return {
      delegation: result.toJSON(),
    };
  }

  @Post(':delegationId/submit')
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Submit a task delegation for review' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task delegation submitted for review successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async submitForReview(
    @Body() input: SubmitTaskDelegationForReviewDto,
    @Param() { delegationId }: DelegationIdDto,
    @Request() req: any,
  ) {
    const result = await this.submitTaskDelegationForReviewUseCase.execute({
      delegationId,
      submittedBy: req.user.id,
      notes: input.notes,
      attach: input.attach ?? false,
    });
    return {
      delegation: result.delegation.toJSON(),
      submission: result.submission.toJSON(),
      uploadKey: result.uploadKey,
    };
  }

  @Post('submissions/:submissionId/approve')
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Approve a task delegation submission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task delegation submission approved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async approveSubmission(
    @Body() input: ApproveTaskDelegationDto,
    @Param() { submissionId }: SubmissionIdDto,
    @Request() req: any,
  ) {
    const result = await this.approveTaskDelegationUseCase.execute({
      submissionId,
      reviewerId: req.user.id,
      feedback: input.feedback,
    });
    return {
      delegation: result.delegation.toJSON(),
      submission: result.submission.toJSON(),
    };
  }

  @Post('submissions/:submissionId/reject')
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Reject a task delegation submission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task delegation submission rejected successfully',
  })
  @HttpCode(HttpStatus.OK)
  async rejectSubmission(
    @Body() input: RejectTaskDelegationDto,
    @Param() { submissionId }: SubmissionIdDto,
    @Request() req: any,
  ) {
    const result = await this.rejectTaskDelegationUseCase.execute({
      submissionId,
      reviewerId: req.user.id,
      feedback: input.feedback,
    });
    return {
      delegation: result.delegation.toJSON(),
      submission: result.submission.toJSON(),
    };
  }

  @Post('submissions/:submissionId/forward')
  @SupervisorPermissions()
  @ApiOperation({ summary: 'Forward a task delegation submission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task delegation submission forwarded successfully',
  })
  @HttpCode(HttpStatus.OK)
  async forwardSubmission(
    @Param() { submissionId }: SubmissionIdDto,
    @Request() req: any,
  ) {
    const result = await this.forwardTaskDelegationSubmissionUseCase.execute({
      submissionId,
      delegatorUserId: req.user.id,
    });
    return {
      submission: result.toJSON(),
    };
  }

  @Post(':delegationId/seen')
  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @ApiOperation({ summary: 'Mark a task delegation as seen' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task delegation marked as seen successfully',
  })
  @HttpCode(HttpStatus.OK)
  async markSeen(
    @Param() { delegationId }: DelegationIdDto,
    @Request() req: any,
  ) {
    const result = await this.markDelegationSeenUseCase.execute(
      { delegationId },
      req.user.id,
    );
    return {
      delegation: result.toJSON(),
    };
  }
}

