import { Expose, Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import { DelegateTaskResponseDto } from './delegate-task.dto';
import { AttachmentResponseDto } from './get-all-tasks.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class GetDelegationRequestDto {
  @IsUUID()
  delegationId: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class GetDelegationResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => DelegateTaskResponseDto)
  delegation: DelegateTaskResponseDto;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => AttachmentResponseDto)
  attachments: AttachmentResponseDto[];
}
