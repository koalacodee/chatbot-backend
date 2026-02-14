import {
  type DatabaseInstance,
  DrizzleService,
  type DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import type { TaskPreset } from '@/v2/tasks/domain/entities/task-preset.entity';
import type { TaskPresetRepository } from '@/v2/tasks/domain/repositories/task-preset.repository';
import * as crud from './repository-crud';
import * as find from './repository-find';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DrizzleTaskPresetRepository implements TaskPresetRepository {
  private readonly db: DatabaseInstance | DrizzleTransaction;
  constructor(drizzleService: DrizzleService) {
    this.db = drizzleService.client;
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
