import { IsOptional, IsString } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class UpdateDelegationRequestDto {
  @IsOptional()
  @IsString()
  status?: string;
}

// ──────────────────────────────────────────────
// Response: void (use case returns Promise<void>)
// ──────────────────────────────────────────────
