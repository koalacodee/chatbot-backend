import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  DepartmentTaskFilters,
  IndividualTaskFilters,
  TaskRepository,
} from '../../../domain/repositories/task.repository';
import {
  Task,
  TaskAssignmentType,
  TaskPriority,
  TaskStatus,
} from '../../../domain/entities/task.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import {
  Employee,
  EmployeePermissionsEnum,
} from 'src/employee/domain/entities/employee.entity';
import { tasks, employees, departments } from 'src/common/drizzle/schema';
import { eq, inArray, or, and, desc, count, sql, ilike } from 'drizzle-orm';
import {
  TaskAssignmentTypeMapping,
  TaskStatusMapping,
} from './drizzle-task-delegation.repository';
import { TaskPriorityMapping } from './drizzle-task-preset.repository';
import { DepartmentVisibility } from '@prisma/client';

export enum EmployeePermissionsMapping {
  handle_tickets = 'HANDLE_TICKETS',
  handle_tasks = 'HANDLE_TASKS',
  add_faqs = 'ADD_FAQS',
  view_analytics = 'VIEW_ANALYTICS',
  close_tickets = 'CLOSE_TICKETS',
  manage_knowledge_chunks = 'MANAGE_KNOWLEDGE_CHUNKS',
  manage_attachment_groups = 'MANAGE_ATTACHMENT_GROUPS',
}

@Injectable()
export class DrizzleTaskRepository extends TaskRepository {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {
    super();
  }

  private get db() {
    return this.drizzleService.client;
  }

  private async toDomain(row: typeof tasks.$inferSelect): Promise<Task> {
    const [
      assignee,
      assignerSupervisor,
      assignerAdmin,
      approverAdmin,
      approverSupervisor,
      targetDepartment,
      targetSubDepartment,
    ] = await Promise.all([
      row.assigneeId ? this.fetchEmployee(row.assigneeId) : undefined,
      row.assignerSupervisorId
        ? this.supervisorRepository.findById(row.assignerSupervisorId)
        : undefined,
      row.assignerAdminId
        ? this.adminRepository.findById(row.assignerAdminId)
        : undefined,
      undefined, // approverAdmin - not in schema
      undefined, // approverSupervisor - not in schema
      row.targetDepartmentId
        ? this.fetchDepartment(row.targetDepartmentId)
        : undefined,
      row.targetSubDepartmentId
        ? this.fetchDepartment(row.targetSubDepartmentId)
        : undefined,
    ]);

    const assigner = assignerSupervisor ?? assignerAdmin;
    const approver = approverAdmin ?? approverSupervisor;

    if (!row.creatorId) {
      throw new Error('Task must have a creatorId');
    }

    return Task.create({
      id: row.id,
      title: row.title,
      description: row.description,
      assignee: assignee,
      assigner: assigner,
      approver: approver,
      creatorId: row.creatorId,
      status: TaskStatus[row.status.toUpperCase()],
      assignmentType: TaskAssignmentType[row.assignmentType.toUpperCase()],
      priority: TaskPriority[row.priority.toUpperCase()],
      targetDepartment: targetDepartment,
      targetSubDepartment: targetSubDepartment,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
      reminderInterval: row.reminderInterval ?? undefined,
      assigneeId: row.assigneeId ?? undefined,
      targetDepartmentId: row.targetDepartmentId ?? undefined,
      targetSubDepartmentId: row.targetSubDepartmentId ?? undefined,
    });
  }

  private async fetchEmployee(
    employeeId: string,
  ): Promise<Employee | undefined> {
    const result = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    return result.length > 0
      ? Employee.create({
          id: result[0].id,
          userId: result[0].userId,
          permissions: result[0].permissions.map(
            (p) => EmployeePermissionsEnum[EmployeePermissionsMapping[p]],
          ),
          supervisorId: result[0].supervisorId,
        })
      : undefined;
  }

  private async fetchDepartment(
    departmentId: string,
  ): Promise<Department | undefined> {
    const result = await this.db
      .select()
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1);

