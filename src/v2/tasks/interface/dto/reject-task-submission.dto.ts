import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class RejectTaskSubmissionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class RejectTaskSubmissionResponseDto {
  @Expose()
  id: string;

  @Expose()
  taskId?: string;

  @Expose()
  delegationSubmissionId?: string;

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
}
