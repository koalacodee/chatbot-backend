import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class ForwardTaskDelegationSubmissionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsUUID()
  targetSupervisorId?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class ForwardTaskDelegationSubmissionResponseDto {
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

  @Expose()
  forwardedMessage?: string;

  @Expose()
  forwardedToSupervisorId?: string;
}
