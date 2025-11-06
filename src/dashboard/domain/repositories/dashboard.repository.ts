export interface DashboardSummary {
  totalUsers: number;
  activeTickets: number;
  completedTasks: number;
  completedTickets: number;
  pendingTasks: number;
  faqSatisfaction: number;
}

export interface PerformanceSeriesPoint {
  label: string;
  tasksCompleted: number;
  ticketsClosed: number;
  avgFirstResponseSeconds: number;
}

export interface AnalyticsSummaryKpi {
  label: string;
  value: string;
}

export interface DepartmentPerformanceItem {
  name: string;
  score: number;
}
export abstract class DashboardRepository {
  abstract getSummary(departmentIds?: string[]): Promise<DashboardSummary>;

  abstract getWeeklyPerformance(
    rangeDays: number,
    departmentIds?: string[],
  ): Promise<PerformanceSeriesPoint[]>;

  abstract getAnalyticsSummary(
    rangeDays: number,
    departmentIds?: string[],
  ): Promise<{
    kpis: AnalyticsSummaryKpi[];
    departmentPerformance: DepartmentPerformanceItem[];
  }>;

  abstract getExpiredAttachments(departmentIds?: string[]): Promise<
    {
      id: string;
      type: string;
      filename: string;
      originalName: string;
      expirationDate: Date;
      userId: string;
      guestId: string;
      isGlobal: boolean;
      size: number;
      createdAt: Date;
      updatedAt: Date;
      targetId: string;
      cloned: boolean;
    }[]
  >;
}
