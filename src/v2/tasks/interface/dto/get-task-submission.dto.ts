import { Expose, Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import { AttachmentResponseDto, TaskSubmissionResponseDto } from './get-all-tasks.dto';
import { TaskDelegationSubmissionResponseDto } from './get-my-delegations.dto';

// ──────────────────────────────────────────────
// Request (by submission ID)
// ──────────────────────────────────────────────

export class GetTaskSubmissionRequestDto {
  @IsUUID()
  submissionId: string;
}

// ──────────────────────────────────────────────
// Request (by task ID)
// ──────────────────────────────────────────────

export class GetTaskSubmissionsByTaskRequestDto {
  @IsUUID()
  taskId: string;
}

// ──────────────────────────────────────────────
// Response (single submission)
// ──────────────────────────────────────────────

export class GetTaskSubmissionResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskSubmissionResponseDto)
  submission: TaskSubmissionResponseDto;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}

// ──────────────────────────────────────────────
// Response (submissions by task ID)
// ──────────────────────────────────────────────

export class GetTaskSubmissionsByTaskResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskSubmissionResponseDto)
  taskSubmissions: TaskSubmissionResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskDelegationSubmissionResponseDto)
  delegationSubmissions: TaskDelegationSubmissionResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}
