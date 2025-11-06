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

export interface EmployeeDashboardSummary {
  completedTasks: number;
  closedTickets: number;
  expiredFiles: number;
}

export interface PendingTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  code: string;
}

export interface ExpiredFile {
  id: string;
  filename: string;
  originalName: string;
  type: string;
  size: number;
  expirationDate: Date;
  createdAt: Date;
}

export interface EmployeeDashboardData {
  summary: EmployeeDashboardSummary;
  pendingTasks: PendingTask[];
  pendingTickets: PendingTicket[];
  expiredFiles: ExpiredFile[];
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

  // Employee dashboard methods
  abstract getEmployeeDashboardSummary(
    employeeId: string,
  ): Promise<EmployeeDashboardSummary>;

  abstract getEmployeeDashboard(
    employeeId: string,
    taskLimit?: number,
    ticketLimit?: number,
  ): Promise<EmployeeDashboardData>;
}