    return result.length > 0
      ? Department.create({
          ...result[0],
          visibility: DepartmentVisibility[result[0].visibility.toUpperCase()],
        })
      : undefined;
  }

  async save(task: Task): Promise<Task> {
    const data = {
      id: task.id.toString(),
      title: task.title,
      description: task.description,
      assigneeId: task.assignee?.id.toString() ?? null,
      assignerSupervisorId:
        task.assigner && 'supervisor' in task.assigner
          ? task.assigner.id.toString()
          : null,
      assignerAdminId:
        task.assigner && 'admin' in task.assigner
          ? task.assigner.id.toString()
          : null,
      creatorId: task.creatorId,
      status: TaskStatusMapping[task.status],
      assignmentType: TaskAssignmentTypeMapping[task.assignmentType],
      priority: TaskPriorityMapping[task.priority],
      targetDepartmentId: task.targetDepartment?.id.toString() ?? null,
      targetSubDepartmentId: task.targetSubDepartment?.id.toString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
      reminderInterval: task.reminderInterval ?? null,
    };

    await this.db
      .insert(tasks)
      .values(data)
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          title: data.title,
          description: data.description,
          assigneeId: data.assigneeId,
          assignerSupervisorId: data.assignerSupervisorId,
          assignerAdminId: data.assignerAdminId,
          creatorId: data.creatorId,
          status: data.status,
          assignmentType: data.assignmentType,
          priority: data.priority,
          targetDepartmentId: data.targetDepartmentId,
          targetSubDepartmentId: data.targetSubDepartmentId,
          updatedAt: data.updatedAt,
          dueDate: data.dueDate,
          completedAt: data.completedAt,
          reminderInterval: data.reminderInterval,
        },
      });

    return this.findById(task.id.toString());
  }

  async findById(id: string): Promise<Task | null> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async findAll(
    offset?: number,
    limit?: number,
    departmentIds?: string[],
    start?: Date,
    end?: Date,
  ): Promise<Task[]> {
    const whereConditions: any[] = [];

    if (departmentIds && departmentIds.length > 0) {
      whereConditions.push(
        or(
          inArray(tasks.targetDepartmentId, departmentIds),
          inArray(tasks.targetSubDepartmentId, departmentIds),
        ),
      );
    }

    if (start || end) {
      const dateConditions: any[] = [];
      if (start) {
        dateConditions.push(sql`${tasks.createdAt} >= ${start.toISOString()}`);
      }
      if (end) {
        dateConditions.push(sql`${tasks.createdAt} <= ${end.toISOString()}`);
      }
      if (dateConditions.length > 0) {
        whereConditions.push(and(...dateConditions));
      }
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const query = this.db.select().from(tasks).orderBy(desc(tasks.createdAt));

    const results = whereClause
      ? await query
          .where(whereClause)
          .limit(limit ?? 1000)
          .offset(offset ?? 0)
      : await query.limit(limit ?? 1000).offset(offset ?? 0);

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<Task | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.db.delete(tasks).where(eq(tasks.id, id));
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.id, id));
    return Number(result[0]?.count || 0) > 0;
  }

  async count(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(tasks);
    return Number(result[0]?.count || 0);
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    const results = await this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, assigneeId),
          eq(tasks.assignmentType, TaskAssignmentTypeMapping.INDIVIDUAL),
        ),
      )
      .orderBy(desc(tasks.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findByDepartment(departmentId: string): Promise<Task[]> {
    const results = await this.db
      .select()
      .from(tasks)
      .where(
        or(
          eq(tasks.targetDepartmentId, departmentId),
          eq(tasks.targetSubDepartmentId, departmentId),
        ),
      )
      .orderBy(desc(tasks.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findByAssignmentType(
    assignmentType: string,
    targetId?: string,
  ): Promise<Task[]> {
    const whereConditions: any[] = [
      eq(tasks.assignmentType, TaskAssignmentTypeMapping[assignmentType]),
    ];

    if (targetId) {
      if (assignmentType === 'DEPARTMENT') {
        whereConditions.push(eq(tasks.targetDepartmentId, targetId));
      } else if (assignmentType === 'SUB_DEPARTMENT') {
        whereConditions.push(eq(tasks.targetSubDepartmentId, targetId));
      } else if (assignmentType === 'INDIVIDUAL') {
        whereConditions.push(eq(tasks.assigneeId, targetId));
      }
    }

    const results = await this.db
      .select()
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(desc(tasks.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findDepartmentLevelTasks(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<Task[]> {
    const whereConditions: any[] = [
      eq(tasks.assignmentType, TaskAssignmentTypeMapping.DEPARTMENT),
    ];

    if (departmentId) {
      whereConditions.push(eq(tasks.targetDepartmentId, departmentId));
    }

    this.applyFilters(whereConditions, filters);

    const results = await this.db
      .select()
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(desc(tasks.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findSubDepartmentLevelTasks(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<Task[]> {
    const whereConditions: any[] = [
      eq(tasks.assignmentType, TaskAssignmentTypeMapping.SUB_DEPARTMENT),
    ];

    if (subDepartmentId) {
      whereConditions.push(eq(tasks.targetSubDepartmentId, subDepartmentId));
    }

    this.applyFilters(whereConditions, filters);

    const results = await this.db
      .select()
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(desc(tasks.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findSubIndividualsLevelTasks(
    filters?: IndividualTaskFilters,
  ): Promise<Task[]> {
    const whereConditions: any[] = [
      eq(tasks.assignmentType, TaskAssignmentTypeMapping.INDIVIDUAL),
    ];

    if (filters?.assigneeId) {
      whereConditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    this.applyFilters(whereConditions, filters);

    const results = await this.db
      .select()
      .from(tasks)
      .where(and(...whereConditions))
      .orderBy(desc(tasks.createdAt));

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findTeamTasks(options: {
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<Task[]> {
    const { employeeId, subDepartmentId, departmentId, status, offset, limit } =
      options;

    const orConditions: any[] = [];

    if (employeeId) {
      orConditions.push(
        and(
          eq(tasks.assigneeId, employeeId),
          eq(tasks.assignmentType, TaskAssignmentTypeMapping.INDIVIDUAL),
        ),
      );
    }

    if (subDepartmentId) {
      orConditions.push(
        and(
          eq(tasks.targetSubDepartmentId, subDepartmentId),
          eq(tasks.assignmentType, TaskAssignmentTypeMapping.SUB_DEPARTMENT),
        ),
      );
    }

    if (departmentId) {
      orConditions.push(
        and(
          eq(tasks.targetDepartmentId, departmentId),
          eq(tasks.assignmentType, TaskAssignmentTypeMapping.DEPARTMENT),
        ),
      );
    }

    const whereConditions: any[] = [];
    if (orConditions.length > 0) {
      whereConditions.push(or(...orConditions));
    }

    if (status && status.length > 0) {
      whereConditions.push(
        inArray(
          tasks.status,
          status.map((s) => TaskStatusMapping[s]),
        ),
      );
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const query = this.db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(limit ?? 1000)
      .offset(offset ?? 0);

    const results = whereClause ? await query.where(whereClause) : await query;

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    const { supervisorDepartmentIds, status, offset, limit } = options;

    const whereConditions: any[] = [
      inArray(tasks.targetDepartmentId, supervisorDepartmentIds),
    ];

    if (status && status.length > 0) {
      whereConditions.push(
        inArray(
          tasks.status,
          status.map((s) => TaskStatusMapping[s]),
        ),
      );
    }

    const whereClause = and(...whereConditions);

    const [results, totalResult] = await Promise.all([
      this.db
        .select()
        .from(tasks)
        .where(whereClause)
        .orderBy(desc(tasks.createdAt))
        .limit(limit ?? 1000)
        .offset(offset ?? 0),
      this.db.select({ count: count() }).from(tasks).where(whereClause),
    ]);

    const taskList = await Promise.all(results.map((r) => this.toDomain(r)));
    return { tasks: taskList, total: Number(totalResult[0]?.count || 0) };
  }

  async findTasksForEmployee(options: {
    employeeId: string;
    supervisorId: string;
    subDepartmentIds: string[];
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    const {
      employeeId,
      supervisorId,
      subDepartmentIds,
      status,
      offset,
      limit,
    } = options;

    const orConditions: any[] = [
      eq(tasks.assigneeId, employeeId),
      eq(tasks.assignerSupervisorId, supervisorId),
    ];

    if (subDepartmentIds.length > 0) {
      orConditions.push(inArray(tasks.targetSubDepartmentId, subDepartmentIds));
    }

    const whereConditions: any[] = [or(...orConditions)];

    if (status && status.length > 0) {
      whereConditions.push(
        inArray(
          tasks.status,
          status.map((s) => TaskStatusMapping[s]),
        ),
      );
    }

    const whereClause = and(...whereConditions);

    const [results, totalResult] = await Promise.all([
      this.db
        .select()
        .from(tasks)
        .where(whereClause)
        .orderBy(desc(tasks.createdAt))
        .limit(limit ?? 1000)
        .offset(offset ?? 0),
      this.db.select({ count: count() }).from(tasks).where(whereClause),
    ]);

    const taskList = await Promise.all(results.map((r) => this.toDomain(r)));
    return { tasks: taskList, total: Number(totalResult[0]?.count || 0) };
  }

  async getTaskMetricsForSupervisor(
    supervisorDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    if (supervisorDepartmentIds.length === 0) {
      return { pendingCount: 0, completedCount: 0, completionPercentage: 0 };
    }

    const result = await this.db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(inArray(tasks.targetDepartmentId, supervisorDepartmentIds))
      .groupBy(tasks.status);

    return this.computeTaskMetrics(result);
  }

  async getTaskMetricsForEmployee(
    employeeId: string,
    supervisorId: string,
    subDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    const orConditions: any[] = [
      eq(tasks.assigneeId, employeeId),
      eq(tasks.assignerSupervisorId, supervisorId),
    ];

    if (subDepartmentIds.length > 0) {
      orConditions.push(inArray(tasks.targetSubDepartmentId, subDepartmentIds));
    }

    const result = await this.db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(or(...orConditions))
      .groupBy(tasks.status);

    return this.computeTaskMetrics(result);
  }

  async getTaskMetricsForDepartment(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    const whereConditions: any[] = [
      eq(tasks.assignmentType, TaskAssignmentTypeMapping.DEPARTMENT),
    ];

    if (departmentId) {
      whereConditions.push(eq(tasks.targetDepartmentId, departmentId));
    }

    this.applyFilters(whereConditions, filters);

    const result = await this.db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(and(...whereConditions))
      .groupBy(tasks.status);

    return this.computeTaskMetrics(result);
  }

  async getTaskMetricsForSubDepartment(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    const whereConditions: any[] = [
      eq(tasks.assignmentType, TaskAssignmentTypeMapping.SUB_DEPARTMENT),
    ];

    if (subDepartmentId) {
      whereConditions.push(eq(tasks.targetSubDepartmentId, subDepartmentId));
    }

    this.applyFilters(whereConditions, filters);

    const result = await this.db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(and(...whereConditions))
      .groupBy(tasks.status);

    return this.computeTaskMetrics(result);
  }

  async getTaskMetricsForIndividual(filters?: IndividualTaskFilters): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    const whereConditions: any[] = [
      eq(tasks.assignmentType, TaskAssignmentTypeMapping.INDIVIDUAL),
    ];

    if (filters?.assigneeId) {
      whereConditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    this.applyFilters(whereConditions, filters);

    const result = await this.db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(and(...whereConditions))
      .groupBy(tasks.status);

    return this.computeTaskMetrics(result);
  }

  async findTaskForReminder(taskId: string): Promise<Task | null> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.id, taskId), eq(tasks.status, TaskStatusMapping.TODO)),
      )
      .limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  private applyFilters(
    whereConditions: any[],
    filters?: DepartmentTaskFilters | IndividualTaskFilters,
  ): void {
    if (filters?.status?.length) {
      whereConditions.push(
        inArray(
          tasks.status,
          filters.status.map((s) => TaskStatusMapping[s]),
        ),
      );
    }

    if (filters?.priority?.length) {
      whereConditions.push(
        inArray(
          tasks.priority,
          filters.priority.map((p) => TaskPriorityMapping[p]),
        ),
      );
    }

    const search = filters?.search?.trim();
    if (search) {
      whereConditions.push(
        or(
          ilike(tasks.title, `%${search}%`),
          ilike(tasks.description, `%${search}%`),
        ),
      );
    }
  }

  private computeTaskMetrics(
    grouped: Array<{ status: string; count: number }>,
  ): {
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  } {
    const pendingStatuses = new Set<string>([
      TaskStatus.TODO,
      TaskStatus.SEEN,
      TaskStatus.PENDING_REVIEW,
      'to_do',
      'seen',
      'pending_review',
    ]);

    let pendingCount = 0;
    let completedCount = 0;

    for (const row of grouped) {
      const countValue = Number(row.count);
      const status = row.status.toLowerCase();

      if (pendingStatuses.has(status)) {
        pendingCount += countValue;
      } else if (
        status === TaskStatus.COMPLETED.toLowerCase() ||
        status === 'completed'
      ) {
        completedCount += countValue;
      }
    }

    const total = pendingCount + completedCount;
    const completionPercentage =
      total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      pendingCount,
      completedCount,
      completionPercentage,
    };
  }
}
