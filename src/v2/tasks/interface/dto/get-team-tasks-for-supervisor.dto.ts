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
import { TaskDelegationSubmissionResponseDto } from './get-my-delegations.dto';
import { MyTasksMetricsResponseDto } from './get-my-tasks.dto';
import { CursorDto } from './cursor.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────


export class GetTeamTasksForSupervisorRequestDto extends CursorDto {
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

export class SupervisorTeamTaskItemResponseDto {
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
  rejectionReason?: string;

  @Expose()
  approvalFeedback?: string;
}

export class GetTeamTasksForSupervisorDataResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => SupervisorTeamTaskItemResponseDto)
  tasks: SupervisorTeamTaskItemResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];

  @Expose()
  @ValidateNested()
  @Type(() => MyTasksMetricsResponseDto)
  metrics: MyTasksMetricsResponseDto;
}

export class GetTeamTasksForSupervisorResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => CursorMetaResponseDto)
  meta: CursorMetaResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => GetTeamTasksForSupervisorDataResponseDto)
  data: GetTeamTasksForSupervisorDataResponseDto;
}
