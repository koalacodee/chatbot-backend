import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class GetTaskVisibilityRequestDto {
  @IsUUID()
  taskId: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class GetTaskVisibilityResponseDto {
  @Expose()
  canView: boolean;

  @Expose()
  canEdit: boolean;

  @Expose()
  canDelete: boolean;
}
