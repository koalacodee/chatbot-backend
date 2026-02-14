import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class ApproveTaskSubmissionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class ApproveTaskSubmissionResponseDto {
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
