import { IsUUID } from 'class-validator';
import { TaskResponseDto } from './create-task.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class RestartTaskRequestDto {
  @IsUUID()
  taskId: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class RestartTaskResponseDto extends TaskResponseDto {}
