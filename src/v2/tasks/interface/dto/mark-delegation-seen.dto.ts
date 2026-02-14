import { Expose, Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import { DelegateTaskResponseDto } from './delegate-task.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class MarkDelegationSeenRequestDto {
  @IsUUID()
  delegationId: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class MarkDelegationSeenResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => DelegateTaskResponseDto)
  delegation: DelegateTaskResponseDto;
}
