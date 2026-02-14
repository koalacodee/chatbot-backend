import { Expose } from 'class-transformer';

// ──────────────────────────────────────────────
// Request: no body (userId resolved from auth context)
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class GetTasksVisibilityResponseDto {
  @Expose()
  visibleDepartmentIds: string[];

  @Expose()
  visibleSubDepartmentIds: string[];
}
