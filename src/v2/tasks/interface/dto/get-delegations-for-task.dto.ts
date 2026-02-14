import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
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

export class GetDelegationsForTaskRequestDto extends CursorDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class GetDelegationsForTaskDataResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => DelegateTaskResponseDto)
  delegations: DelegateTaskResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}

export class GetDelegationsForTaskResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => CursorMetaResponseDto)
  meta: CursorMetaResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => GetDelegationsForTaskDataResponseDto)
  data: GetDelegationsForTaskDataResponseDto;
}
