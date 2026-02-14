import { IsUUID } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class DeleteTaskPresetRequestDto {
  @IsUUID()
  presetId: string;
}

// ──────────────────────────────────────────────
// Response: void (use case returns Promise<void>)
// ──────────────────────────────────────────────
