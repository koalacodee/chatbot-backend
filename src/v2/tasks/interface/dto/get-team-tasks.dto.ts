import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { TaskStatus } from '../../domain/entities/task.entity';
import { TaskResponseDto } from './create-task.dto';
import {
  AttachmentResponseDto,
  CursorMetaResponseDto,
  TaskSubmissionResponseDto,
} from './get-all-tasks.dto';
import { TaskDelegationSubmissionResponseDto } from './get-my-delegations.dto';
import { CursorDto } from './cursor.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────


export class GetTeamTasksRequestDto extends CursorDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  subDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class GetTeamTasksDataResponseDto {
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
  @Type(() => TaskDelegationSubmissionResponseDto)
  delegationSubmissions: TaskDelegationSubmissionResponseDto[];

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}

export class GetTeamTasksResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => CursorMetaResponseDto)
  meta: CursorMetaResponseDto;

  @Expose()
  @ValidateNested()
  @Type(() => GetTeamTasksDataResponseDto)
  data: GetTeamTasksDataResponseDto;
}
