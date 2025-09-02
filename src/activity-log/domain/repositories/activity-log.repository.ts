import { ActivityLog } from '../entities/activity-log.entity';

// Activity object inside each type
export interface Activity {
  id: number;
  title: string;
  itemId: number;
  meta: Record<string, any>; // لو meta ممكن يكون JSON object
  createdAt: string; // أو Date لو بتحول الـ string لـ Date
  updatedAt: string;
  occurredAt: string;
  user: {
    id: string;
    name: string;
    employeeId: string;
  };
}

// Payload object per type
export interface ActivityTypePayload {
  type: string;
  activities: Activity[];
}

// Final aggregated result
export type AllGroupedActivities = {
  data: ActivityTypePayload[];
  nextCursor: string | null;
};

export abstract class ActivityLogRepository {
  abstract save(log: ActivityLog): Promise<ActivityLog>;
  abstract findById(id: string): Promise<ActivityLog | null>;
  abstract findAll(offset?: number, limit?: number): Promise<ActivityLog[]>;
  abstract removeById(id: string): Promise<ActivityLog | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByUserId(
    userId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]>;
  abstract findByItemId(
    itemId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]>;
  abstract getAggregatedActivityFeed(options: {
    userId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<AllGroupedActivities>;
}
