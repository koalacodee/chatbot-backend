import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  DepartmentTaskFilters,
  EmployeeTasksResult,
  IndividualTaskFilters,
  MyTasksResult,
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
import {
  tasks,
  employees,
  departments,
  employeeSubDepartments,
  taskDelegations,
  attachments,
  supervisors,
  departmentToSupervisor,
  taskSubmissions,
} from 'src/common/drizzle/schema';
import {
  eq,
  inArray,
  or,
  and,
  desc,
  count,
  sql,
  ilike,
  SQL,
} from 'drizzle-orm';
import {
  TaskAssignmentTypeMapping,
  TaskStatusMapping,
} from './drizzle-task-delegation.repository';
import { TaskPriorityMapping } from './drizzle-task-preset.repository';
import { DepartmentVisibility } from '@prisma/client';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { TaskDelegation } from 'src/task/domain/entities/task-delegation.entity';

export enum EmployeePermissionsMapping {
  handle_tickets = 'HANDLE_TICKETS',
  handle_tasks = 'HANDLE_TASKS',
  add_faqs = 'ADD_FAQS',
  view_analytics = 'VIEW_ANALYTICS',
  close_tickets = 'CLOSE_TICKETS',
  manage_knowledge_chunks = 'MANAGE_KNOWLEDGE_CHUNKS',
  manage_attachment_groups = 'MANAGE_ATTACHMENT_GROUPS',
}

