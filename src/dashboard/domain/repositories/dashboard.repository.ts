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
  abstract getSummary(): Promise<DashboardSummary>;

  abstract getWeeklyPerformance(
    rangeDays: number,
  ): Promise<PerformanceSeriesPoint[]>;

  abstract getAnalyticsSummary(rangeDays: number): Promise<{
    kpis: AnalyticsSummaryKpi[];
    departmentPerformance: DepartmentPerformanceItem[];
  }>;

  abstract getExpiredAttachments(): Promise<
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
