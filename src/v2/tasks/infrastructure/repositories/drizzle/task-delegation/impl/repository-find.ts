import {
  and,
  count,
  eq,
  inArray,
  or,
  desc,
  SQL,
  sql,
  ilike,
} from 'drizzle-orm';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import {
  departments,
  departmentToSupervisor,
  employees,
  employeeSubDepartments,
  supervisors,
  taskDelegations,
  users,
} from '@/common/drizzle/schema';
import { TaskStatus } from '@/v2/tasks/domain/entities/task.entity';
import type { TaskDelegation } from '@/v2/tasks/domain/entities/task-delegation.entity';
import type { TaskDelegationRow } from './mappers';
import { rowToEntity, statusToDb } from './mappers';
import {
  createCursorPagination,
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import {
  Delegable,
  DelegableType,
} from '@/v2/tasks/domain/repositories/task-delegation.repository';

export async function findByTaskId(
  db: DatabaseInstance | DrizzleTransaction,
  taskId: string,
): Promise<TaskDelegation[]> {
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(eq(taskDelegations.taskId, taskId));
  return rows.map(rowToEntity);
}

export async function findByTaskIds(
  db: DatabaseInstance | DrizzleTransaction,
  taskIds: string[],
): Promise<TaskDelegation[]> {
  if (taskIds.length === 0) return [];
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(inArray(taskDelegations.taskId, taskIds));
  return rows.map(rowToEntity);
}

export async function findByAssigneeId(
  db: DatabaseInstance | DrizzleTransaction,
  assigneeId: string,
): Promise<TaskDelegation[]> {
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(eq(taskDelegations.assigneeId, assigneeId));
  return rows.map(rowToEntity);
}

export async function findByAssigneeIds(
  db: DatabaseInstance | DrizzleTransaction,
  assigneeIds: string[],
): Promise<TaskDelegation[]> {
  if (assigneeIds.length === 0) return [];
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(inArray(taskDelegations.assigneeId, assigneeIds));
  return rows.map(rowToEntity);
}

export async function findByTargetSubDepartmentId(
  db: DatabaseInstance | DrizzleTransaction,
  targetSubDepartmentId: string,
): Promise<TaskDelegation[]> {
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(eq(taskDelegations.targetSubDepartmentId, targetSubDepartmentId));
  return rows.map(rowToEntity);
}

export async function findByTargetSubDepartmentIds(
  db: DatabaseInstance | DrizzleTransaction,
  targetSubDepartmentIds: string[],
): Promise<TaskDelegation[]> {
  if (targetSubDepartmentIds.length === 0) return [];
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(
      inArray(taskDelegations.targetSubDepartmentId, targetSubDepartmentIds),
    );
  return rows.map(rowToEntity);
}

export async function findByDelegatorId(
  db: DatabaseInstance | DrizzleTransaction,
  delegatorId: string,
): Promise<TaskDelegation[]> {
  const rows = await db
    .select()
    .from(taskDelegations)
    .where(eq(taskDelegations.delegatorId, delegatorId));
  return rows.map(rowToEntity);
}

const DB_STATUSES: TaskDelegationRow['status'][] = [
  'to_do',
  'seen',
  'pending_review',
  'completed',
];

function parseStatus(status: string): TaskDelegationRow['status'] | null {
  const trimmed = status.trim();
  const dbLower = trimmed.toLowerCase().replace(/-/g, '_');
  if (DB_STATUSES.includes(dbLower as TaskDelegationRow['status']))
    return dbLower as TaskDelegationRow['status'];
  const asEnum = Object.values(TaskStatus).find(
    (v) => v === trimmed || v.replace(/_/g, '-') === trimmed.replace(/_/g, '-'),
  );
  if (asEnum) return statusToDb(asEnum as TaskStatus);
  return null;
}

export async function findByDelegatorIdWithFilters(
  db: DatabaseInstance | DrizzleTransaction,
  options: {
    delegatorId: string;
    status?: string;
    offset?: number;
    limit?: number;
  },
): Promise<{ delegations: TaskDelegation[]; total: number }> {
  const conditions = [eq(taskDelegations.delegatorId, options.delegatorId)];
  if (options.status != null && options.status !== '') {
    const dbStatus = parseStatus(options.status);
    if (dbStatus != null) conditions.push(eq(taskDelegations.status, dbStatus));
  }
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [countRow] = await db
    .select({ count: count(taskDelegations.id) })
    .from(taskDelegations)
    .where(where);
  const total = Number(countRow?.count ?? 0);

  let query = db.select().from(taskDelegations).where(where);
  if (options.offset != null && options.offset > 0)
    query = query.offset(options.offset) as typeof query;
  if (options.limit != null && options.limit > 0)
    query = query.limit(options.limit) as typeof query;
  const rows = await query;
  return { delegations: rows.map(rowToEntity), total };
}

const cursorPagination = createCursorPagination({
  table: taskDelegations,
  cursorFields: [
    { column: taskDelegations.createdAt, key: 'createdAt' },
    { column: taskDelegations.id, key: 'id' },
  ],
});

export async function findMyDelegationsForSupervisor(
  db: DatabaseInstance | DrizzleTransaction,
  options: {
    delegator:
      | { delegatorId: string; delegatorUserId: never }
      | { delegatorUserId: string; delegatorId: never };
    cursor?: CursorInput;
  },
): Promise<PaginatedArrayResult<TaskDelegation>> {
  const paginationParams = cursorPagination.parseInput(options.cursor);
  const cursorCondition = cursorPagination.buildCursorCondition(
    paginationParams.cursorData,
    paginationParams.direction,
  );

  let rows: { taskDelegation: typeof taskDelegations.$inferSelect }[];

  if (options.delegator.delegatorId) {
    const conditions = [
      eq(taskDelegations.delegatorId, options.delegator.delegatorId),
      cursorCondition,
    ].filter((c): c is SQL => c !== undefined);
    rows = await db
      .select({ taskDelegation: taskDelegations })
      .from(taskDelegations)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(...cursorPagination.getOrderBy())
      .limit(paginationParams.limit);
  } else {
    const conditions = [
      eq(supervisors.userId, options.delegator.delegatorUserId),
      cursorCondition,
    ].filter((c): c is SQL => c !== undefined);
    rows = await db
      .select({ taskDelegation: taskDelegations })
      .from(taskDelegations)
      .innerJoin(supervisors, eq(taskDelegations.delegatorId, supervisors.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(...cursorPagination.getOrderBy())
      .limit(paginationParams.limit);
  }

  const { data, meta } = cursorPagination.processResults(
    rows,
    paginationParams,
    (row) => ({
      createdAt: row.taskDelegation.createdAt.toISOString(),
      id: row.taskDelegation.id,
    }),
  );

  return {
    data: data.map((row) => rowToEntity(row.taskDelegation)),
    meta,
  };
}

export async function findMyDelegationsForEmployee(
  db: DatabaseInstance | DrizzleTransaction,
  options: {
    assignee:
      | { assigneeId: string; assigneeUserId: never }
      | { assigneeUserId: string; assigneeId: never };
    subDepartmentIds: string[];
    cursor?: CursorInput;
  },
): Promise<PaginatedArrayResult<TaskDelegation>> {
  const paginationParams = cursorPagination.parseInput(options.cursor);
  const cursorCondition = cursorPagination.buildCursorCondition(
    paginationParams.cursorData,
    paginationParams.direction,
  );

  const assigneeCondition = options.assignee.assigneeId
    ? eq(taskDelegations.assigneeId, options.assignee.assigneeId)
    : eq(employees.userId, options.assignee.assigneeUserId);
  let accessCondition: SQL | undefined = assigneeCondition;

  if (options.subDepartmentIds.length > 0) {
    accessCondition = or(
      assigneeCondition,
      inArray(taskDelegations.targetSubDepartmentId, options.subDepartmentIds),
    );
  }

  const conditions = [accessCondition, cursorCondition].filter(
    (c): c is SQL => c !== undefined,
  );

  let rows: { taskDelegation: typeof taskDelegations.$inferSelect }[];

  if (options.assignee.assigneeId) {
    rows = await db
      .select({ taskDelegation: taskDelegations })
      .from(taskDelegations)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(...cursorPagination.getOrderBy())
      .limit(paginationParams.limit);
  } else {
    rows = await db
      .select({ taskDelegation: taskDelegations })
      .from(taskDelegations)
      .innerJoin(employees, eq(taskDelegations.assigneeId, employees.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(...cursorPagination.getOrderBy())
      .limit(paginationParams.limit);
  }

  const { data, meta } = cursorPagination.processResults(
    rows,
    paginationParams,
    (row) => ({
      createdAt: row.taskDelegation.createdAt.toISOString(),
      id: row.taskDelegation.id,
    }),
  );

  return {
    data: data.map((row) => rowToEntity(row.taskDelegation)),
    meta,
  };
}

export async function findBySubDepartment(
  db: DatabaseInstance | DrizzleTransaction,
  subDepartmentId: string,
  options?: {
    cursor?: CursorInput;
    status?: string[];
  },
): Promise<PaginatedArrayResult<TaskDelegation>> {
  const paginationParams = cursorPagination.parseInput(options?.cursor);
  const cursorCondition = cursorPagination.buildCursorCondition(
    paginationParams.cursorData,
    paginationParams.direction,
  );

  const conditions = [
    eq(taskDelegations.targetSubDepartmentId, subDepartmentId),
    cursorCondition,
  ];

  if (options?.status && options.status.length > 0) {
    const statusConditions = options.status
      .map((s) => parseStatus(s))
      .filter((s): s is TaskDelegationRow['status'] => s !== null)
      .map((s) => eq(taskDelegations.status, s));

    if (statusConditions.length > 0) {
      conditions.push(or(...statusConditions));
    }
  }

  const where = and(...conditions.filter((c): c is SQL => c !== undefined));

  const rows = await db
    .select()
    .from(taskDelegations)
    .where(where)
    .orderBy(...cursorPagination.getOrderBy())
    .limit(paginationParams.limit);

  const { data, meta } = cursorPagination.processResults(
    rows,
    paginationParams,
    (row) => ({
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    }),
  );

  return {
    data: data.map(rowToEntity),
    meta,
  };
}

export async function findByTask(
  db: DatabaseInstance | DrizzleTransaction,
  taskId: string,
  options?: {
    cursor?: CursorInput;
    status?: string[];
  },
): Promise<PaginatedArrayResult<TaskDelegation>> {
  const paginationParams = cursorPagination.parseInput(options?.cursor);
  const cursorCondition = cursorPagination.buildCursorCondition(
    paginationParams.cursorData,
    paginationParams.direction,
  );

  const conditions = [eq(taskDelegations.taskId, taskId), cursorCondition];

  if (options?.status && options.status.length > 0) {
    const statusConditions = options.status
      .map((s) => parseStatus(s))
      .filter((s): s is TaskDelegationRow['status'] => s !== null)
      .map((s) => eq(taskDelegations.status, s));

    if (statusConditions.length > 0) {
      conditions.push(or(...statusConditions));
    }
  }

  const where = and(...conditions.filter((c): c is SQL => c !== undefined));

  const rows = await db
    .select()
    .from(taskDelegations)
    .where(where)
    .orderBy(...cursorPagination.getOrderBy())
    .limit(paginationParams.limit);

  const { data, meta } = cursorPagination.processResults(
    rows,
    paginationParams,
    (row) => ({
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    }),
  );

  return {
    data: data.map(rowToEntity),
    meta,
  };
}

export async function findDelegablesForSupervisor(
  db: DatabaseInstance | DrizzleTransaction,
  supervisor:
    | {
        supervisorId: string;
        supervisorUserId: never;
      }
    | { supervisorUserId: string; supervisorId: never },
  search?: string,
): Promise<Delegable[]> {
  const supervisorId = supervisor.supervisorId
    ? supervisor.supervisorId
    : await db
        .select({ id: supervisors.id })
        .from(supervisors)
        .where(eq(supervisors.userId, supervisor.supervisorUserId))
        .then(([row]) => row.id);

  // CTE 1: Supervisor's main departments
  const supervisorMainDepartments = db
    .$with('supervisor_main_departments')
    .as(
      db
        .select({ departmentId: departmentToSupervisor.departmentId })
        .from(departmentToSupervisor)
        .where(eq(departmentToSupervisor.supervisorId, supervisorId)),
    );

  // CTE 2: All accessible departments (main + sub)
  const supervisorAllDepartments = db.$with('supervisor_all_departments').as(
    db
      .select({ id: supervisorMainDepartments.departmentId })
      .from(supervisorMainDepartments)
      .unionAll(
        db
          .select({ id: departments.id })
          .from(departments)
          .innerJoin(
            supervisorMainDepartments,
            eq(departments.parentId, supervisorMainDepartments.departmentId),
          ),
      ),
  );

  // CTE 3: Accessible employees
  const accessibleEmployees = db.$with('accessible_employees').as(
    // Direct reports
    db
      .select({
        employeeId: employees.id,
        userId: employees.userId,
        supervisorId: employees.supervisorId,
        name: users.name,
        email: users.email,
        username: users.username,
        jobTitle: users.jobTitle,
      })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .where(eq(employees.supervisorId, supervisorId))
      .union(
        // Sub-department employees
        db
          .select({
            employeeId: employees.id,
            userId: employees.userId,
            supervisorId: employees.supervisorId,
            name: users.name,
            email: users.email,
            username: users.username,
            jobTitle: users.jobTitle,
          })
          .from(employees)
          .innerJoin(users, eq(employees.userId, users.id))
          .innerJoin(
            employeeSubDepartments,
            eq(employees.id, employeeSubDepartments.employeeId),
          )
          .innerJoin(
            supervisorAllDepartments,
            eq(
              employeeSubDepartments.departmentId,
              supervisorAllDepartments.id,
            ),
          )
          .where(sql`${employees.supervisorId} != ${supervisorId}`),
      ),
  );

  // Prepare search conditions
  const deptSearchCondition =
    search && search.trim()
      ? ilike(departments.name, `%${search.trim()}%`)
      : undefined;

  const employeeSearchCondition =
    search && search.trim()
      ? or(
          ilike(accessibleEmployees.name, `%${search.trim()}%`),
          ilike(accessibleEmployees.email, `%${search.trim()}%`),
          ilike(accessibleEmployees.username, `%${search.trim()}%`),
          ilike(accessibleEmployees.jobTitle, `%${search.trim()}%`),
          ilike(accessibleEmployees.employeeId, `%${search.trim()}%`),
        )
      : undefined;

  // Main query
  const result = await db
    .with(
      supervisorMainDepartments,
      supervisorAllDepartments,
      accessibleEmployees,
    )
    .select({
      type: sql<'sub_department' | 'employee'>`'sub_department'`.as('type'),
      itemId: sql<string>`${departments.id}::text`.as('item_id'),
      name: departments.name,
      email: sql<string | null>`NULL`.as('email'),
      username: sql<string | null>`NULL`.as('username'),
      jobTitle: sql<string | null>`NULL`.as('job_title'),
    })
    .from(departments)
    .innerJoin(
      supervisorAllDepartments,
      eq(departments.id, supervisorAllDepartments.id),
    )
    .where(deptSearchCondition)
    .unionAll(
      db
        .select({
          type: sql<'sub_department' | 'employee'>`'employee'`.as('type'),
          itemId: sql<string>`${accessibleEmployees.employeeId}::text`.as(
            'item_id',
          ),
          name: accessibleEmployees.name,
          email: accessibleEmployees.email,
          username: accessibleEmployees.username,
          jobTitle: accessibleEmployees.jobTitle,
        })
        .from(accessibleEmployees)
        .where(employeeSearchCondition),
    );

  return result.map((row) => ({
    ...row,
    type:
      row.type === 'employee'
        ? DelegableType.EMPLOYEE
        : DelegableType.SUB_DEPARTMENT,
  }));
}
