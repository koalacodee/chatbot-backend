import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  TaskStatus,
  TaskPriority,
} from '../../domain/entities/task.entity';
import { TaskResponseDto } from './create-task.dto';
import {
  AttachmentResponseDto,
  CursorMetaResponseDto,
  TaskSubmissionResponseDto,
} from './get-all-tasks.dto';
import { CursorDto } from './cursor.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class GetDepartmentLevelTasksRequestDto extends CursorDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class TaskMetricsResponseDto {
  @Expose()
  pendingCount: number;

  @Expose()
  completedCount: number;

  @Expose()
  completionPercentage: number;
}

export class GetDepartmentLevelTasksDataResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskResponseDto)
  tasks: TaskResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskSubmissionResponseDto)
  submissions: TaskSubmissionResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];

  @Expose()
  @ValidateNested()
  @Type(() => TaskMetricsResponseDto)
  metrics: TaskMetricsResponseDto;
}

export class GetDepartmentLevelTasksResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => CursorMetaResponseDto)
  meta: CursorMetaResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => GetDepartmentLevelTasksDataResponseDto)
  data: GetDepartmentLevelTasksDataResponseDto;
}
