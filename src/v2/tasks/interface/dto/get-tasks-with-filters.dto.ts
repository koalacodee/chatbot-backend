import { Expose, Type } from 'class-transformer';
import {
  IsDate,
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
} from './get-all-tasks.dto';
import { CursorDto } from './cursor.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────


export class GetTasksWithFiltersRequestDto extends CursorDto {
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

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end?: Date;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class GetTasksWithFiltersDataResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskResponseDto)
  tasks: TaskResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}

export class GetTasksWithFiltersResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => CursorMetaResponseDto)
  meta: CursorMetaResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => GetTasksWithFiltersDataResponseDto)
  data: GetTasksWithFiltersDataResponseDto;
}
