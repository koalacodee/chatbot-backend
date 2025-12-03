import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission as TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';

/**
 * @deprecated This repository has been replaced by DrizzleTaskDelegationSubmissionRepository.
 * Use DrizzleTaskDelegationSubmissionRepository from './drizzle/drizzle-task-delegation-submission.repository' instead.
 * This class will be removed in a future version.
 */
@Injectable()
export class PrismaTaskDelegationSubmissionRepository extends TaskDelegationSubmissionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {
    super();
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
      const performer = row.performerAdmin
        ? Admin.create(row.performerAdmin)
        : await this.adminRepository.findById(row.performerAdminId);
      return {
        performerId: row.performerAdminId,
        performerType: 'admin',
        performer: performer ?? undefined,
        performerName: row.performerAdmin?.user?.name,
      };
    }

    if (row.performerSupervisorId) {
      const performer = row.performerSupervisor
        ? this.supervisorRepository.findById(row.performerSupervisorId)
        : this.supervisorRepository.findById(row.performerSupervisorId);
      const resolved = await performer;
      return {
        performerId: row.performerSupervisorId,
        performerType: 'supervisor',
        performer: resolved ?? undefined,
        performerName: row.performerSupervisor?.user?.name,
      };
    }

    if (row.performerEmployeeId) {
      const performer = row.performerEmployee
        ? await Employee.create(row.performerEmployee)
        : await this.employeeRepository.findById(row.performerEmployeeId);
      return {
        performerId: row.performerEmployeeId,
        performerType: 'employee',
        performer: performer ?? undefined,
        performerName: row.performerEmployee?.user?.name,
      };
    }

    throw new Error('Task delegation submission must have a performer');
  }

  private async resolveReviewer(
    row: any,
  ): Promise<Admin | Supervisor | undefined> {
    if (row.reviewedByAdminId) {
      if (row.reviewedByAdmin) {
        return Admin.create(row.reviewedByAdmin);
      }
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
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt ?? undefined,
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
      status: submission.status,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt ?? null,
      reviewedByAdminId:
        submission.reviewedBy && 'admin' in submission.reviewedBy
          ? submission.reviewedBy.id.toString()
          : null,
      reviewedBySupervisorId:
        submission.reviewedBy && 'supervisor' in submission.reviewedBy
          ? submission.reviewedBy.id.toString()
          : null,
      forwarded: submission.forwarded,
    } as const;

    const upsert = await this.prisma.taskDelegationSubmission.upsert({
      where: { id: data.id },
      update: {
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
      create: data,
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<TaskDelegationSubmission | null> {
    const row = await this.prisma.taskDelegationSubmission.findUnique({
      where: { id },
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    if (!row) {
      return null;
    }

    return this.toDomain(row);
  }

  async findByDelegationId(
    delegationId: string,
  ): Promise<TaskDelegationSubmission[]> {
    const rows = await this.prisma.taskDelegationSubmission.findMany({
      where: { delegationId },
      orderBy: { submittedAt: 'desc' },
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByDelegationIds(
    delegationIds: string[],
  ): Promise<TaskDelegationSubmission[]> {
    const rows = await this.prisma.taskDelegationSubmission.findMany({
      where: { delegationId: { in: delegationIds } },
      orderBy: { submittedAt: 'desc' },
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByPerformerId(
    performerId: string,
  ): Promise<TaskDelegationSubmission[]> {
    const rows = await this.prisma.taskDelegationSubmission.findMany({
      where: {
        OR: [
          { performerAdminId: performerId },
          { performerSupervisorId: performerId },
          { performerEmployeeId: performerId },
        ],
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByStatus(status: string): Promise<TaskDelegationSubmission[]> {
    const rows = await this.prisma.taskDelegationSubmission.findMany({
      where: { status: status as TaskDelegationSubmission['status'] },
      orderBy: { submittedAt: 'desc' },
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findAll(): Promise<TaskDelegationSubmission[]> {
    const rows = await this.prisma.taskDelegationSubmission.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taskDelegationSubmission.delete({ where: { id } });
  }

  async findByTaskId(
    taskId: string,
    forwardedOnly: boolean = true,
  ): Promise<TaskDelegationSubmission[]> {
    const rows = await this.prisma.taskDelegationSubmission.findMany({
      where: { taskId, forwarded: forwardedOnly },
      orderBy: { submittedAt: 'desc' },
      include: {
        performerAdmin: { include: { user: true } },
        performerSupervisor: { include: { user: true } },
        performerEmployee: { include: { user: true } },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }
}
