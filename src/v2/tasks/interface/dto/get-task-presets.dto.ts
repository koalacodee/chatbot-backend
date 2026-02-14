import { Expose, Type } from 'class-transformer';
import {
  ValidateNested,
} from 'class-validator';
import { CursorDto } from './cursor.dto';
// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────


export class GetTaskPresetsRequestDto extends CursorDto {
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class TaskPresetResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  dueDate?: Date;

  @Expose()
  assigneeId?: string;

  @Expose()
  assignerId: string;

  @Expose()
  assignerRole: string;

  @Expose()
  approverId?: string;

  @Expose()
  assignmentType: string;

  @Expose()
  targetDepartmentId?: string;

  @Expose()
  targetSubDepartmentId?: string;

  @Expose()
  priority: string;

  @Expose()
  reminderInterval?: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class GetTaskPresetsResponseDto {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => TaskPresetResponseDto)
  presets: TaskPresetResponseDto[];

  @Expose()
  total: number;
}