function drizzleToDomainStatus(
  status: (typeof tasks.$inferSelect)['status'],
): TaskStatus {
  switch (status) {
    case 'to_do':
      return TaskStatus.TODO;
    case 'seen':
      return TaskStatus.SEEN;
    case 'pending_review':
      return TaskStatus.PENDING_REVIEW;
    case 'completed':
      return TaskStatus.COMPLETED;
    default:
      throw new Error(`Invalid status: ${status}`);
  }
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

    const whereConditions: SQL[] = [
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

  async getTasksAndDelegationsForEmployee(options: {
    employeeUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    offset: number;
    limit: number;
  }): Promise<EmployeeTasksResult> {
    const {
      employeeUserId,
      status,
      priority,
      offset = 0,
      limit = 20,
    } = options;
    /* ---------- 1.  employee meta (unchanged) ---------- */
    const [emp] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.userId, employeeUserId))
      .limit(1);
    if (!emp) throw new Error('employee not found');
    const empId = emp.id;

    const employeeDepartmentIds = await this.db
      .select({ id: employeeSubDepartments.departmentId })
      .from(employeeSubDepartments)
      .where(eq(employeeSubDepartments.employeeId, empId))
      .then((r) => r.map((i) => i.id));

    /* ---------- 2.  reusable filter fragments ---------- */
    const taskWhere =
      status?.length || priority?.length
        ? and(
            or(
              eq(tasks.assigneeId, empId),
              inArray(tasks.targetSubDepartmentId, employeeDepartmentIds),
            ),
            status.length
              ? inArray(
                  tasks.status,
                  status.map((s) => TaskStatusMapping[s]),
                )
              : undefined,
            priority.length
              ? inArray(
                  tasks.priority,
                  priority.map((p) => TaskPriorityMapping[p]),
                )
              : undefined,
          )
        : or(
            eq(tasks.assigneeId, empId),
            inArray(tasks.targetSubDepartmentId, employeeDepartmentIds),
          );

    const delWhere = status?.length
      ? and(
          or(
            eq(taskDelegations.assigneeId, empId),
            inArray(
              taskDelegations.targetSubDepartmentId,
              employeeDepartmentIds,
            ),
          ),
          inArray(
            taskDelegations.status,
            status.map((s) => TaskStatusMapping[s]),
          ),
        )
      : or(
          eq(taskDelegations.assigneeId, empId),
          inArray(taskDelegations.targetSubDepartmentId, employeeDepartmentIds),
        );

    const stmt = this.db.$with('g').as(
      this.db
        .select({
          tc: sql<number>`count(*) filter (where status = 'completed')`
            .mapWith(Number)
            .as('tc'),
          tp: sql<number>`count(*) filter (where status <> 'completed')`
            .mapWith(Number)
            .as('tp'),
        })
        .from(tasks)
        .where(taskWhere) // filter tasks once
        .unionAll(
          this.db
            .select({
              tc: sql<number>`count(*) filter (where status = 'completed')`
                .mapWith(Number)
                .as('tc'),
              tp: sql<number>`count(*) filter (where status <> 'completed')`
                .mapWith(Number)
                .as('tp'),
            })
            .from(taskDelegations)
            .where(delWhere), // filter delegations once
        ),
    );

    /* ---------- 4.  paginated rows (same filter) ---------- */
    const [tasksPage, delegationsPage, [taskAgg, delAgg]] = await Promise.all([
      this.db.select().from(tasks).where(taskWhere).limit(limit).offset(offset),
      this.db
        .select({
          task: {
            ...tasks,
          },
          delegation: {
            ...taskDelegations,
          },
        })
        .from(taskDelegations)
        .innerJoin(tasks, eq(taskDelegations.taskId, tasks.id))
        .where(delWhere)
        .limit(limit)
        .offset(offset),
      this.db.with(stmt).select({ tc: stmt.tc, tp: stmt.tp }).from(stmt),
    ]);

    const metrics = {
      completedTasks: taskAgg.tc,
      pendingTasks: taskAgg.tp,
      completedDelegations: delAgg.tc,
      pendingDelegations: delAgg.tp,
    };
    /* ---------- 5.  attachments for this page only ---------- */
    const targetIds = [
      ...tasksPage.map((t) => t.id),
      ...delegationsPage.map((d) => d.delegation.taskId),
    ];
    const attachmentResults = targetIds.length
      ? await this.db
          .select()
          .from(attachments)
          .where(inArray(attachments.targetId, targetIds))
      : [];

    const tasksTotal = metrics.completedTasks + metrics.pendingTasks;
    const delegationsTotal =
      metrics.completedDelegations + metrics.pendingDelegations;

    const combinedCompleted =
      metrics.completedTasks + metrics.completedDelegations;
    const combinedTotal = tasksTotal + delegationsTotal;

    const combinedCompletionPercentage =
      combinedTotal === 0 ? 0 : combinedCompleted / combinedTotal;

    /* ---------- 6.  return ---------- */
    return {
      tasks: tasksPage.map((task) =>
        Task.create({
          id: task.id,
          title: task.title,
          description: task.description,
          status: TaskStatusMapping[task.status.toUpperCase()],
          priority: TaskPriority[task.priority.toUpperCase()],
          assigneeId: task.assigneeId,
          targetSubDepartmentId: task.targetSubDepartmentId,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          creatorId: task.creatorId,
          assignmentType: TaskAssignmentType[task.assignmentType],
        }),
      ),
      delegations: delegationsPage.map((delegation) =>
        TaskDelegation.create({
          id: delegation.delegation.id,
          taskId: delegation.delegation.taskId,
          assigneeId: delegation.delegation.assigneeId,
          targetSubDepartmentId: delegation.delegation.targetSubDepartmentId,
          status: TaskStatusMapping[delegation.delegation.status.toUpperCase()],
          createdAt: new Date(delegation.delegation.createdAt),
          updatedAt: new Date(delegation.delegation.updatedAt),
          assignmentType:
            TaskAssignmentType[delegation.delegation.assignmentType],
          delegatorId: delegation.delegation.delegatorId,
          task: Task.create({
            id: delegation.task.id,
            title: delegation.task.title,
            description: delegation.task.description,
            status: TaskStatusMapping[delegation.task.status.toUpperCase()],
            priority: TaskPriority[delegation.task.priority.toUpperCase()],
            assigneeId: delegation.task.assigneeId,
            targetSubDepartmentId: delegation.task.targetSubDepartmentId,
            targetDepartmentId: delegation.task.targetDepartmentId,
            createdAt: new Date(delegation.task.createdAt),
            updatedAt: new Date(delegation.task.updatedAt),
            creatorId: delegation.task.creatorId,
            assignmentType: TaskAssignmentType[delegation.task.assignmentType],
          }),
        }),
      ),
      total: taskAgg.tp + delAgg.tp + taskAgg.tc + delAgg.tc,
      fileHubAttachments: attachmentResults.map((attachment) =>
        Attachment.create({
          id: attachment.id,
          targetId: attachment.targetId,
          type: attachment.type,
          filename: attachment.filename,
          createdAt: new Date(attachment.createdAt),
          updatedAt: new Date(attachment.updatedAt),
          originalName: attachment.originalName,
          size: attachment.size,
        }),
      ),
      metrics: {
        ...metrics,
        taskCompletionPercentage:
          metrics.completedTasks + metrics.pendingTasks === 0
            ? 0
            : metrics.completedTasks /
              (metrics.completedTasks + metrics.pendingTasks),
        delegationCompletionPercentage:
          metrics.completedDelegations + metrics.pendingDelegations === 0
            ? 0
            : metrics.completedDelegations /
              (metrics.completedDelegations + metrics.pendingDelegations),
        totalPercentage: combinedCompletionPercentage,
      },
    };
  }

  async getTasksForSupervisor(options: {
    supervisorUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    offset: number;
    limit: number;
  }): Promise<MyTasksResult> {
    const { supervisorUserId, status, priority, offset, limit } = options;

    const [supervisor] = await this.db
      .select()
      .from(supervisors)
      .where(eq(supervisors.userId, supervisorUserId))
      .limit(1);

    if (!supervisor) {
      throw new Error('Supervisor not found');
    }

    const supervisorDepartmentIds = await this.db
      .select()
      .from(departmentToSupervisor)
      .where(eq(departmentToSupervisor.b, supervisor.id))
      .then((res) => res.map((r) => r.a));

    const tasksWhere =
      status?.length > 0 || priority?.length > 0
        ? and(
            inArray(tasks.targetDepartmentId, supervisorDepartmentIds),
            status?.length > 0
              ? inArray(
                  tasks.status,
                  status.map((s) => TaskStatusMapping[s]),
                )
              : undefined,
            priority?.length > 0
              ? inArray(
                  tasks.priority,
                  priority.map((p) => TaskPriorityMapping[p]),
                )
              : undefined,
          )
        : inArray(tasks.targetDepartmentId, supervisorDepartmentIds);

    const [tasksPage, [taskAgg]] = await Promise.all([
      this.db.query.tasks.findMany({
        where: tasksWhere,
        limit: limit,
        offset: offset,
        with: {
          taskSubmissions: {
            columns: {
              feedback: true,
              status: true,
            },
          },
        },
      }),
      this.db
        .select({
          tc: sql<number>`count(*) filter (where status = 'completed')`
            .mapWith(Number)
            .as('tc'),
          tp: sql<number>`count(*) filter (where status <> 'completed')`
            .mapWith(Number)
            .as('tp'),
        })
        .from(tasks)
        .where(tasksWhere),
    ]);

    const metrics = {
      completedTasks: taskAgg.tc,
      pendingTasks: taskAgg.tp,
    };
    /* ---------- 5.  attachments for this page only ---------- */
    const targetIds = tasksPage.map((t) => t.id);
    const attachmentResults = targetIds.length
      ? await this.db
          .select()
          .from(attachments)
          .where(inArray(attachments.targetId, targetIds))
      : [];

    return {
      tasks: tasksPage.map((task) => {
        const { taskSubmissions } = task;
        return {
          task: Task.create({
            id: task.id,
            title: task.title,
            description: task.description,
            status: drizzleToDomainStatus(task.status),
            priority: TaskPriority[task.priority.toUpperCase()],
            assigneeId: task.assigneeId,
            targetSubDepartmentId: task.targetSubDepartmentId,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            creatorId: task.creatorId,
            assignmentType: TaskAssignmentType[task.assignmentType],
            targetDepartmentId: task.targetDepartmentId,
          }),
          rejectionReason: taskSubmissions.find(
            (submission) => submission.status === 'rejected',
          )?.feedback,
          approvalFeedback: taskSubmissions.find(
            (submission) => submission.status === 'approved',
          )?.feedback,
        };
      }),
      total: taskAgg.tp + taskAgg.tc,
      fileHubAttachments: attachmentResults.map((attachment) =>
        Attachment.create({
          id: attachment.id,
          targetId: attachment.targetId,
          type: attachment.type,
          filename: attachment.filename,
          createdAt: new Date(attachment.createdAt),
          updatedAt: new Date(attachment.updatedAt),
          originalName: attachment.originalName,
          size: attachment.size,
        }),
      ),
      metrics: {
        completedTasks: metrics.completedTasks,
        pendingTasks: metrics.pendingTasks,
        taskCompletionPercentage:
          (metrics.completedTasks /
            (metrics.completedTasks + metrics.pendingTasks)) *
          100,
      },
    };
  }
}
