import { ActivityLog } from '../entities/activity-log.entity';

// Activity object inside each type
export interface Activity {
  id: string;
  title: string;
  itemId: string;
  meta: Record<string, any>; // لو meta ممكن يكون JSON object
  createdAt: string; // أو Date لو بتحول الـ string لـ Date
  updatedAt: string;
  occurredAt: string;
  userId: string;
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
  supervisorId?: string; // optional filter
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
  id: string; // questions.id is a uuid
  question: string;
  viewCount: number;
  categoryName: string;
}

// ------------------ 3. FAQ Opportunities ------------------
export interface FaqOpportunity {
  originalCasing: string;
  categoryId: string; // support_tickets.department_id is a uuid
  categoryName: string;
  count: number;
}

// ------------------ 4. Active Promotion ------------------
// Mirrors the promotions table exactly — the query selects the whole row.
export interface ActivePromotion {
  id: string;
  title: string;
  audience: 'customer' | 'supervisor' | 'employee' | 'all';
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdByAdminId: string | null;
  createdBySupervisorId: string | null;
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

export interface UserRow {
  id: string;
  name: string;
  role: 'employee' | 'supervisor' | 'admin' | 'driver';
}

export interface TicketRow {
  id: string;
  answeredByUserId: string;
  customerRating: 'satisfaction' | 'dissatisfaction';
}

export interface QueryOutput {
  users: UserRow[];
  tickets: TicketRow[];
}

// ------------------ 6. Performance Summary ------------------
export interface PerformanceSummary {
  ticketsAnswered: number;
  avgResponseTime: number | null; // milliseconds
  tasksPerformed: number;
  avgTaskTime: number | null; // milliseconds
  tasksApproved: number;
  satisfiedTickets: number;
  dissatisfiedTickets: number;
}
export abstract class ActivityLogRepository {
  abstract save(log: ActivityLog): Promise<ActivityLog>;
  abstract saveMany(logs: ActivityLog[]): Promise<ActivityLog[]>;
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
    supervisorId?: string;
  }): Promise<AllGroupedActivities>;
  abstract getAgentPerformance(
    options: UserPerformanceArgs,
  ): Promise<QueryOutput>;
  abstract getAnalyticsOverview(
    supervisorId?: string,
  ): Promise<DashboardAggregatedResult>;

  abstract getRecentActivity(limit?: number): Promise<
    Array<{
      id: string;
      type: 'ticket' | 'task' | 'faq' | 'user' | 'promotion';
      description: string;
      timestamp: string;
      meta: Record<string, any>;
    }>
  >;

  abstract getPerformanceSummary(userId?: string): Promise<PerformanceSummary>;
}
