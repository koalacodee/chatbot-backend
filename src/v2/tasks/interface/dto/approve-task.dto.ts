import { IsOptional, IsString, MaxLength } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class ApproveTaskRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

// ──────────────────────────────────────────────
// Response: void (use case returns Promise<void>)
// ──────────────────────────────────────────────
