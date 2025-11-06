export interface DashboardSummaryResponseDto {
  totalUsers: number;
  activeTickets: number;
  completedTasks: number;
  faqSatisfaction: number;
}

export interface EmployeeDashboardSummaryResponseDto {
  completedTasks: number;
  closedTickets: number;
  expiredFiles: number;
}

export interface EmployeePendingTaskDto {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeePendingTicketDto {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  code: string;
}

export interface EmployeeExpiredFileDto {
  id: string;
  filename: string;
  originalName: string;
  type: string;
  size: number;
  expirationDate: Date;
  createdAt: Date;
}

export interface EmployeeDashboardResponseDto {
  summary: EmployeeDashboardSummaryResponseDto;
  pendingTasks: EmployeePendingTaskDto[];
  pendingTickets: EmployeePendingTicketDto[];
  expiredFiles: EmployeeExpiredFileDto[];
}
