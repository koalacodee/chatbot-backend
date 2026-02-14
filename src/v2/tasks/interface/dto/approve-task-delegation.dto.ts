import { Expose, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class ApproveTaskDelegationRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class TaskDelegationDto {
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
}

export class TaskDelegationSubmissionDto {
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

export class ApproveTaskDelegationResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskDelegationDto)
  delegation: TaskDelegationDto;

  @Expose()
  @ValidateNested()
  @Type(() => TaskDelegationSubmissionDto)
  submission: TaskDelegationSubmissionDto;
}
