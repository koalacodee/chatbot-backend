import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DelegateTaskResponseDto } from './delegate-task.dto';
import {
  AttachmentResponseDto,
  CursorMetaResponseDto,
} from './get-all-tasks.dto';
import { CursorDto } from './cursor.dto';
import { TaskStatus } from '../../domain/entities/task.entity';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────


export class GetMyDelegationsRequestDto extends CursorDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class TaskDelegationSubmissionResponseDto {
  @Expose()
  id: string;

  @Expose()
  delegationId: string;

  @Expose()
  taskId: string;

  @Expose()
  performerId: string;

  @Expose()
  performerType: string;

  @Expose()
  performerName?: string;

  @Expose()
  notes?: string;

  @Expose()
  feedback?: string;

  @Expose()
  status: string;

  @Expose()
  submittedAt: Date;

  @Expose()
  reviewedAt?: Date;

  @Expose()
  reviewedByAdminId?: string;

  @Expose()
  reviewedBySupervisorId?: string;

  @Expose()
  forwarded: boolean;
}

export class GetMyDelegationsDataResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => DelegateTaskResponseDto)
  delegations: DelegateTaskResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskDelegationSubmissionResponseDto)
  submissions: TaskDelegationSubmissionResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}

export class GetMyDelegationsResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => CursorMetaResponseDto)
  meta: CursorMetaResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => GetMyDelegationsDataResponseDto)
  data: GetMyDelegationsDataResponseDto;
}
