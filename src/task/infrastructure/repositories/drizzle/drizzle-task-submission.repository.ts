import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { TaskSubmissionRepository } from '../../../domain/repositories/task-submission.repository';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../../domain/entities/task-submission.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { TaskRepository } from '../../../domain/repositories/task.repository';
import { ToDomainRow } from '../../../domain/repositories/task-submission.repository';
import {
  taskSubmissions,
  admins,
  supervisors,
  employees,
  users,
} from 'src/common/drizzle/schema';
import { eq, inArray, or, desc } from 'drizzle-orm';
import { TaskStatusMapping } from './drizzle-task-delegation.repository';

@Injectable()
export class DrizzleTaskSubmissionRepository extends TaskSubmissionRepository {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly taskRepository: TaskRepository,
  ) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
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
      performerName = row.performerAdminName;
    } else if (row.performerSupervisorId && row.performerSupervisor) {
      performerId = row.performerSupervisorId;
      performerType = 'supervisor';
      performerName = row.performerSupervisorName;
    } else if (row.performerEmployeeId && row.performerEmployee) {
      performerId = row.performerEmployeeId;
      performerType = 'employee';
      performerName = row.performerEmployeeName;
    } else {
      // Fallback to ID only if relation is not loaded
      if (row.performerAdminId) {
        performerId = row.performerAdminId;
        performerType = 'admin';
        performerName = row.performerAdminName;
      } else if (row.performerSupervisorId) {
        performerId = row.performerSupervisorId;
        performerType = 'supervisor';
        performerName = row.performerSupervisorName;
      } else if (row.performerEmployeeId) {
        performerId = row.performerEmployeeId;
        performerType = 'employee';
        performerName = row.performerEmployeeName;
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
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : new Date(),
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
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
      status: TaskStatusMapping[taskSubmission.status],
      submittedAt: taskSubmission.submittedAt.toISOString(),
      reviewedAt: taskSubmission.reviewedAt?.toISOString() ?? null,
      reviewedByAdminId:
        taskSubmission.reviewedBy && 'admin' in taskSubmission.reviewedBy
          ? taskSubmission.reviewedBy.id.toString()
          : null,
      reviewedBySupervisorId:
        taskSubmission.reviewedBy && 'supervisor' in taskSubmission.reviewedBy
          ? taskSubmission.reviewedBy.id.toString()
          : null,
      delegationSubmissionId: null,
    };

    await this.db
      .insert(taskSubmissions)
      .values(data)
      .onConflictDoUpdate({
        target: taskSubmissions.id,
        set: {
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
      });

    return this.findById(taskSubmission.id.toString());
  }

  async findById(id: string): Promise<TaskSubmission | null> {
    const result = await this.db
      .select({
        id: taskSubmissions.id,
        taskId: taskSubmissions.taskId,
        performerAdminId: taskSubmissions.performerAdminId,
        performerSupervisorId: taskSubmissions.performerSupervisorId,
        performerEmployeeId: taskSubmissions.performerEmployeeId,
        notes: taskSubmissions.notes,
        feedback: taskSubmissions.feedback,
        status: taskSubmissions.status,
        submittedAt: taskSubmissions.submittedAt,
        reviewedAt: taskSubmissions.reviewedAt,
        reviewedByAdminId: taskSubmissions.reviewedByAdminId,
        reviewedBySupervisorId: taskSubmissions.reviewedBySupervisorId,
        performerAdminUser: users.name,
        performerAdminUserId: users.id,
        performerSupervisorUser: users.name,
        performerSupervisorUserId: users.id,
        performerEmployeeUser: users.name,
        performerEmployeeUserId: users.id,
      })
      .from(taskSubmissions)
      .leftJoin(admins, eq(taskSubmissions.performerAdminId, admins.id))
      .leftJoin(
        supervisors,
        eq(taskSubmissions.performerSupervisorId, supervisors.id),
      )
      .leftJoin(
        employees,
        eq(taskSubmissions.performerEmployeeId, employees.id),
      )
      .leftJoin(
        users,
        or(
          eq(admins.userId, users.id),
          eq(supervisors.userId, users.id),
          eq(employees.userId, users.id),
        ),
      )
      .where(eq(taskSubmissions.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return this.toDomain({
      id: row.id,
      taskId: row.taskId,
      performerAdminId: row.performerAdminId,
      performerSupervisorId: row.performerSupervisorId,
      performerEmployeeId: row.performerEmployeeId,
      performerAdminName: row.performerAdminUser,
      performerSupervisorName: row.performerSupervisorUser,
      performerEmployeeName: row.performerEmployeeUser,
      notes: row.notes,
      feedback: row.feedback,
      status: row.status as TaskSubmissionStatus,
      submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
    });
  }

  async findByTaskId(taskId: string): Promise<TaskSubmission[]> {
    const results = await this.db
      .select({
        id: taskSubmissions.id,
        taskId: taskSubmissions.taskId,
        performerAdminId: taskSubmissions.performerAdminId,
        performerSupervisorId: taskSubmissions.performerSupervisorId,
        performerEmployeeId: taskSubmissions.performerEmployeeId,
        notes: taskSubmissions.notes,
        feedback: taskSubmissions.feedback,
        status: taskSubmissions.status,
        submittedAt: taskSubmissions.submittedAt,
        reviewedAt: taskSubmissions.reviewedAt,
        reviewedByAdminId: taskSubmissions.reviewedByAdminId,
        reviewedBySupervisorId: taskSubmissions.reviewedBySupervisorId,
        performerAdminUser: users.name,
        performerAdminUserId: users.id,
        performerSupervisorUser: users.name,
        performerSupervisorUserId: users.id,
        performerEmployeeUser: users.name,
        performerEmployeeUserId: users.id,
      })
      .from(taskSubmissions)
      .leftJoin(admins, eq(taskSubmissions.performerAdminId, admins.id))
      .leftJoin(
        supervisors,
        eq(taskSubmissions.performerSupervisorId, supervisors.id),
      )
      .leftJoin(
        employees,
        eq(taskSubmissions.performerEmployeeId, employees.id),
      )
      .leftJoin(
        users,
        or(
          eq(admins.userId, users.id),
          eq(supervisors.userId, users.id),
          eq(employees.userId, users.id),
        ),
      )
      .where(eq(taskSubmissions.taskId, taskId))
      .orderBy(desc(taskSubmissions.submittedAt));

    console.log('results', results);

    return Promise.all(
      results.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          performerAdminName: row.performerAdminUser,
          performerSupervisorName: row.performerSupervisorUser,
          performerEmployeeName: row.performerEmployeeUser,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
          reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
        }),
      ),
    );
  }

  async findByPerformerId(performerId: string): Promise<TaskSubmission[]> {
    const results = await this.db
      .select()
      .from(taskSubmissions)
      .where(
        or(
          eq(taskSubmissions.performerAdminId, performerId),
          eq(taskSubmissions.performerSupervisorId, performerId),
          eq(taskSubmissions.performerEmployeeId, performerId),
        ),
      );

    return Promise.all(
      results.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
          reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
        }),
      ),
    );
  }

  async findByStatus(status: string): Promise<TaskSubmission[]> {
    const results = await this.db
      .select()
      .from(taskSubmissions)
      .where(eq(taskSubmissions.status, TaskStatusMapping[status]));

    return Promise.all(
      results.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
          reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
        }),
      ),
    );
  }

  async findAll(): Promise<TaskSubmission[]> {
    const results = await this.db.select().from(taskSubmissions);

    return Promise.all(
      results.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
          reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
        }),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(taskSubmissions).where(eq(taskSubmissions.id, id));
  }

  async findByTaskIds(taskIds: string[]): Promise<TaskSubmission[]> {
    if (taskIds.length === 0) return [];

    const results = await this.db
      .select()
      .from(taskSubmissions)
      .where(inArray(taskSubmissions.taskId, taskIds));

    return Promise.all(
      results.map((row) =>
        this.toDomain({
          id: row.id,
          taskId: row.taskId,
          performerAdminId: row.performerAdminId,
          performerSupervisorId: row.performerSupervisorId,
          performerEmployeeId: row.performerEmployeeId,
          notes: row.notes,
          feedback: row.feedback,
          status: row.status as TaskSubmissionStatus,
          submittedAt: row.submittedAt ? new Date(row.submittedAt) : undefined,
          reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
        }),
      ),
    );
  }
}
