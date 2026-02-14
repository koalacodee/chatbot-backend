import { Expose, Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import {
  TaskReminderResponseDto,
  TaskResponseDto,
} from './create-task.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class DeleteTaskRequestDto {
  @IsUUID()
  taskId: string;
}

// ──────────────────────────────────────────────
// Response (returns the deleted Task)
// ──────────────────────────────────────────────

export class DeleteTaskResponseDto extends TaskResponseDto {}
