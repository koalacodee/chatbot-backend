import { Injectable } from '@nestjs/common';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PrismaTaskSubmissionRepository extends TaskSubmissionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskRepository: TaskRepository,
  ) {
    super();
  }

  private async toDomain(row: any): Promise<TaskSubmission> {
    const task = await this.taskRepository.findById(row.taskId);
    if (!task) {
      throw new Error(`Task with id ${row.taskId} not found`);
    }

    // Determine performer type and ID
    let performerId: string;
    let performerType: 'admin' | 'supervisor' | 'employee';
    let performer: Admin | Supervisor | Employee | undefined;

    if (row.performerAdminId && row.performerAdmin) {
      performerId = row.performerAdminId;
      performerType = 'admin';
      performer = Admin.create(row.performerAdmin);
    } else if (row.performerSupervisorId && row.performerSupervisor) {
      performerId = row.performerSupervisorId;
      performerType = 'supervisor';
      performer = Supervisor.create(row.performerSupervisor);
    } else if (row.performerEmployeeId && row.performerEmployee) {
      performerId = row.performerEmployeeId;
      performerType = 'employee';
      performer = await Employee.create(row.performerEmployee);
    } else {
      // Fallback to ID only if relation is not loaded
      if (row.performerAdminId) {
        performerId = row.performerAdminId;
        performerType = 'admin';
      } else if (row.performerSupervisorId) {
        performerId = row.performerSupervisorId;
        performerType = 'supervisor';
      } else if (row.performerEmployeeId) {
        performerId = row.performerEmployeeId;
        performerType = 'employee';
      } else {
        throw new Error('No performer found for task submission');
      }
    }

    // Get reviewer if exists
    let reviewedBy: Admin | Supervisor | undefined;
    if (row.reviewedByAdmin) {
      reviewedBy = Admin.create(row.reviewedByAdmin);
    } else if (row.reviewedBySupervisor) {
      reviewedBy = Supervisor.create(row.reviewedBySupervisor);
    }

    return TaskSubmission.create({
      id: row.id,
      task,
      performerId,
      performerType,
      performer,
      notes: row.notes ?? undefined,
      feedback: row.feedback ?? undefined,
      status: row.status as TaskSubmissionStatus,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt ?? undefined,
      reviewedBy,
    });
  }

  async save(taskSubmission: TaskSubmission): Promise<TaskSubmission> {
    // Set performer IDs based on performer type
    let performerAdminId: string | null = null;
    let performerSupervisorId: string | null = null;
    let performerEmployeeId: string | null = null;

    switch (taskSubmission.performerType) {
      case 'admin':
        performerAdminId = taskSubmission.performerId;
        break;
      case 'supervisor':
        performerSupervisorId = taskSubmission.performerId;
        break;
      case 'employee':
        performerEmployeeId = taskSubmission.performerId;
        break;
    }

    const data = {
      id: taskSubmission.id.toString(),
      taskId: taskSubmission.task.id.toString(),
      performerAdminId,
      performerSupervisorId,
      performerEmployeeId,
      notes: taskSubmission.notes ?? null,
      feedback: taskSubmission.feedback ?? null,
      status: taskSubmission.status,
      submittedAt: taskSubmission.submittedAt,
      reviewedAt: taskSubmission.reviewedAt ?? null,
      reviewedByAdminId:
        taskSubmission.reviewedBy && 'admin' in taskSubmission.reviewedBy
          ? taskSubmission.reviewedBy.id.toString()
          : null,
      reviewedBySupervisorId:
        taskSubmission.reviewedBy && 'supervisor' in taskSubmission.reviewedBy
          ? taskSubmission.reviewedBy.id.toString()
          : null,
    };

    const upsert = await this.prisma.taskSubmission.upsert({
      where: { id: data.id },
      update: {
        performerAdminId: data.performerAdminId,
        performerSupervisorId: data.performerSupervisorId,
        performerEmployeeId: data.performerEmployeeId,
        notes: data.notes,
        feedback: data.feedback,
        status: data.status,
        reviewedAt: data.reviewedAt,
        reviewedByAdminId: data.reviewedByAdminId,
        reviewedBySupervisorId: data.reviewedBySupervisorId,
      },
      create: data,
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<TaskSubmission | null> {
    const row = await this.prisma.taskSubmission.findUnique({
      where: { id },
      include: {
        performerAdmin: true,
        performerSupervisor: true,
        performerEmployee: true,
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByTaskId(taskId: string): Promise<TaskSubmission | null> {
    const row = await this.prisma.taskSubmission.findFirst({
      where: { taskId },
      include: {
        performerAdmin: true,
        performerSupervisor: true,
        performerEmployee: true,
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByPerformerId(performerId: string): Promise<TaskSubmission[]> {
    const rows = await this.prisma.taskSubmission.findMany({
      where: {
        OR: [
          { performerAdminId: performerId },
          { performerSupervisorId: performerId },
          { performerEmployeeId: performerId },
        ],
      },
      include: {
        performerAdmin: true,
        performerSupervisor: true,
        performerEmployee: true,
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByStatus(status: string): Promise<TaskSubmission[]> {
    const rows = await this.prisma.taskSubmission.findMany({
      where: { status: status as TaskSubmissionStatus },
      include: {
        performerAdmin: true,
        performerSupervisor: true,
        performerEmployee: true,
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findAll(): Promise<TaskSubmission[]> {
    const rows = await this.prisma.taskSubmission.findMany({
      include: {
        performerAdmin: true,
        performerSupervisor: true,
        performerEmployee: true,
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taskSubmission.delete({
      where: { id },
    });
  }

  async findByTaskIds(taskIds: string[]): Promise<TaskSubmission[]> {
    const rows = await this.prisma.taskSubmission.findMany({
      where: { taskId: { in: taskIds } },
      include: {
        performerAdmin: true,
        performerSupervisor: true,
        performerEmployee: true,
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }
}
