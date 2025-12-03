import { Injectable } from '@nestjs/common';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ToDomainRow } from '../../domain/repositories/task-submission.repository';

/**
 * @deprecated This repository has been replaced by DrizzleTaskSubmissionRepository.
 * Use DrizzleTaskSubmissionRepository from './drizzle/drizzle-task-submission.repository' instead.
 * This class will be removed in a future version.
 */
@Injectable()
export class PrismaTaskSubmissionRepository extends TaskSubmissionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskRepository: TaskRepository,
  ) {
    super();
  }

  async toDomain(row: ToDomainRow): Promise<TaskSubmission> {
    const task = await this.taskRepository.findById(row.taskId);
    if (!task) {
      throw new Error(`Task with id ${row.taskId} not found`);
    }

    // Determine performer type and ID
    let performerId: string;
    let performerType: 'admin' | 'supervisor' | 'employee';
    let performerName: string | undefined;

    if (row.performerAdminId && row.performerAdmin) {
      performerId = row.performerAdminId;
      performerType = 'admin';
      performerName = row.performerAdmin?.user?.name;
    } else if (row.performerSupervisorId && row.performerSupervisor) {
      performerId = row.performerSupervisorId;
      performerType = 'supervisor';
      performerName = row.performerSupervisor?.user?.name;
    } else if (row.performerEmployeeId && row.performerEmployee) {
      performerId = row.performerEmployeeId;
      performerType = 'employee';
      performerName = row.performerEmployee?.user?.name;
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
      performerName,
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

    return this.toDomain({
      id: upsert.id,
      taskId: upsert.taskId,
      performerAdminId: upsert.performerAdminId,
      performerSupervisorId: upsert.performerSupervisorId,
      performerEmployeeId: upsert.performerEmployeeId,
      notes: upsert.notes,
      feedback: upsert.feedback,
      status: upsert.status as TaskSubmissionStatus,
      submittedAt: upsert.submittedAt,
      reviewedAt: upsert.reviewedAt ?? undefined,
    });
  }

  async findById(id: string): Promise<TaskSubmission | null> {
    const row = await this.prisma.taskSubmission.findUnique({
      where: { id },
      include: {
        performerAdmin: {
          select: { user: { select: { name: true } }, userId: true },
        },
        performerSupervisor: {
          select: { user: { select: { name: true } }, userId: true },
        },
        performerEmployee: {
          select: { user: { select: { name: true } }, userId: true },
        },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    if (!row) return null;
    return this.toDomain({
      id: row.id,
      taskId: row.taskId,
      performerAdminId: row.performerAdminId,
      performerSupervisorId: row.performerSupervisorId,
      performerEmployeeId: row.performerEmployeeId,
      performerEmployee: row.performerEmployee as any,
      performerAdmin: row.performerAdmin as any,
      performerSupervisor: row.performerSupervisor as any,
      notes: row.notes,
      feedback: row.feedback,
      status: row.status as TaskSubmissionStatus,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt ?? undefined,
      reviewedByAdmin: row.reviewedByAdmin,
      reviewedBySupervisor: row.reviewedBySupervisor as any,
    });
  }

  async findByTaskId(taskId: string): Promise<TaskSubmission[]> {
    const rows = await this.prisma.taskSubmission.findMany({
      where: { taskId },
      include: {
        performerAdmin: {
          select: { user: { select: { name: true } } },
        },
        performerSupervisor: {
          select: { user: { select: { name: true } } },
        },
        performerEmployee: {
          select: { user: { select: { name: true } } },
        },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    return Promise.all(
      rows.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          performerEmployee: row.performerEmployee as any,
          performerAdmin: row.performerAdmin as any,
          performerSupervisor: row.performerSupervisor as any,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt,
          reviewedAt: row.reviewedAt ?? undefined,
          reviewedByAdmin: row.reviewedByAdmin,
          reviewedBySupervisor: row.reviewedBySupervisor as any,
        }),
      ),
    );
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
        performerAdmin: {
          select: { user: { select: { name: true } } },
        },
        performerSupervisor: {
          select: { user: { select: { name: true } } },
        },
        performerEmployee: {
          select: { user: { select: { name: true } } },
        },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(
      rows.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          performerEmployee: row.performerEmployee as any,
          performerAdmin: row.performerAdmin as any,
          performerSupervisor: row.performerSupervisor as any,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt,
          reviewedAt: row.reviewedAt ?? undefined,
          reviewedByAdmin: row.reviewedByAdmin,
          reviewedBySupervisor: row.reviewedBySupervisor as any,
        }),
      ),
    );
  }

  async findByStatus(status: string): Promise<TaskSubmission[]> {
    const rows = await this.prisma.taskSubmission.findMany({
      where: { status: status as TaskSubmissionStatus },
      include: {
        performerAdmin: {
          select: { user: { select: { name: true } } },
        },
        performerSupervisor: {
          select: { user: { select: { name: true } } },
        },
        performerEmployee: {
          select: { user: { select: { name: true } } },
        },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(
      rows.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          performerEmployee: row.performerEmployee as any,
          performerAdmin: row.performerAdmin as any,
          performerSupervisor: row.performerSupervisor as any,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt,
          reviewedAt: row.reviewedAt ?? undefined,
          reviewedByAdmin: row.reviewedByAdmin,
          reviewedBySupervisor: row.reviewedBySupervisor as any,
        }),
      ),
    );
  }

  async findAll(): Promise<TaskSubmission[]> {
    const rows = await this.prisma.taskSubmission.findMany({
      include: {
        performerAdmin: {
          select: { user: { select: { name: true } } },
        },
        performerSupervisor: {
          select: { user: { select: { name: true } } },
        },
        performerEmployee: {
          select: { user: { select: { name: true } } },
        },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(
      rows.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          performerEmployee: row.performerEmployee as any,
          performerAdmin: row.performerAdmin as any,
          performerSupervisor: row.performerSupervisor as any,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt,
          reviewedAt: row.reviewedAt ?? undefined,
          reviewedByAdmin: row.reviewedByAdmin,
          reviewedBySupervisor: row.reviewedBySupervisor as any,
        }),
      ),
    );
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
        performerAdmin: {
          select: { user: { select: { name: true } } },
        },
        performerSupervisor: {
          select: { user: { select: { name: true } } },
        },
        performerEmployee: {
          select: { user: { select: { name: true } } },
        },
        reviewedByAdmin: true,
        reviewedBySupervisor: true,
      },
    });

    return Promise.all(
      rows.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          performerEmployee: row.performerEmployee as any,
          performerAdmin: row.performerAdmin as any,
          performerSupervisor: row.performerSupervisor as any,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt,
          reviewedAt: row.reviewedAt ?? undefined,
          reviewedByAdmin: row.reviewedByAdmin,
          reviewedBySupervisor: row.reviewedBySupervisor as any,
        }),
      ),
    );
  }
}
