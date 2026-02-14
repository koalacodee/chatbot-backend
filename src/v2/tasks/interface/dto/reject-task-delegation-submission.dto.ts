import { Expose, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DelegateTaskResponseDto } from './delegate-task.dto';
import { TaskDelegationSubmissionResponseDto } from './get-my-delegations.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class RejectTaskDelegationSubmissionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class RejectTaskDelegationSubmissionResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => DelegateTaskResponseDto)
  delegation: DelegateTaskResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => TaskDelegationSubmissionResponseDto)
  submission: TaskDelegationSubmissionResponseDto;
}
