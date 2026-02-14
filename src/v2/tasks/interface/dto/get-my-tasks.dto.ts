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
import { AttachmentResponseDto } from './get-all-tasks.dto';
import { DelegateTaskResponseDto } from './delegate-task.dto';
import { CursorDto } from './cursor.dto';
// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────


export class GetMyTasksRequestDto extends CursorDto {
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
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  subDepartmentId?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class MyTaskItemResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskResponseDto)
  task: TaskResponseDto;

  @Expose()
  rejectionReason?: string;

  @Expose()
  approvalFeedback?: string;
}

export class MyTasksMetricsResponseDto {
  @Expose()
  pendingTasks: number;

  @Expose()
  completedTasks: number;

  @Expose()
  taskCompletionPercentage: number;
}

export class GetMyTasksResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => MyTaskItemResponseDto)
  data: MyTaskItemResponseDto[];

  @Expose()
  meta: any;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => DelegateTaskResponseDto)
  delegations?: DelegateTaskResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  fileHubAttachments: AttachmentResponseDto[];

  @Expose()
  @ValidateNested()
  @Type(() => MyTasksMetricsResponseDto)
  metrics: MyTasksMetricsResponseDto;
}
