import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { TaskDelegationSubmissionRepository } from '../../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission } from '../../../domain/entities/task-delegation-submission.entity';
import { TaskDelegationRepository } from '../../../domain/repositories/task-delegation.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { TaskDelegation } from '../../../domain/entities/task-delegation.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { taskDelegationSubmissions } from 'src/common/drizzle/schema';
import { eq, inArray, or, desc, and } from 'drizzle-orm';
import { TaskSubmissionStatus } from 'src/task/domain/entities/task-submission.entity';

export enum TaskDelegationSubmissionStatusMapping {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Injectable()
export class DrizzleTaskDelegationSubmissionRepository extends TaskDelegationSubmissionRepository {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private async resolveDelegation(
    delegationId: string,
  ): Promise<TaskDelegation> {
    const delegation =
      await this.taskDelegationRepository.findById(delegationId);
    if (!delegation) {
      throw new Error(`Task delegation with id ${delegationId} not found`);
    }
    return delegation;
  }

  private async resolvePerformer(row: any): Promise<{
    performerId: string;
    performerType: 'admin' | 'supervisor' | 'employee';
    performer?: Admin | Supervisor | Employee;
    performerName?: string;
  }> {
    if (row.performerAdminId) {
      const performer = await this.adminRepository.findById(
        row.performerAdminId,
      );
      return {
        performerId: row.performerAdminId,
        performerType: 'admin',
        performer: performer ?? undefined,
        performerName: performer?.user?.name,
      };
    }

    if (row.performerSupervisorId) {
      const performer = await this.supervisorRepository.findById(
        row.performerSupervisorId,
      );
      return {
        performerId: row.performerSupervisorId,
        performerType: 'supervisor',
        performer: performer ?? undefined,
        performerName: performer?.user?.name,
      };
    }

    if (row.performerEmployeeId) {
      const performer = await this.employeeRepository.findById(
        row.performerEmployeeId,
      );
      return {
        performerId: row.performerEmployeeId,
        performerType: 'employee',
        performer: performer ?? undefined,
        performerName: performer?.user?.name,
      };
    }

    throw new Error('Task delegation submission must have a performer');
  }

  private async resolveReviewer(
    row: any,
  ): Promise<Admin | Supervisor | undefined> {
    if (row.reviewedByAdminId) {
      const admin = await this.adminRepository.findById(row.reviewedByAdminId);
      return admin ?? undefined;
    }

    if (row.reviewedBySupervisorId) {
      const supervisor = await this.supervisorRepository.findById(
        row.reviewedBySupervisorId,
      );
      return supervisor ?? undefined;
    }

    return undefined;
  }

  private async toDomain(row: any): Promise<TaskDelegationSubmission> {
    const delegation = await this.resolveDelegation(row.delegationId);
    const performerDetails = await this.resolvePerformer(row);
    const reviewer = await this.resolveReviewer(row);

    return TaskDelegationSubmission.create({
      id: row.id,
      delegationId: row.delegationId,
      delegation,
      taskId: row.taskId,
      task: delegation.task,
      performerId: performerDetails.performerId,
      performerType: performerDetails.performerType,
      performerName: performerDetails.performerName,
      performer: performerDetails.performer,
      notes: row.notes ?? undefined,
      feedback: row.feedback ?? undefined,
      status: row.status as TaskDelegationSubmission['status'],
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : new Date(),
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
      reviewedBy: reviewer,
      forwarded: row.forwarded ?? false,
    });
  }

