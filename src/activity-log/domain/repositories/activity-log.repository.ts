import { ActivityLog } from '../entities/activity-log.entity';

export abstract class ActivityLogRepository {
  abstract save(log: ActivityLog): Promise<ActivityLog>;
  abstract findById(id: string): Promise<ActivityLog | null>;
  abstract findAll(offset?: number, limit?: number): Promise<ActivityLog[]>;
  abstract removeById(id: string): Promise<ActivityLog | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByUserId(userId: string, offset?: number, limit?: number): Promise<ActivityLog[]>;
  abstract findByItemId(itemId: string, offset?: number, limit?: number): Promise<ActivityLog[]>;
}
