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

export interface UserPerformanceArgs {
  limit?: number; // default 20
  cursor?: string; // base64-encoded rowNumber
  direction?: 'forward' | 'backward';
  userId?: string; // optional filter
}

export interface UserPerformanceRow {
  username: string;
  role: 'admin' | 'supervisor' | 'employee';
  answered: number;
  satisfied: number;
  dissatisfied: number;
  satisfaction_rate: number;
}

export interface PaginatedResult {
  rows: UserPerformanceRow[];
  nextCursor: string | null;
}

// ------------------ 1. Category Views ------------------
export interface CategoryView {
  categoryName: string;
  views: number;
}

// ------------------ 2. Top FAQs ------------------
export interface TopFaq {
  id: number;
  question: string;
  viewCount: number;
  categoryName: string;
}

// ------------------ 3. FAQ Opportunities ------------------
export interface FaqOpportunity {
  originalCasing: string;
  categoryId: number;
  categoryName: string;
  count: number;
}

// ------------------ 4. Active Promotion ------------------
export interface ActivePromotion {
  id: number;
  title: string;
  description: string;
  startDate: string | null; // or Date if you parse it
  endDate: string | null; // or Date if you parse it
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // أضف أي حقل تاني موجود في جدول promotions
}

// ------------------ 5. Aggregated Result ------------------
export interface DashboardAggregatedResult {
  totalViews: number;
  openTicketsCount: number;
  answeredPendingClosureCount: number;
  faqSatisfactionRate: number;

  categoryViews: CategoryView[];
  topFaqs: TopFaq[];
  faqOpportunities: FaqOpportunity[];
  activePromotion: ActivePromotion | null;
}

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
  abstract getAgentPerformance(
    options: UserPerformanceArgs,
  ): Promise<PaginatedResult>;
  abstract getAnalyticsOverview(): Promise<DashboardAggregatedResult>;
}
