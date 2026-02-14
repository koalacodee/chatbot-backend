import { Expose, Type } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';
import { TaskResponseDto } from './create-task.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class DelegateTaskRequestDto {
  @IsUUID()
  taskId: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  targetSubDepartmentId?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class DelegateTaskResponseDto {
  @Expose()
  id: string;

  @Expose()
  taskId: string;

  @Expose()
  delegatorId: string;

  @Expose()
  assigneeId?: string;

  @Expose()
  targetSubDepartmentId?: string;

  @Expose()
  status: string;

  @Expose()
  assignmentType: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  completedAt?: Date;

  @Expose()
  @Type(() => TaskResponseDto)
  task?: TaskResponseDto;
}
