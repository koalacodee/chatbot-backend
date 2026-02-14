import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import type { TaskPreset } from '../entities/task-preset.entity';

export abstract class TaskPresetRepository {
  abstract save(preset: TaskPreset): Promise<TaskPreset>;
  abstract findById(id: string): Promise<TaskPreset | null>;
  abstract findByAssignerId(
    assignerId: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<TaskPreset> & { total: number }>;
  abstract findByNameAndAssignerId(
    name: string,
    assignerId: string,
  ): Promise<TaskPreset | null>;
  abstract update(preset: TaskPreset): Promise<TaskPreset>;
  abstract delete(id: string): Promise<void>;
  abstract findAll(offset?: number, limit?: number): Promise<TaskPreset[]>;
}
