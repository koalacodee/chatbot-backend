import {
  type DatabaseInstance,
  DrizzleService,
  type DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import type {
  TaskSubmission,
  TaskSubmissionStatus,
} from '@/v2/tasks/domain/entities/task-submission.entity';
import type { TaskSubmissionRepository } from '@/v2/tasks/domain/repositories/task-submission.repository';
import * as crud from './repository-crud';
import * as find from './repository-find';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DrizzleTaskSubmissionRepository
  implements TaskSubmissionRepository {
  private readonly db: DatabaseInstance | DrizzleTransaction;
  constructor(drizzleService: DrizzleService) {
    this.db = drizzleService.client;
  }

  async save(taskSubmission: TaskSubmission): Promise<TaskSubmission> {
    return crud.save(this.db, taskSubmission);
  }

  async findById(id: string): Promise<TaskSubmission | null> {
    return crud.findById(this.db, id);
  }

  async findByTaskId(
    taskId: string,
    status?: string | string[],
  ): Promise<TaskSubmission[]> {
    return find.findByTaskId(this.db, taskId, status);
  }

  async findByPerformerId(performerId: string): Promise<TaskSubmission[]> {
    return find.findByPerformerId(this.db, performerId);
  }

  async findByStatus(status: TaskSubmissionStatus): Promise<TaskSubmission[]> {
    return find.findByStatus(this.db, status);
  }

  async findAll(): Promise<TaskSubmission[]> {
    return find.findAll(this.db);
  }

  async delete(id: string): Promise<void> {
    return crud.deleteById(this.db, id);
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    return crud.deleteByTaskId(this.db, taskId);
  }

  async findByTaskIds(taskIds: string[]): Promise<TaskSubmission[]> {
    return find.findByTaskIds(this.db, taskIds);
  }
}
