import { AdminProps } from 'src/admin/domain/entities/admin.entity';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../entities/task-submission.entity';
import { SupervisorOptions } from 'src/supervisor/domain/entities/supervisor.entity';
import { EmployeeProps } from 'src/employee/domain/entities/employee.entity';

export interface ToDomainRow {
  taskId: string;
  performerAdminId?: string;
  performerAdmin?: AdminProps;
  performerAdminName?: string;
  performerSupervisorId?: string;
  performerSupervisor?: SupervisorOptions;
  performerSupervisorName?: string;
  performerEmployeeId?: string;
  performerEmployee?: Omit<EmployeeProps, 'user'> & { user: any };
  performerEmployeeName?: string;
  reviewedByAdmin?: AdminProps;
  reviewedBySupervisor?: SupervisorOptions;
  id: string;
  notes?: string;
  feedback?: string;
  status: TaskSubmissionStatus;
  submittedAt: Date;
  reviewedAt?: Date;
}

export abstract class TaskSubmissionRepository {
  abstract save(taskSubmission: TaskSubmission): Promise<TaskSubmission>;
  abstract findById(id: string): Promise<TaskSubmission | null>;
  abstract findByTaskId(taskId: string): Promise<TaskSubmission[]>;
  abstract findByPerformerId(performerId: string): Promise<TaskSubmission[]>;
  abstract findByStatus(status: string): Promise<TaskSubmission[]>;
  abstract findAll(): Promise<TaskSubmission[]>;
  abstract delete(id: string): Promise<void>;
  abstract findByTaskIds(taskIds: string[]): Promise<TaskSubmission[]>;
  abstract toDomain(row: ToDomainRow): Promise<TaskSubmission>;
}
