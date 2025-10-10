import { TaskPreset } from '../entities/task-preset.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

export interface TaskPresetRepository {
  save(preset: TaskPreset): Promise<TaskPreset>;
  findById(id: string): Promise<TaskPreset | null>;
  findByAssignerId(assignerId: string): Promise<TaskPreset[]>;
  findByNameAndAssignerId(
    name: string,
    assignerId: string,
  ): Promise<TaskPreset | null>;
  update(preset: TaskPreset): Promise<TaskPreset>;
  delete(id: string): Promise<void>;
  findAll(offset?: number, limit?: number): Promise<TaskPreset[]>;
}
