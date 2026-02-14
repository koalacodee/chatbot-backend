import { IsUUID } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class DeleteDelegationRequestDto {
  @IsUUID()
  delegationId: string;
}

// ──────────────────────────────────────────────
// Response: void (use case returns Promise<void>)
// ──────────────────────────────────────────────
