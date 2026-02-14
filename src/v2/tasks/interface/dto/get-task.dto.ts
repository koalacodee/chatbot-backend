import { Expose, Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import { TaskResponseDto } from './create-task.dto';
import { AttachmentResponseDto, TaskSubmissionResponseDto } from './get-all-tasks.dto';
import { TaskDelegationSubmissionResponseDto } from './get-my-delegations.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class GetTaskRequestDto {
  @IsUUID()
  taskId: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class GetTaskResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskResponseDto)
  task: TaskResponseDto;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskSubmissionResponseDto)
  submissions: TaskSubmissionResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskDelegationSubmissionResponseDto)
  delegationSubmissions: TaskDelegationSubmissionResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}
