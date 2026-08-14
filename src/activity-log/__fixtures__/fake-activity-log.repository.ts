import { ActivityLog } from '../domain/entities/activity-log.entity';
import {
  ActivityLogRepository,
  AllGroupedActivities,
  DashboardAggregatedResult,
  PerformanceSummary,
  QueryOutput,
  UserPerformanceArgs,
} from '../domain/repositories/activity-log.repository';

type AggregateOptions = Parameters<
  ActivityLogRepository['getAggregatedActivityFeed']
>[0];

type RecentActivity = Awaited<
  ReturnType<ActivityLogRepository['getRecentActivity']>
>;

/**
 * A real implementation of the abstract repository, not a mock — which is only possible
 * because DI binds to the abstract class. The compiler checks it against the contract, so
 * a change to `ActivityLogRepository` breaks this file rather than silently leaving tests
 * asserting against a stale shape.
 *
 * CRUD is genuinely in-memory. The analytics methods have no meaningful in-memory
 * semantics — they exist to run SQL — so those return canned values and record the
 * arguments they were called with.
 */
export class FakeActivityLogRepository extends ActivityLogRepository {
  readonly logs = new Map<string, ActivityLog>();

  /** Canned results; set these per test. */
  aggregatedFeed: AllGroupedActivities = { data: [], nextCursor: null };
  agentPerformance: QueryOutput = { users: [], tickets: [] };
  analyticsOverview: DashboardAggregatedResult | null = null;
  recentActivity: RecentActivity = [];
  performanceSummary: PerformanceSummary = {
    ticketsAnswered: 0,
    avgResponseTime: null,
    tasksPerformed: 0,
    avgTaskTime: null,
    tasksApproved: 0,
    satisfiedTickets: 0,
    dissatisfiedTickets: 0,
  };

  /** Arguments the analytics methods were last called with. */
  readonly received: {
    aggregatedFeed?: AggregateOptions;
    agentPerformance?: UserPerformanceArgs;
    analyticsOverview?: string | undefined;
    recentActivity?: number | undefined;
    performanceSummary?: string | undefined;
  } = {};

  // ── in-memory CRUD ──────────────────────────────────────────────

  async save(log: ActivityLog): Promise<ActivityLog> {
    this.logs.set(log.id, log);
    return log;
  }

  async saveMany(logs: ActivityLog[]): Promise<ActivityLog[]> {
    for (const log of logs) this.logs.set(log.id, log);
    return logs;
  }

  async findById(id: string): Promise<ActivityLog | null> {
    return this.logs.get(id) ?? null;
  }

  async findAll(offset = 0, limit?: number): Promise<ActivityLog[]> {
    const all = [...this.logs.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return limit === undefined
      ? all.slice(offset)
      : all.slice(offset, offset + limit);
  }

  async removeById(id: string): Promise<ActivityLog | null> {
    const existing = this.logs.get(id) ?? null;
    this.logs.delete(id);
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    return this.logs.has(id);
  }

  async count(): Promise<number> {
    return this.logs.size;
  }

  async findByUserId(
    userId: string,
    offset = 0,
    limit?: number,
  ): Promise<ActivityLog[]> {
    const matches = (await this.findAll()).filter(
      (log) => log.userId === userId,
    );

    return limit === undefined
      ? matches.slice(offset)
      : matches.slice(offset, offset + limit);
  }

  async findByItemId(
    itemId: string,
    offset = 0,
    limit?: number,
  ): Promise<ActivityLog[]> {
    const matches = (await this.findAll()).filter(
      (log) => log.itemId === itemId,
    );

    return limit === undefined
      ? matches.slice(offset)
      : matches.slice(offset, offset + limit);
  }

  // ── query-shaped methods: canned result + argument recorder ─────

  async getAggregatedActivityFeed(
    options: AggregateOptions,
  ): Promise<AllGroupedActivities> {
    this.received.aggregatedFeed = options;
    return this.aggregatedFeed;
  }

  async getAgentPerformance(
    options: UserPerformanceArgs,
  ): Promise<QueryOutput> {
    this.received.agentPerformance = options;
    return this.agentPerformance;
  }

  async getAnalyticsOverview(
    supervisorId?: string,
  ): Promise<DashboardAggregatedResult> {
    this.received.analyticsOverview = supervisorId;
    return this.analyticsOverview;
  }

  async getRecentActivity(limit?: number): Promise<RecentActivity> {
    this.received.recentActivity = limit;
    return this.recentActivity;
  }

  async getPerformanceSummary(userId?: string): Promise<PerformanceSummary> {
    this.received.performanceSummary = userId;
    return this.performanceSummary;
  }
}
