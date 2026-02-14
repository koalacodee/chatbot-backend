import { Expose, Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import { TaskResponseDto } from './create-task.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class MarkTaskSeenRequestDto {
  @IsUUID()
  taskId: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class MarkTaskSeenResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskResponseDto)
  task: TaskResponseDto;
}
