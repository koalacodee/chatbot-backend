import { Controller, Post, Get, Body, Param, Request } from '@nestjs/common';
import { SubmitTaskSubmissionUseCase } from '../../../application/use-cases/submit-task-submission.use-case';
import { ApproveTaskSubmissionUseCase } from '../../../application/use-cases/approve-task-submission.use-case';
import { RejectTaskSubmissionUseCase } from '../../../application/use-cases/reject-task-submission.use-case';
import { GetTaskSubmissionUseCase } from '../../../application/use-cases/get-task-submission.use-case';
import { SubmitTaskSubmissionInputDto } from '../dto/submit-task-submission.dto';
import { ApproveTaskSubmissionInputDto } from '../dto/approve-task-submission.dto';
import { RejectTaskSubmissionInputDto } from '../dto/reject-task-submission.dto';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { TaskIdDto } from '../dto/task-id.dto';

@Controller('task/submission')
export class TaskSubmissionController {
  constructor(
    private readonly submitTaskSubmissionUseCase: SubmitTaskSubmissionUseCase,
    private readonly approveTaskSubmissionUseCase: ApproveTaskSubmissionUseCase,
    private readonly rejectTaskSubmissionUseCase: RejectTaskSubmissionUseCase,
    private readonly getTaskSubmissionUseCase: GetTaskSubmissionUseCase,
  ) {}

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @Post(':taskId')
  async submitTaskSubmission(
    @Body() input: SubmitTaskSubmissionInputDto,
    @Request() req: any,
    @Param() { taskId }: TaskIdDto,
  ) {
    const result = await this.submitTaskSubmissionUseCase.execute({
      ...input,
      submittedBy: req.user.id,
      taskId,
    });
    return {
      taskSubmission: result.taskSubmission.toJSON(),
      uploadKey: result.uploadKey,
      attachments: result.attachments,
    };
  }

  @SupervisorPermissions()
  @Post('approve')
  async approveTaskSubmission(
    @Body() input: ApproveTaskSubmissionInputDto,
    @Request() req: any,
  ) {
    const result = await this.approveTaskSubmissionUseCase.execute(
      input,
      req.user.id,
    );
    return {
      taskSubmission: result.taskSubmission.toJSON(),
      attachments: result.attachments,
    };
  }

  @SupervisorPermissions()
  @Post('reject')
  async rejectTaskSubmission(
    @Body() input: RejectTaskSubmissionInputDto,
    @Request() req: any,
  ) {
    const result = await this.rejectTaskSubmissionUseCase.execute(
      input,
      req.user.id,
    );
    return {
      taskSubmission: result.taskSubmission.toJSON(),
      attachments: result.attachments,
    };
  }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @Get(':id')
  async getTaskSubmission(@Param('id') id: string) {
    const result = await this.getTaskSubmissionUseCase.execute(id);
    return {
      taskSubmission: result.taskSubmission.toJSON(),
      attachments: result.attachments,
    };
  }

  @EmployeePermissions(EmployeePermissionsEnum.HANDLE_TASKS)
  @Get('task/:taskId')
  async getTaskSubmissionByTaskId(@Param('taskId') taskId: string) {
    const result = await this.getTaskSubmissionUseCase.executeByTaskId(taskId);
    return {
      taskSubmissions: result.taskSubmissions.map((submission) =>
        submission.toJSON(),
      ),
      attachments: result.attachments,
    };
  }
}
