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
import { TaskSubmission, TaskSubmissionStatus } from '../../../domain/entities/task-submission.entity';
import { Department, DepartmentVisibility } from 'src/department/domain/entities/department.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { User } from 'src/shared/entities/user.entity';
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
  taskDelegationSubmissions,
  admins,
  users,
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
  exists,
  asc,
} from 'drizzle-orm';
// import { DepartmentVisibility } from '@prisma/client';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { TaskDelegation } from 'src/task/domain/entities/task-delegation.entity';
import {
  createCursorPagination,
  CursorInput,
  PaginatedArrayResult,
} from 'src/common/drizzle/helpers/cursor';
import { TaskDelegationSubmission } from 'src/task/domain/entities/task-delegation-submission.entity';

type TaskCursorData = { createdAt: string; id: string };
type DrizzleTaskStatus = "to_do" | "seen" | "pending_review" | "completed"
type DrizzleTaskPriority = "low" | "medium" | "high"
type DrizzleTaskAssignmentType = "individual" | "department" | "sub_department"
export function drizzleToDomainStatus(
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

export function domainToDrizzleStatus(
  status: TaskStatus,
): (typeof tasks.$inferSelect)['status'] {
  switch (status) {
    case TaskStatus.TODO:
      return 'to_do';
    case TaskStatus.SEEN:
      return 'seen';
    case TaskStatus.PENDING_REVIEW:
      return 'pending_review';
    case TaskStatus.COMPLETED:
      return 'completed';
    default:
      throw new Error(`Invalid status: ${status}`);
  }
}

export function drizzleToDomainPriority(
  priority: (typeof tasks.$inferSelect)['priority'],
): TaskPriority {
  switch (priority) {
    case 'low':
      return TaskPriority.LOW;
    case 'medium':
      return TaskPriority.MEDIUM;
    case 'high':
      return TaskPriority.HIGH;
    default:
      throw new Error(`Invalid priority: ${priority}`);
  }
}

export function domainToDrizzlePriority(
  priority: TaskPriority,
): (typeof tasks.$inferSelect)['priority'] {
  switch (priority) {
    case TaskPriority.LOW:
      return 'low';
    case TaskPriority.MEDIUM:
      return 'medium';
    case TaskPriority.HIGH:
      return 'high';
    default:
      throw new Error(`Invalid priority: ${priority}`);
  }
}

export function drizzleToDomainAssignmentType(
  assignmentType: (typeof tasks.$inferSelect)['assignmentType'],
): TaskAssignmentType {
  switch (assignmentType) {
    case 'individual':
      return TaskAssignmentType.INDIVIDUAL;
    case 'department':
      return TaskAssignmentType.DEPARTMENT;
    case 'sub_department':
      return TaskAssignmentType.SUB_DEPARTMENT;
    default:
      throw new Error(`Invalid assignment type: ${assignmentType}`);
  }
}

export function mapDomainAssignmentTypeToDrizzleAssignmentType(
  assignmentType: TaskAssignmentType,
): (typeof tasks.$inferSelect)['assignmentType'] {
  switch (assignmentType) {
    case TaskAssignmentType.INDIVIDUAL:
      return 'individual';
    case TaskAssignmentType.DEPARTMENT:
      return 'department';
    case TaskAssignmentType.SUB_DEPARTMENT:
      return 'sub_department';
    default:
      throw new Error(`Invalid assignment type: ${assignmentType}`);
  }
}

export function domainToDrizzleSubmissionStatus(
  status: TaskSubmissionStatus,
): (typeof taskSubmissions.$inferSelect)['status'] {
  switch (status) {
    case TaskSubmissionStatus.SUBMITTED:
      return 'submitted';
    case TaskSubmissionStatus.APPROVED:
      return 'approved';
    case TaskSubmissionStatus.REJECTED:
      return 'rejected';
    default:
      throw new Error(`Invalid submission status: ${status}`);
  }
}

export function drizzleToDomainSubmissionStatus(
  status: (typeof taskSubmissions.$inferSelect)['status'],
): TaskSubmissionStatus {
  switch (status) {
    case 'submitted':
      return TaskSubmissionStatus.SUBMITTED;
    case 'approved':
      return TaskSubmissionStatus.APPROVED;
    case 'rejected':
      return TaskSubmissionStatus.REJECTED;
    default:
      throw new Error(`Invalid submission status: ${status}`);
  }
}

export function domainToDrizzlePermission(
  permission: EmployeePermissionsEnum,
): (typeof employees.$inferSelect)['permissions'][number] {
  switch (permission) {
    case EmployeePermissionsEnum.HANDLE_TICKETS:
      return 'handle_tickets';
    case EmployeePermissionsEnum.HANDLE_TASKS:
      return 'handle_tasks';
    case EmployeePermissionsEnum.ADD_FAQS:
      return 'add_faqs';
    case EmployeePermissionsEnum.VIEW_ANALYTICS:
      return 'view_analytics';
    case EmployeePermissionsEnum.CLOSE_TICKETS:
      return 'close_tickets';
    case EmployeePermissionsEnum.MANAGE_KNOWLEDGE_CHUNKS:
      return 'manage_knowledge_chunks';
    case EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS:
      return 'manage_attachment_groups';
    default:
      throw new Error(`Invalid permission: ${permission}`);
  }
}

export function drizzleToDomainPermission(
  permission: (typeof employees.$inferSelect)['permissions'][number],
): EmployeePermissionsEnum {
  switch (permission) {
    case 'handle_tickets':
      return EmployeePermissionsEnum.HANDLE_TICKETS;
    case 'handle_tasks':
      return EmployeePermissionsEnum.HANDLE_TASKS;
    case 'add_faqs':
      return EmployeePermissionsEnum.ADD_FAQS;
    case 'view_analytics':
      return EmployeePermissionsEnum.VIEW_ANALYTICS;
    case 'close_tickets':
      return EmployeePermissionsEnum.CLOSE_TICKETS;
    case 'manage_knowledge_chunks':
      return EmployeePermissionsEnum.MANAGE_KNOWLEDGE_CHUNKS;
    case 'manage_attachment_groups':
      return EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS;
    default:
      throw new Error(`Invalid permission: ${permission}`);
  }
}

export function drizzleToDomainVisibility(
  visibility: (typeof departments.$inferSelect)['visibility'],
): DepartmentVisibility {
  switch (visibility) {
    case 'public':
      return DepartmentVisibility.PUBLIC;
    case 'private':
      return DepartmentVisibility.PRIVATE;
  }
}

@Injectable()
export class DrizzleTaskRepository extends TaskRepository {
  private readonly pagination = createCursorPagination<TaskCursorData>({
    table: tasks,
    cursorFields: [
      { column: tasks.createdAt, key: 'createdAt' },
      { column: tasks.id, key: 'id' },
    ],
    defaultPageSize: 10,
    sortDirection: 'desc',
  });

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

  private async toDomain(row: any): Promise<Task> {
    const [
      assignee,
      assigner,
      targetDepartment,
      targetSubDepartment,
      creator,
    ] = await Promise.all([
      // Assignee
      row.employee
        ? Employee.create({
          id: row.employee.id,
          userId: row.employee.userId,
          permissions: row.employee.permissions.map((p: any) =>
            drizzleToDomainPermission(p),
          ),
          supervisorId: row.employee.supervisorId,
          user: row.employee.user
            ? await User.create(
              {
                ...row.employee.user,
                role: row.employee.user.role.toUpperCase(),
              },
              false,
            )
            : undefined,
        })
        : row.assigneeId
          ? this.fetchEmployee(row.assigneeId)
          : undefined,

      // Assigner
      row.admin
        ? Promise.resolve(
          Admin.create({
            id: row.admin.id,
            userId: row.admin.userId,
            user: row.admin.user
              ? await User.create(
                {
                  ...row.admin.user,
                  role: row.admin.user.role.toUpperCase(),
                },
                false,
              )
              : undefined,
          }),
        )
        : row.supervisor
          ? Promise.resolve(
            Supervisor.create({
              id: row.supervisor.id,
              userId: row.supervisor.userId,
              permissions: row.supervisor.permissions.map((p: any) =>
                p.toUpperCase(),
              ),
              user: row.supervisor.user
                ? await User.create(
                  {
                    ...row.supervisor.user,
                    role: row.supervisor.user.role.toUpperCase(),
                  },
                  false,
                )
                : undefined,
            }),
          )
          : Promise.all([
            row.assignerSupervisorId
              ? this.supervisorRepository.findById(row.assignerSupervisorId)
              : undefined,
            row.assignerAdminId
              ? this.adminRepository.findById(row.assignerAdminId)
              : undefined,
          ]).then(([s, a]) => s ?? a),

      // Target Department
      row.department_targetDepartmentId
        ? Promise.resolve(
          Department.create({
            ...row.department_targetDepartmentId,
            visibility: drizzleToDomainVisibility(
              row.department_targetDepartmentId.visibility,
            ),
          }),
        )
        : row.targetDepartmentId
          ? this.fetchDepartment(row.targetDepartmentId)
          : undefined,

      // Target Sub-Department
      row.department_targetSubDepartmentId
        ? Promise.resolve(
          Department.create({
            ...row.department_targetSubDepartmentId,
            visibility: drizzleToDomainVisibility(
              row.department_targetSubDepartmentId.visibility,
            ),
          }),
        )
        : row.targetSubDepartmentId
          ? this.fetchDepartment(row.targetSubDepartmentId)
          : undefined,

      // Creator
      row.user
        ? User.create(
          {
            ...row.user,
            role: row.user.role.toUpperCase(),
          },
          false,
        )
        : undefined,
    ]);

    if (!row.creatorId) {
      throw new Error('Task must have a creatorId');
    }

    return Task.create({
      id: row.id,
      title: row.title,
      description: row.description,
      assignee: assignee,
      assigner: assigner as Admin | Supervisor,
      creatorId: row.creatorId,
      creator: creator,
      status: drizzleToDomainStatus(row.status),
      assignmentType: drizzleToDomainAssignmentType(row.assignmentType),
      priority: drizzleToDomainPriority(row.priority),
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
        permissions: result[0].permissions.map((p) =>
          drizzleToDomainPermission(p),
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
        visibility: drizzleToDomainVisibility(result[0].visibility),
      })
      : undefined;
  }

  private toISOStringSafe(
    date: Date | string | undefined | null,
  ): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return null;
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
      status: domainToDrizzleStatus(task.status),
      assignmentType: mapDomainAssignmentTypeToDrizzleAssignmentType(
        task.assignmentType,
      ),
      priority: domainToDrizzlePriority(task.priority),
      targetDepartmentId: task.targetDepartment?.id.toString() ?? null,
      targetSubDepartmentId: task.targetSubDepartment?.id.toString() ?? null,
      createdAt:
        task.createdAt instanceof Date
          ? task.createdAt.toISOString()
          : (task.createdAt ?? new Date().toISOString()),
      updatedAt: new Date().toISOString(),
      completedAt: this.toISOStringSafe(task.completedAt),
      dueDate: this.toISOStringSafe(task.dueDate),
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
    const result = await this.db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    return result ? this.toDomain(result) : null;
  }

  async findByIds(ids: string[]): Promise<Task[]> {
    if (ids.length === 0) return [];
    const results = await this.db.query.tasks.findMany({
      where: inArray(tasks.id, ids),
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    return Promise.all(results.map((r) => this.toDomain(r)));
  }

  async findAll(
    filters?: {
      cursor?: CursorInput;
      departmentIds?: string[];
      start?: Date;
      end?: Date;
    },
  ): Promise<PaginatedArrayResult<Task>> {
    const whereConditions: any[] = [];
    const {
      cursor: cursorInput,
      departmentIds,
      start,
      end
    } = filters ?? {};

    // Parse pagination input
    const paginationParams = this.pagination.parseInput(cursorInput);

    // Department filter
    if (departmentIds && departmentIds.length > 0) {
      whereConditions.push(
        or(
          inArray(tasks.targetDepartmentId, departmentIds),
          inArray(tasks.targetSubDepartmentId, departmentIds),
        ),
      );
    }

    // Date range filter
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

    // Cursor filter
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );
    if (cursorCondition) {
      whereConditions.push(cursorCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const results = await this.db.query.tasks.findMany({
      where: whereClause,
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    // Process results and build meta
    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
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

  async findByAssignee(assigneeId: string, cursor?: CursorInput): Promise<PaginatedArrayResult<Task>> {
    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const whereConditions: any[] = [
      eq(tasks.assigneeId, assigneeId),
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.INDIVIDUAL)),
    ];
    if (cursorCondition) whereConditions.push(cursorCondition);

    const results = await this.db.query.tasks.findMany({
      where: and(...whereConditions),
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findByDepartment(departmentId: string, cursor?: CursorInput): Promise<PaginatedArrayResult<Task>> {
    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const whereConditions: any[] = [
      or(
        eq(tasks.targetDepartmentId, departmentId),
        eq(tasks.targetSubDepartmentId, departmentId),
      ),
    ];
    if (cursorCondition) whereConditions.push(cursorCondition);

    const results = await this.db.query.tasks.findMany({
      where: and(...whereConditions),
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findByAssignmentType(
    assignmentType: string,
    targetId?: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<Task>> {
    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const whereConditions: any[] = [
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(assignmentType as TaskAssignmentType)),
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

    if (cursorCondition) whereConditions.push(cursorCondition);

    const results = await this.db.query.tasks.findMany({
      where: and(...whereConditions),
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findDepartmentLevelTasks(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<PaginatedArrayResult<Task>> {
    const paginationParams = this.pagination.parseInput(filters?.cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const whereConditions: any[] = [
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.DEPARTMENT)),
    ];

    if (departmentId) {
      whereConditions.push(eq(tasks.targetDepartmentId, departmentId));
    }

    this.applyFilters(whereConditions, filters);
    if (cursorCondition) whereConditions.push(cursorCondition);

    const results = await this.db.query.tasks.findMany({
      where: and(...whereConditions),
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findSubDepartmentLevelTasks(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<PaginatedArrayResult<Task>> {
    const paginationParams = this.pagination.parseInput(filters?.cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const whereConditions: any[] = [
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.SUB_DEPARTMENT)),
    ];

    if (subDepartmentId) {
      whereConditions.push(eq(tasks.targetSubDepartmentId, subDepartmentId));
    }

    this.applyFilters(whereConditions, filters);
    if (cursorCondition) whereConditions.push(cursorCondition);

    const results = await this.db.query.tasks.findMany({
      where: and(...whereConditions),
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findSubIndividualsLevelTasks(
    filters?: IndividualTaskFilters,
  ): Promise<PaginatedArrayResult<Task>> {
    const paginationParams = this.pagination.parseInput(filters?.cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const whereConditions: any[] = [
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.INDIVIDUAL)),
    ];

    if (filters?.assigneeId) {
      whereConditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    this.applyFilters(whereConditions, filters);
    if (cursorCondition) whereConditions.push(cursorCondition);

    const results = await this.db.query.tasks.findMany({
      where: and(...whereConditions),
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findTeamTasks(options: {
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: TaskStatus[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>> {
    const { employeeId, subDepartmentId, departmentId, status, cursor } = options;

    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const orConditions: any[] = [];

    if (employeeId) {
      orConditions.push(
        and(
          eq(tasks.assigneeId, employeeId),
          eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.INDIVIDUAL)),
        ),
      );
    }

    if (subDepartmentId) {
      orConditions.push(
        and(
          eq(tasks.targetSubDepartmentId, subDepartmentId),
          eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.SUB_DEPARTMENT)),
        ),
      );
    }

    if (departmentId) {
      orConditions.push(
        and(
          eq(tasks.targetDepartmentId, departmentId),
          eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.DEPARTMENT)),
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
          status.map((s) => domainToDrizzleStatus(s)),
        ),
      );
    }

    if (cursorCondition) whereConditions.push(cursorCondition);

    const results = await this.db.query.tasks.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: TaskStatus[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>> {
    const { supervisorDepartmentIds, status, cursor } = options;

    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

    const whereConditions: SQL[] = [
      inArray(tasks.targetDepartmentId, supervisorDepartmentIds),
    ];

    if (status && status.length > 0) {
      whereConditions.push(
        inArray(
          tasks.status,
          status.map((s) => domainToDrizzleStatus(s)),
        ),
      );
    }

    if (cursorCondition) whereConditions.push(cursorCondition);

    const whereClause = and(...whereConditions);

    const results = await this.db.query.tasks.findMany({
      where: whereClause,
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
  }

  async findTasksForEmployee(options: {
    employeeId: string;
    supervisorId: string;
    subDepartmentIds: string[];
    status?: TaskStatus[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>> {
    const {
      employeeId,
      supervisorId,
      subDepartmentIds,
      status,
      cursor,
    } = options;

    const paginationParams = this.pagination.parseInput(cursor);
    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData,
      paginationParams.direction,
    );

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
          status.map((s) => domainToDrizzleStatus(s)),
        ),
      );
    }

    if (cursorCondition) whereConditions.push(cursorCondition);

    const whereClause = and(...whereConditions);

    const results = await this.db.query.tasks.findMany({
      where: whereClause,
      orderBy: this.pagination.getOrderBy(),
      limit: paginationParams.limit,
      with: {
        employee: { with: { user: true } },
        admin: { with: { user: true } },
        supervisor: { with: { user: true } },
        department_targetDepartmentId: true,
        department_targetSubDepartmentId: true,
        user: true,
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    return {
      data: await Promise.all(data.map((r) => this.toDomain(r))),
      meta,
    };
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
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.DEPARTMENT)),
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
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.SUB_DEPARTMENT)),
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
      eq(tasks.assignmentType, mapDomainAssignmentTypeToDrizzleAssignmentType(TaskAssignmentType.INDIVIDUAL)),
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
        and(eq(tasks.id, taskId), eq(tasks.status, domainToDrizzleStatus(TaskStatus.TODO))),
      )
      .limit(1);

    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async restart(taskId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // 1. Update task status back to TODO and clear completedAt
      await tx
        .update(tasks)
        .set({
          status: 'to_do',
          completedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(tasks.id, taskId));

      // 2. Delete task submissions
      await tx.delete(taskSubmissions).where(eq(taskSubmissions.taskId, taskId));

      // 3. Delete task delegation submissions
      await tx
        .delete(taskDelegationSubmissions)
        .where(eq(taskDelegationSubmissions.taskId, taskId));

      // 4. Delete task delegations
      await tx.delete(taskDelegations).where(eq(taskDelegations.taskId, taskId));
    });
  }

  private applyFilters(
    whereConditions: any[],
    filters?: DepartmentTaskFilters | IndividualTaskFilters,
  ): void {
    if (filters?.status?.length) {
      whereConditions.push(
        inArray(
          tasks.status,
          filters.status.map((s) => domainToDrizzleStatus(s)),
        ),
      );
    }

    if (filters?.priority?.length) {
      whereConditions.push(
        inArray(
          tasks.priority,
          filters.priority.map((p) => domainToDrizzlePriority(p)),
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
    cursor?: CursorInput;
    search?: string;
  }): Promise<PaginatedArrayResult<{
    task: Task;
    rejectionReason?: string;
    approvalFeedback?: string;
  }> & {
    delegations: TaskDelegation[];
    fileHubAttachments: Attachment[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      pendingDelegations: number;
      completedDelegations: number;
      taskCompletionPercentage: number;
      delegationCompletionPercentage: number;
      totalPercentage: number;
    };
  }> {
    const {
      employeeUserId,
      status,
      priority,
      cursor,
      search,
    } = options;

    const paginationParams = this.pagination.parseInput(cursor);
    const { limit } = paginationParams;

    /* ---------- 1. Employee meta ---------- */
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

    /* ---------- 2. Build unified filter conditions ---------- */

    // Common status filter
    const statusFilter = status?.length
      ? inArray(sql`status`, status.map((s) => domainToDrizzleStatus(s)))
      : undefined;

    // Common priority filter (only applies to tasks, delegations inherit from task)
    const priorityFilter = priority?.length
      ? inArray(tasks.priority, priority.map((p) => domainToDrizzlePriority(p)))
      : undefined;

    // Common search filter (searches task title/description)
    const searchFilter = search
      ? or(
        ilike(tasks.title, `%${search}%`),
        ilike(tasks.description, `%${search}%`)
      )
      : undefined;

    /* ---------- 3. Unified query using UNION ALL ---------- */

    // Define the unified row structure
    const unifiedRow = {
      id: sql<string>`id`.as('id'),
      type: sql<"task" | "delegation">`type`.as('type'),
      // Task fields
      taskId: sql<string>`task_id`.as('task_id'),
      title: sql<string>`title`.as('title'),
      description: sql<string | null>`description`.as('description'),
      status: sql<string>`status`.as('status'),
      priority: sql<string | null>`priority`.as('priority'),
      assigneeId: sql<string | null>`assignee_id`.as('assignee_id'),
      targetSubDepartmentId: sql<string | null>`target_sub_department_id`.as('target_sub_department_id'),
      createdAt: sql<Date>`created_at`.as('created_at'),
      updatedAt: sql<Date>`updated_at`.as('updated_at'),
      creatorId: sql<string>`creator_id`.as('creator_id'),
      assignmentType: sql<string>`assignment_type`.as('assignment_type'),
      // Delegation-specific fields
      delegationId: sql<string | null>`delegation_id`.as('delegation_id'),
      delegatorId: sql<string | null>`delegator_id`.as('delegator_id'),
      // For cursor pagination
      sortCreatedAt: sql<Date>`sort_created_at`.as('sort_created_at'),
      sortId: sql<string>`sort_id`.as('sort_id'),
    };

    // Tasks CTE
    const tasksCte = this.db.$with('tasks_data').as(
      this.db
        .select({
          id: tasks.id,
          type: sql<"task">`'task'`.as('type'),
          taskId: sql<string>`${tasks.id}`.as('task_id'),
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          assigneeId: tasks.assigneeId,
          targetSubDepartmentId: tasks.targetSubDepartmentId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          creatorId: tasks.creatorId,
          assignmentType: tasks.assignmentType,
          delegationId: sql<string | null>`null::uuid`.as('delegation_id'),
          delegatorId: sql<string | null>`null::uuid`.as('delegator_id'),
          sortCreatedAt: sql<Date>`${tasks.createdAt}`.as('sort_created_at'),
          sortId: sql<string>`${tasks.id}`.as('sort_id'),
        })
        .from(tasks)
        .where(
          and(
            or(
              eq(tasks.assigneeId, empId),
              inArray(tasks.targetSubDepartmentId, employeeDepartmentIds)
            ),
            statusFilter,
            priorityFilter,
            searchFilter
          )
        )
    );

    // Delegations CTE (joined with tasks for search/priority filters)
    const delegationsCte = this.db.$with('delegations_data').as(
      this.db
        .select({
          id: taskDelegations.id,
          type: sql<"delegation">`'delegation'`.as('type'),
          taskId: taskDelegations.taskId,
          title: tasks.title,
          description: tasks.description,
          status: taskDelegations.status,
          priority: tasks.priority,
          assigneeId: taskDelegations.assigneeId,
          targetSubDepartmentId: taskDelegations.targetSubDepartmentId,
          createdAt: taskDelegations.createdAt,
          updatedAt: taskDelegations.updatedAt,
          creatorId: tasks.creatorId, // Delegations don't have creator, inherit from task
          assignmentType: taskDelegations.assignmentType,
          delegationId: sql<string>`${taskDelegations.id}`.as('delegation_id'),
          delegatorId: taskDelegations.delegatorId,
          sortCreatedAt: sql<Date>`${taskDelegations.createdAt}`.as('sort_created_at'),
          sortId: sql<string>`${taskDelegations.id}`.as('sort_id'),
        })
        .from(taskDelegations)
        .innerJoin(tasks, eq(taskDelegations.taskId, tasks.id))
        .where(
          and(
            or(
              eq(taskDelegations.assigneeId, empId),
              inArray(taskDelegations.targetSubDepartmentId, employeeDepartmentIds)
            ),
            statusFilter,
            priorityFilter, // Applied via join to tasks
            searchFilter    // Applied via join to tasks
          )
        )
    );

    // Unified CTE with UNION ALL
    const unifiedCte = this.db.$with('unified').as(
      this.db
        .select(unifiedRow)
        .from(tasksCte)
        .unionAll(
          this.db.select(unifiedRow).from(delegationsCte)
        )
    );

    /* ---------- 4. Cursor condition for unified result ---------- */
    // Build cursor condition manually using unified CTE columns (not tasks.*)
    const cursorData = paginationParams.cursorData as TaskCursorData | null;
    const cursorCondition = cursorData
      ? (() => {
        const isDescending = this.pagination.sortDirection === 'desc';
        const useGreaterThan = isDescending
          ? paginationParams.direction === 'prev'
          : paginationParams.direction === 'next';
        const op = useGreaterThan ? sql`>` : sql`<`;
        // Use raw SQL column names since we're querying the unified CTE
        return sql`("sort_created_at", "sort_id") ${op} (${cursorData.createdAt}, ${cursorData.id})`;
      })()
      : undefined;

    /* ---------- 5. Execute queries in parallel ---------- */

    // Get paginated unified results
    const unifiedQuery = this.db
      .with(tasksCte, delegationsCte, unifiedCte)
      .select()
      .from(unifiedCte)
      .where(cursorCondition)
      .orderBy(
        // Reference the unified CTE columns, not tasks.* 
        this.pagination.sortDirection == "desc"
          ? desc(unifiedCte.sortCreatedAt)  // was: desc(tasks.createdAt)
          : asc(unifiedCte.sortCreatedAt),
        this.pagination.sortDirection == "desc"
          ? desc(unifiedCte.sortId)         // was: desc(tasks.id)
          : asc(unifiedCte.sortId)
      )
      .limit(limit);

    // Get metrics (separate queries for accurate counts)
    const [unifiedResults, taskMetrics, delegationMetrics] = await Promise.all([
      unifiedQuery,
      // Task counts
      this.db
        .select({
          completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`.mapWith(Number),
          pending: sql<number>`count(*) filter (where ${tasks.status} <> 'completed')`.mapWith(Number),
        })
        .from(tasks)
        .where(
          and(
            or(
              eq(tasks.assigneeId, empId),
              inArray(tasks.targetSubDepartmentId, employeeDepartmentIds)
            ),
            priorityFilter,
            searchFilter
          )
        ),
      // Delegation counts  
      this.db
        .select({
          completed: sql<number>`count(*) filter (where ${taskDelegations.status} = 'completed')`.mapWith(Number),
          pending: sql<number>`count(*) filter (where ${taskDelegations.status} <> 'completed')`.mapWith(Number),
        })
        .from(taskDelegations)
        .innerJoin(tasks, eq(taskDelegations.taskId, tasks.id))
        .where(
          and(
            or(
              eq(taskDelegations.assigneeId, empId),
              inArray(taskDelegations.targetSubDepartmentId, employeeDepartmentIds)
            ),
            priorityFilter,
            searchFilter
          )
        ),
    ]);

    /* ---------- 6. Process pagination ---------- */
    const { data, meta } = this.pagination.processResults(unifiedResults, paginationParams, (r) => ({
      createdAt: new Date(r.sortCreatedAt).toISOString(),
      id: r.sortId,
    }));

    /* ---------- 7. Fetch related data ---------- */
    const taskIds = data
      .filter(r => r.type === 'task')
      .map(r => r.taskId);

    const allTaskIds = [...new Set([
      ...taskIds,
      ...data.filter(r => r.type === 'delegation').map(r => r.taskId)
    ])];

    // Fetch task submissions for rejection/approval feedback
    const [submissions, attachmentsData] = await Promise.all([
      taskIds.length > 0
        ? this.db
          .select({
            taskId: taskSubmissions.taskId,
            feedback: taskSubmissions.feedback,
            status: taskSubmissions.status,
          })
          .from(taskSubmissions)
          .where(
            and(
              inArray(taskSubmissions.taskId, taskIds),
              inArray(taskSubmissions.status, ['rejected', 'approved'])
            )
          )
        : undefined,
      allTaskIds.length > 0
        ? this.db
          .select()
          .from(attachments)
          .where(inArray(attachments.targetId, allTaskIds))
        : [],
    ]);

    const submissionsByTaskId = new Map(
      submissions.map(s => [s.taskId, s])
    );

    /* ---------- 8. Map results ---------- */
    const taskItems: Array<{ task: Task; rejectionReason?: string; approvalFeedback?: string }> = [];
    const delegationItems: TaskDelegation[] = [];

    for (const row of data) {
      const baseTaskData = {
        id: row.taskId,
        title: row.title,
        description: row.description,
        status: drizzleToDomainStatus(row.status as DrizzleTaskStatus),
        priority: row.priority ? drizzleToDomainPriority(row.priority as DrizzleTaskPriority) : undefined,
        assigneeId: row.assigneeId,
        targetSubDepartmentId: row.targetSubDepartmentId,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        creatorId: row.creatorId,
        assignmentType: drizzleToDomainAssignmentType(row.assignmentType as DrizzleTaskAssignmentType),
      };

      if (row.type === 'task') {
        const submission = submissionsByTaskId.get(row.taskId);
        taskItems.push({
          task: Task.create(baseTaskData),
          rejectionReason: submission?.status === 'rejected' ? submission.feedback ?? undefined : undefined,
          approvalFeedback: submission?.status === 'approved' ? submission.feedback ?? undefined : undefined,
        });
      } else {
        // Fetch full task data for delegation (you might want to optimize this)
        const [fullTaskData] = await this.db
          .select()
          .from(tasks)
          .where(eq(tasks.id, row.taskId))
          .limit(1);

        delegationItems.push(
          TaskDelegation.create({
            id: row.delegationId!,
            taskId: row.taskId,
            assigneeId: row.assigneeId,
            targetSubDepartmentId: row.targetSubDepartmentId,
            status: drizzleToDomainStatus(row.status as DrizzleTaskStatus),
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            assignmentType: drizzleToDomainAssignmentType(row.assignmentType as DrizzleTaskAssignmentType),
            delegatorId: row.delegatorId!,
            task: Task.create({
              ...baseTaskData,
              targetDepartmentId: fullTaskData?.targetDepartmentId,
            }),
          })
        );
      }
    }

    /* ---------- 9. Calculate metrics ---------- */
    const totalTasks = taskMetrics[0].completed + taskMetrics[0].pending;
    const totalDelegations = delegationMetrics[0].completed + delegationMetrics[0].pending;
    const combinedCompleted = taskMetrics[0].completed + delegationMetrics[0].completed;
    const combinedTotal = totalTasks + totalDelegations;

    return {
      data: taskItems,
      delegations: delegationItems,
      meta,
      fileHubAttachments: attachmentsData.map((attachment) =>
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
        pendingTasks: taskMetrics[0].pending,
        completedTasks: taskMetrics[0].completed,
        pendingDelegations: delegationMetrics[0].pending,
        completedDelegations: delegationMetrics[0].completed,
        taskCompletionPercentage: totalTasks === 0 ? 0 : Math.floor((taskMetrics[0].completed / totalTasks) * 100),
        delegationCompletionPercentage: totalDelegations === 0 ? 0 : Math.floor((delegationMetrics[0].completed / totalDelegations) * 100),
        totalPercentage: combinedTotal === 0 ? 0 : Math.floor((combinedCompleted / combinedTotal) * 100),
      },
    };
  }

  async getTasksForSupervisor(options: {
    supervisorUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
  }): Promise<PaginatedArrayResult<{
    task: Task;
    rejectionReason?: string;
    approvalFeedback?: string;
  }> & {
    fileHubAttachments: Attachment[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }> {
    const { supervisorUserId, status, priority, cursor, search } = options;
    const paginationParams = this.pagination.parseInput(cursor);
    const { limit } = paginationParams;

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


    const whereConditions = [inArray(tasks.targetDepartmentId, supervisorDepartmentIds)]

    if (status.length > 0) {
      whereConditions.push(inArray(tasks.status, status.map((s) => domainToDrizzleStatus(s))));
    }

    if (priority.length > 0) {
      whereConditions.push(inArray(tasks.priority, priority.map((p) => domainToDrizzlePriority(p))));
    }

    if (search) {
      whereConditions.push(or(ilike(tasks.title, `%${search}%`), ilike(tasks.description, `%${search}%`)));
    }

    const tasksWhere = whereConditions.length > 0 ? whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0] : undefined;

    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData as TaskCursorData | null,
      paginationParams.direction,
    );

    const [tasksPage, [taskAgg]] = await Promise.all([
      this.db.query.tasks.findMany({
        where: cursorCondition ? and(tasksWhere, cursorCondition) : tasksWhere,
        limit: limit,
        orderBy: this.pagination.getOrderBy(),
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
          tc: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`
            .mapWith(Number)
            .as('tc'),
          tp: sql<number>`count(*) filter (where ${tasks.status} <> 'completed')`
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

    const processedResults = this.pagination.processResults(
      tasksPage,
      paginationParams,
      (task) => ({
        createdAt: task.createdAt,
        id: task.id,
      }),
    );

    return {
      ...processedResults,
      data: processedResults.data.map((task) => {
        const submissions = (task.taskSubmissions || []) as Array<{
          feedback: string | null;
          status: string;
        }>;
        return {
          task: Task.create({
            id: task.id,
            title: task.title,
            description: task.description,
            status: drizzleToDomainStatus(task.status),
            priority: drizzleToDomainPriority(task.priority),
            assigneeId: task.assigneeId,
            targetSubDepartmentId: task.targetSubDepartmentId,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            creatorId: task.creatorId,
            assignmentType: drizzleToDomainAssignmentType(task.assignmentType),
            targetDepartmentId: task.targetDepartmentId,
          }),
          rejectionReason: submissions.find(
            (submission) => submission.status === 'rejected',
          )?.feedback,
          approvalFeedback: submissions.find(
            (submission) => submission.status === 'approved',
          )?.feedback,
        };
      }),
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
          metrics.completedTasks + metrics.pendingTasks === 0
            ? 0
            : Math.floor(
              (metrics.completedTasks /
                (metrics.completedTasks + metrics.pendingTasks)) *
              100,
            ),
      },
    };
  }

  async getTeamTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
  }): Promise<PaginatedArrayResult<{
    task: {
      data: Task;
      submissions: TaskSubmission[];
      delegationSubmissions: TaskDelegationSubmission[];
    };
  }> & {
    fileHubAttachments: Attachment[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }> {
    const { supervisorDepartmentIds, status, priority, cursor, search } = options;
    const paginationParams = this.pagination.parseInput(cursor);
    const { limit } = paginationParams;
    const whereConditions = [
      // Path 1: Direct sub-department assignment
      or(exists(
        this.db.select({ one: sql`1` })
          .from(departments)
          .where(
            and(
              eq(departments.id, tasks.targetSubDepartmentId),
              inArray(departments.parentId, supervisorDepartmentIds)
            )
          )
      ),      // Path 2: Via assignee's department membership
        exists(
          this.db.select({ one: sql`1` })
            .from(employees)
            .innerJoin(
              employeeSubDepartments,
              eq(employees.id, employeeSubDepartments.employeeId)
            )
            .innerJoin(
              departments,
              eq(employeeSubDepartments.departmentId, departments.id)
            )
            .where(
              and(
                eq(tasks.assigneeId, employees.id),
                inArray(departments.parentId, supervisorDepartmentIds)
              )
            )
        ))
    ]

    if (status && status.length > 0) {
      whereConditions.push(inArray(tasks.status, status.map((s) => domainToDrizzleStatus(s))));
    }

    if (priority && priority.length > 0) {
      whereConditions.push(inArray(tasks.priority, priority.map((p) => domainToDrizzlePriority(p))));
    }

    if (search) {
      whereConditions.push(or(ilike(tasks.title, `%${search}%`), ilike(tasks.description, `%${search}%`)));
    }

    const cursorCondition = this.pagination.buildCursorCondition(
      paginationParams.cursorData as TaskCursorData | null,
      paginationParams.direction,
    );
    const whereClause = and(...whereConditions);

    const results = await this.db.query.tasks.findMany({
      where: cursorCondition ? and(whereClause, cursorCondition) : whereClause,
      orderBy: this.pagination.getOrderBy(),
      limit: limit,
      with: {
        taskSubmissions: {
          columns: {
            feedback: true,
            status: true,
          },
        },
      },
    });

    const { data, meta } = this.pagination.processResults(
      results,
      paginationParams,
      (task) => ({
        createdAt: task.createdAt,
        id: task.id,
      }),
    );
    const taskIds = data.map((task) => task.id);
    const [metrics, submissions, delegationSubmissions] = await Promise.all([
      this.db
        .select({
          tc: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`
            .mapWith(Number)
            .as('tc'),
          tp: sql<number>`count(*) filter (where ${tasks.status} <> 'completed')`
            .mapWith(Number)
            .as('tp'),
        })
        .from(tasks)
        .where(whereClause),
      this.db
        .select({
          submission: taskSubmissions,
          performerName: users.name,
        })
        .from(taskSubmissions)
        .leftJoin(admins, eq(taskSubmissions.performerAdminId, admins.id))
        .leftJoin(supervisors, eq(taskSubmissions.performerSupervisorId, supervisors.id))
        .leftJoin(employees, eq(taskSubmissions.performerEmployeeId, employees.id))
        .leftJoin(users, or(eq(admins.userId, users.id), eq(supervisors.userId, users.id), eq(employees.userId, users.id)))
        .where(inArray(taskSubmissions.taskId, taskIds)),
      this.db
        .select({
          submission: taskDelegationSubmissions,
          performerName: users.name,
        })
        .from(taskDelegationSubmissions)
        .leftJoin(admins, eq(taskDelegationSubmissions.performerAdminId, admins.id))
        .leftJoin(supervisors, eq(taskDelegationSubmissions.performerSupervisorId, supervisors.id))
        .leftJoin(employees, eq(taskDelegationSubmissions.performerEmployeeId, employees.id))
        .leftJoin(users, or(eq(admins.userId, users.id), eq(supervisors.userId, users.id), eq(employees.userId, users.id)))
        .where(inArray(taskDelegationSubmissions.taskId, taskIds)),
    ]);
    const targetIds = new Set<string>();
    taskIds.forEach((taskId) => {
      targetIds.add(taskId);
    });
    delegationSubmissions.forEach((submission) => {
      targetIds.add(submission.submission.id);
    });
    submissions.forEach((submission) => {
      targetIds.add(submission.submission.id);
    });
    const attachmentResults = await this.db.select().from(attachments).where(inArray(attachments.targetId, Array.from(targetIds)));
    const metricsResult = {
      completedTasks: metrics[0].tc,
      pendingTasks: metrics[0].tp,
      taskCompletionPercentage:
        metrics[0].tc + metrics[0].tp === 0
          ? 0
          : Math.floor(
            (metrics[0].tc /
              (metrics[0].tc + metrics[0].tp)) *
            100,
          ),
    };
    return {
      data: data.map((task) => ({
        task: {
          data: Task.create({
            id: task.id,
            title: task.title,
            description: task.description,
            status: drizzleToDomainStatus(task.status),
            priority: drizzleToDomainPriority(task.priority),
            assigneeId: task.assigneeId,
            targetSubDepartmentId: task.targetSubDepartmentId,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            creatorId: task.creatorId,
            assignmentType: drizzleToDomainAssignmentType(task.assignmentType),
          }),
          submissions: submissions
            .filter(({ submission }) => submission.taskId === task.id)
            .map(({ submission: s, performerName }) =>
              TaskSubmission.create({
                id: s.id,
                performerId: s.performerEmployeeId || s.performerSupervisorId || s.performerAdminId || '',
                performerType: s.performerAdminId ? 'admin' : s.performerSupervisorId ? 'supervisor' : 'employee',
                notes: s.notes || undefined,
                feedback: s.feedback || undefined,
                status: drizzleToDomainSubmissionStatus(s.status),
                submittedAt: s.submittedAt ? new Date(s.submittedAt) : undefined,
                reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : undefined,
                delegationSubmissionId: s.delegationSubmissionId || undefined,
                performerName: performerName,
              }),
            ),
          delegationSubmissions: delegationSubmissions
            .filter(({ submission }) => submission.taskId === task.id)
            .map(({ submission: s, performerName }) =>
              TaskDelegationSubmission.create({
                id: s.id,
                delegationId: s.delegationId,
                taskId: s.taskId,
                performerId: s.performerEmployeeId || s.performerSupervisorId || s.performerAdminId || '',
                performerType: s.performerAdminId ? 'admin' : s.performerSupervisorId ? 'supervisor' : 'employee',
                performerName,
                notes: s.notes || undefined,
                feedback: s.feedback || undefined,
                status: drizzleToDomainSubmissionStatus(s.status),
                submittedAt: s.submittedAt ? new Date(s.submittedAt) : undefined,
                reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : undefined,
                forwarded: s.forwarded || false,
              }),
            ),
        },
      })),
      meta: meta,
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
      metrics: metricsResult,
    };
  }
}