  async save(
    submission: TaskDelegationSubmission,
  ): Promise<TaskDelegationSubmission> {
    const performerAdminId =
      submission.performerType === 'admin' ? submission.performerId : null;
    const performerSupervisorId =
      submission.performerType === 'supervisor' ? submission.performerId : null;
    const performerEmployeeId =
      submission.performerType === 'employee' ? submission.performerId : null;

    const data = {
      id: submission.id.toString(),
      delegationId: submission.delegation.id.toString(),
      taskId: submission.taskId.toString(),
      performerAdminId,
      performerSupervisorId,
      performerEmployeeId,
      notes: submission.notes ?? null,
      feedback: submission.feedback ?? null,
      status: TaskDelegationSubmissionStatusMapping[submission.status],
      submittedAt: submission.submittedAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      reviewedByAdminId:
        submission.reviewedBy && 'admin' in submission.reviewedBy
          ? submission.reviewedBy.id.toString()
          : null,
      reviewedBySupervisorId:
        submission.reviewedBy && 'supervisor' in submission.reviewedBy
          ? submission.reviewedBy.id.toString()
          : null,
      forwarded: submission.forwarded,
    };

    await this.db
      .insert(taskDelegationSubmissions)
      .values(data)
      .onConflictDoUpdate({
        target: taskDelegationSubmissions.id,
        set: {
          taskId: data.taskId,
          performerAdminId: data.performerAdminId,
          performerSupervisorId: data.performerSupervisorId,
          performerEmployeeId: data.performerEmployeeId,
          notes: data.notes,
          feedback: data.feedback,
          status: data.status,
          reviewedAt: data.reviewedAt,
          reviewedByAdminId: data.reviewedByAdminId,
          reviewedBySupervisorId: data.reviewedBySupervisorId,
          forwarded: data.forwarded,
        },
      });

    return this.findById(submission.id.toString());
  }

  async findById(id: string): Promise<TaskDelegationSubmission | null> {
    const result = await this.db
      .select()
      .from(taskDelegationSubmissions)
      .where(eq(taskDelegationSubmissions.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toDomain(result[0]);
  }

  async findByDelegationId(
    delegationId: string,
  ): Promise<TaskDelegationSubmission[]> {
    const results = await this.db
      .select()
      .from(taskDelegationSubmissions)
      .where(eq(taskDelegationSubmissions.delegationId, delegationId))
      .orderBy(desc(taskDelegationSubmissions.submittedAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByDelegationIds(
    delegationIds: string[],
  ): Promise<TaskDelegationSubmission[]> {
    if (delegationIds.length === 0) return [];

    const results = await this.db
      .select()
      .from(taskDelegationSubmissions)
      .where(inArray(taskDelegationSubmissions.delegationId, delegationIds))
      .orderBy(desc(taskDelegationSubmissions.submittedAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByPerformerId(
    performerId: string,
  ): Promise<TaskDelegationSubmission[]> {
    const results = await this.db
      .select()
      .from(taskDelegationSubmissions)
      .where(
        or(
          eq(taskDelegationSubmissions.performerAdminId, performerId),
          eq(taskDelegationSubmissions.performerSupervisorId, performerId),
          eq(taskDelegationSubmissions.performerEmployeeId, performerId),
        ),
      )
      .orderBy(desc(taskDelegationSubmissions.submittedAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findByStatus(
    status: TaskSubmissionStatus,
  ): Promise<TaskDelegationSubmission[]> {
    const results = await this.db
      .select()
      .from(taskDelegationSubmissions)
      .where(
        eq(
          taskDelegationSubmissions.status,
          TaskDelegationSubmissionStatusMapping[status],
        ),
      )
      .orderBy(desc(taskDelegationSubmissions.submittedAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async findAll(): Promise<TaskDelegationSubmission[]> {
    const results = await this.db
      .select()
      .from(taskDelegationSubmissions)
      .orderBy(desc(taskDelegationSubmissions.submittedAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(taskDelegationSubmissions)
      .where(eq(taskDelegationSubmissions.id, id));
  }

  async findByTaskId(
    taskId: string,
    forwardedOnly: boolean = true,
  ): Promise<TaskDelegationSubmission[]> {
    const whereConditions = [eq(taskDelegationSubmissions.taskId, taskId)];

    if (forwardedOnly) {
      whereConditions.push(eq(taskDelegationSubmissions.forwarded, true));
    }

    const whereClause =
      whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    const results = await this.db
      .select()
      .from(taskDelegationSubmissions)
      .where(whereClause)
      .orderBy(desc(taskDelegationSubmissions.submittedAt));

    return Promise.all(results.map((row) => this.toDomain(row)));
  }
}
