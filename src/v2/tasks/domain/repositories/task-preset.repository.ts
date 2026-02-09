import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import type { TaskPreset } from '../entities/task-preset.entity';

export interface TaskPresetRepository {
  save(preset: TaskPreset): Promise<TaskPreset>;
  findById(id: string): Promise<TaskPreset | null>;
  findByAssignerId(
    assignerId: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<TaskPreset> & { total: number }>;
  findByNameAndAssignerId(
    name: string,
    assignerId: string,
  ): Promise<TaskPreset | null>;
  update(preset: TaskPreset): Promise<TaskPreset>;
  delete(id: string): Promise<void>;
  findAll(offset?: number, limit?: number): Promise<TaskPreset[]>;
}
