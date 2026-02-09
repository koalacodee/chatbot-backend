import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import type { TaskPreset } from '@/v2/tasks/domain/entities/task-preset.entity';
import type { TaskPresetRepository } from '@/v2/tasks/domain/repositories/task-preset.repository';
import * as crud from './repository-crud';
import * as find from './repository-find';

export class DrizzleTaskPresetRepository implements TaskPresetRepository {
  constructor(private readonly db: DatabaseInstance | DrizzleTransaction) {}

  static fromTransaction(tx: DrizzleTransaction): DrizzleTaskPresetRepository {
    return new DrizzleTaskPresetRepository(tx);
  }

  async save(preset: TaskPreset): Promise<TaskPreset> {
    return crud.save(this.db, preset);
  }

  async findById(id: string): Promise<TaskPreset | null> {
    return crud.findById(this.db, id);
  }

  async findByAssignerId(
    assignerId: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<TaskPreset> & { total: number }> {
    return find.findByAssignerId(this.db, assignerId, cursor);
  }

  async findByNameAndAssignerId(
    name: string,
    assignerId: string,
  ): Promise<TaskPreset | null> {
    return find.findByNameAndAssignerId(this.db, name, assignerId);
  }

  async update(preset: TaskPreset): Promise<TaskPreset> {
    return crud.update(this.db, preset);
  }

  async delete(id: string): Promise<void> {
    return crud.deleteById(this.db, id);
  }

  async findAll(offset?: number, limit?: number): Promise<TaskPreset[]> {
    return find.findAll(this.db, offset, limit);
  }
}
