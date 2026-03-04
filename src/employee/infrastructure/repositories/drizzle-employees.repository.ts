import {
  and,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { DrizzleService } from '@/common/drizzle/drizzle.service';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import {
  departmentToSupervisor,
  departments,
  employeeSubDepartments,
  employees,
  supervisors,
  users,
} from '@/common/drizzle/schema';
import {
  Department,
  DepartmentVisibility,
} from '@/department/domain/entities/department.entity';
import {
  Employee,
  EmployeePermissionsEnum,
} from '@/employee/domain/entities/employee.entity';
import type {
  EmployeeQueryOptions,
  EmployeeRepository,
} from '@/employee/domain/repositories/employee.repository';
import {
  Supervisor,
  SupervisorPermissionsEnum,
} from '@/supervisor/domain/entities/supervisor.entity';
import { Roles } from '@/shared/value-objects/role.vo';
import { User } from '@/shared/entities/user.entity';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

type DrizzleUserRole = (typeof users.$inferSelect)['role'];

function mapToUserRole(role: DrizzleUserRole): Roles {
  switch (role) {
    case 'supervisor':
      return Roles.SUPERVISOR;
    case 'admin':
      return Roles.ADMIN;
    case 'employee':
      return Roles.EMPLOYEE;
    case 'driver':
      return Roles.DRIVER;
  }
}

type DrizzlePermission = NonNullable<
  (typeof employees.$inferSelect)['permissions']
>[number];

export function mapToEmployeePermission(
  permission: DrizzlePermission,
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
  }
}

function mapToDrizzlePermission(
  permission: EmployeePermissionsEnum,
): DrizzlePermission {
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
  }
}

function mapToSupervisorPermission(
  permission: string,
): SupervisorPermissionsEnum {
  switch (permission) {
    case 'view_analytics':
      return SupervisorPermissionsEnum.VIEW_ANALYTICS;
    case 'manage_sub_departments':
      return SupervisorPermissionsEnum.MANAGE_SUB_DEPARTMENTS;
    case 'manage_promotions':
      return SupervisorPermissionsEnum.MANAGE_PROMOTIONS;
    case 'view_user_activity':
      return SupervisorPermissionsEnum.VIEW_USER_ACTIVITY;
    case 'manage_staff_directly':
      return SupervisorPermissionsEnum.MANAGE_STAFF_DIRECTLY;
    case 'manage_tasks':
      return SupervisorPermissionsEnum.MANAGE_TASKS;
    case 'manage_attachment_groups':
      return SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS;
    default:
      throw new Error(`Unknown supervisor permission: ${permission}`);
  }
}

function mapToDepartmentVisibility(
  visibility: 'public' | 'private',
): DepartmentVisibility {
  switch (visibility) {
    case 'public':
      return DepartmentVisibility.PUBLIC;
    case 'private':
      return DepartmentVisibility.PRIVATE;
  }
}

@Injectable()
export class DrizzleEmployeeRepository implements EmployeeRepository {
  private readonly db: DatabaseInstance | DrizzleTransaction;
  constructor(drizzleService: DrizzleService) {
    this.db = drizzleService.client;
  }

  async save(employee: Employee): Promise<Employee> {
    const employeeData = {
      id: employee.id.toString(),
      userId: employee.userId.toString(),
      permissions: employee.permissions.map(mapToDrizzlePermission),
      supervisorId: employee.supervisorId.toString(),
    };

    const result = await this.db
      .insert(employees)
      .values(employeeData)
      .onConflictDoUpdate({
        target: employees.id,
        set: {
          userId: employeeData.userId,
          permissions: employeeData.permissions,
          supervisorId: employeeData.supervisorId,
        },
      })
      .returning();

    return this.mapToEmployee(result[0]);
  }

  async findById(
    id: string,
    options?: EmployeeQueryOptions,
  ): Promise<Employee | null> {
    const result = await this.fetchEmployees({
      where: eq(employees.id, id),
      query: options,
      limit: 1,
    });

    return result[0] ?? null;
  }

  async findAll(options?: EmployeeQueryOptions): Promise<Employee[]> {
    const result = await this.fetchEmployees({ query: options });
    return result;
  }

  async removeById(id: string): Promise<Employee | null> {
    const employee = await this.findById(id);
    if (!employee) {
      return null;
    }

    await this.db.delete(employees).where(eq(employees.id, id));
    return employee;
  }

  async findByIds(
    ids: string[],
    options?: EmployeeQueryOptions,
  ): Promise<Employee[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await this.fetchEmployees({
      where: inArray(employees.id, ids),
      query: options,
    });

    return result;
  }

  async update(id: string, update: Partial<Employee>): Promise<Employee> {
    const updateData: Partial<typeof employees.$inferInsert> = {};

    if (update.userId !== undefined) {
      updateData.userId = update.userId.toString();
    }

    if (update.permissions !== undefined) {
      updateData.permissions = update.permissions.map(mapToDrizzlePermission);
    }

    if (update.supervisorId !== undefined) {
      updateData.supervisorId = update.supervisorId.toString();
    }

    const result = await this.db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error(`Employee with id ${id} not found`);
    }

    if (update.subDepartments !== undefined) {
      await this.db.transaction(async (tx) => {
        await tx
          .delete(employeeSubDepartments)
          .where(eq(employeeSubDepartments.employeeId, id));

        if (update.subDepartments.length > 0) {
          const now = new Date().toISOString();
          await tx.insert(employeeSubDepartments).values(
            update.subDepartments.map((dept) => ({
              id: randomUUID(),
              employeeId: id,
              departmentId: dept.id.toString(),
              updatedAt: now,
            })),
          );
        }
      });
    }

    return this.mapToEmployee(result[0]);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.fetchEmployees({
      where: eq(employees.id, id),
      limit: 1,
    });

    return result.length > 0;
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: count(employees.id) })
      .from(employees);

    return result[0]?.count ?? 0;
  }

  async findByUserId(
    userId: string,
    options?: EmployeeQueryOptions,
  ): Promise<Employee | null> {
    const result = await this.fetchEmployees({
      where: eq(employees.userId, userId),
      query: options,
      limit: 1,
    });

    return result[0] ?? null;
  }

  async findBySupervisorIds(
    supervisorIds: string[],
    permissions?: EmployeePermissionsEnum[],
    options?: EmployeeQueryOptions,
  ): Promise<Employee[]> {
    if (supervisorIds.length === 0) {
      return [];
    }

    const conditions = [inArray(employees.supervisorId, supervisorIds)];

    if (permissions && permissions.length > 0) {
      const drizzlePermissions = permissions.map(mapToDrizzlePermission);
      // Check if employee has any of the required permissions
      conditions.push(
        sql`${employees.permissions} && ARRAY[${sql.join(
          drizzlePermissions.map((p) => sql`${p}`),
          sql`, `,
        )}]::permissions[]`,
      );
    }

    const result = await this.fetchEmployees({
      where: and(...conditions),
      query: options,
    });

    return result;
  }

  async findBySubDepartment(subDepartmentId: string): Promise<Employee[]> {
    const result = await this.db
      .select({
        employees: employees,
        users: users,
        supervisors: supervisors,
      })
      .from(employeeSubDepartments)
      .innerJoin(employees, eq(employeeSubDepartments.employeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(supervisors, eq(employees.supervisorId, supervisors.id))
      .where(eq(employeeSubDepartments.departmentId, subDepartmentId));

    const employeeIds = result.map((r) => r.employees.id);
    const subDepartmentsMap =
      await this.fetchSubDepartmentsForEmployees(employeeIds);

    return Promise.all(
      result.map((row) =>
        this.mapToEmployeeWithRelations(
          row,
          subDepartmentsMap.get(row.employees.id) ?? [],
        ),
      ),
    );
  }

  async canDeleteEmployee(id: string): Promise<boolean> {
    // Check if employee has any sub-department assignments
    const subDepartmentCount = await this.db
      .select({ count: count(employeeSubDepartments.id) })
      .from(employeeSubDepartments)
      .where(eq(employeeSubDepartments.employeeId, id));

    // For now, we allow deletion if there are no sub-department assignments
    // You may want to add more checks here (e.g., tasks, tickets, etc.)
    return (subDepartmentCount[0]?.count ?? 0) === 0;
  }

  async findByPermissions(permissions: string[]): Promise<Employee[]> {
    if (permissions.length === 0) {
      return [];
    }

    const drizzlePermissions = permissions.map((p) => {
      return p.toLowerCase();
    });

    const result = await this.fetchEmployees({
      where: sql`${employees.permissions} && ARRAY[${sql.join(
        drizzlePermissions.map((p) => sql`${p}`),
        sql`, `,
      )}]::permissions[]`,
    });

    return result;
  }

  async findByPermissionsAndDepartments(
    permissions: string[],
    departmentIds: string[],
  ): Promise<Employee[]> {
    if (permissions.length === 0 || departmentIds.length === 0) {
      return [];
    }

    const drizzlePermissions = permissions.map((p) => {
      return p.toLowerCase();
    });

    const result = await this.db
      .select({
        employees: employees,
        users: users,
        supervisors: supervisors,
      })
      .from(employeeSubDepartments)
      .innerJoin(employees, eq(employeeSubDepartments.employeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(supervisors, eq(employees.supervisorId, supervisors.id))
      .where(
        and(
          inArray(employeeSubDepartments.departmentId, departmentIds),
          sql`${employees.permissions} && ARRAY[${sql.join(
            drizzlePermissions.map((p) => sql`${p}`),
            sql`, `,
          )}]::permissions[]`,
        ),
      );

    const employeeIds = result.map((r) => r.employees.id);
    const subDepartmentsMap =
      await this.fetchSubDepartmentsForEmployees(employeeIds);

    return Promise.all(
      result.map((row) =>
        this.mapToEmployeeWithRelations(
          row,
          subDepartmentsMap.get(row.employees.id) ?? [],
        ),
      ),
    );
  }

  async validateEmployeeAssignmentPermission(
    employeeUserId: string,
    requiredPermissions: string[],
    supervisorDepartmentIds: string[],
  ): Promise<boolean> {
    if (
      requiredPermissions.length === 0 ||
      supervisorDepartmentIds.length === 0
    ) {
      return false;
    }

    const employee = await this.findByUserId(employeeUserId, {
      includeSubDepartments: true,
    });
    if (!employee) {
      return false;
    }

    // Check if employee has all required permissions
    const employeePermissionStrings = employee.permissions.map((p) =>
      p.toLowerCase(),
    );
    const hasAllPermissions = requiredPermissions.every((reqPerm) =>
      employeePermissionStrings.includes(reqPerm.toLowerCase()),
    );

    if (!hasAllPermissions) {
      return false;
    }

    // Check if employee is assigned to any of the supervisor's departments
    const employeeSubDeptIds = employee.subDepartments.map((dept) =>
      dept.id.toString(),
    );
    const hasDepartmentAccess = supervisorDepartmentIds.some((deptId) =>
      employeeSubDeptIds.includes(deptId),
    );

    return hasDepartmentAccess;
  }

  async supervisorHasAccessToEmployee(options: {
    supervisor:
      | { supervisorId: string; supervisorUserId: never }
      | { supervisorId: never; supervisorUserId: string };
    employee:
      | { employeeId: string; employeeUserId: never }
      | { employeeId: never; employeeUserId: string };
  }): Promise<boolean> {
    const supervisorId = options.supervisor.supervisorId
      ? options.supervisor.supervisorId
      : await this.db
          .select({ id: supervisors.id })
          .from(supervisors)
          .where(eq(supervisors.userId, options.supervisor.supervisorUserId))
          .then((supervisors) => supervisors[0]?.id);

    const employee = await this.db
      .select()
      .from(employees)
      .where(
        options.employee.employeeId
          ? eq(employees.id, options.employee.employeeId)
          : eq(employees.userId, options.employee.employeeUserId),
      )
      .then((result) => result[0]);

    if (!employee) {
      return false;
    }

    if (employee.supervisorId === supervisorId) {
      return true;
    }

    // Get all departments assigned to the supervisor
    const supervisorMainDepartmentIds = await this.db
      .select({ departmentId: departmentToSupervisor.departmentId })
      .from(departmentToSupervisor)
      .where(eq(departmentToSupervisor.supervisorId, supervisorId))
      .then((result) => result.map((r) => r.departmentId));

    if (supervisorMainDepartmentIds.length === 0) {
      return false;
    }

    // Find all sub-departments of these main departments
    const subDepartmentIds = await this.db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          inArray(departments.parentId, supervisorMainDepartmentIds),
          isNotNull(departments.parentId),
        ),
      )
      .then((result) => result.map((r) => r.id));

    if (subDepartmentIds.length === 0) {
      return false;
    }

    // Check if employee is assigned to any of these sub-departments
    const result = await this.db
      .select()
      .from(employeeSubDepartments)
      .where(
        and(
          eq(employeeSubDepartments.employeeId, employee.id),
          inArray(employeeSubDepartments.departmentId, subDepartmentIds),
        ),
      );

    return result.length > 0;
  }

  private mapToEmployee(row: typeof employees.$inferSelect): Promise<Employee> {
    return Employee.create({
      id: row.id,
      userId: row.userId,
      permissions: (row.permissions ?? []).map(mapToEmployeePermission),
      supervisorId: row.supervisorId,
    });
  }

  private async mapToEmployeeWithRelations(
    row: {
      employees: typeof employees.$inferSelect;
      users?: typeof users.$inferSelect | null;
      supervisors?: typeof supervisors.$inferSelect | null;
    },
    subDepartments?: (typeof departments.$inferSelect)[],
  ): Promise<Employee> {
    const user = row.users
      ? await User.create({
          id: row.users.id,
          name: row.users.name,
          email: row.users.email,
          username: row.users.username,
          password: row.users.password,
          role: Roles.EMPLOYEE,
          employeeId: row.users.employeeId ?? undefined,
          jobTitle: row.users.jobTitle ?? undefined,
        })
      : undefined;

    const supervisor = row.supervisors
      ? Supervisor.create({
          id: row.supervisors.id,
          userId: row.supervisors.userId,
          permissions: (row.supervisors.permissions ?? []).map(
            mapToSupervisorPermission,
          ),
        })
      : undefined;

    const mappedSubDepartments = subDepartments?.map((dept) =>
      Department.create({
        id: dept.id,
        name: dept.name,
        visibility: mapToDepartmentVisibility(dept.visibility),
        parentId: dept.parentId ?? undefined,
      }),
    );

    return Employee.create({
      id: row.employees.id,
      userId: row.employees.userId,
      user,
      permissions: (row.employees.permissions ?? []).map(
        mapToEmployeePermission,
      ),
      supervisorId: row.employees.supervisorId,
      supervisor,
      subDepartments: mappedSubDepartments,
    });
  }

  private async fetchSubDepartmentsForEmployees(
    employeeIds: string[],
  ): Promise<Map<string, (typeof departments.$inferSelect)[]>> {
    if (employeeIds.length === 0) {
      return new Map();
    }

    const result = await this.db
      .select({
        employeeId: employeeSubDepartments.employeeId,
        departments: departments,
      })
      .from(employeeSubDepartments)
      .innerJoin(
        departments,
        eq(employeeSubDepartments.departmentId, departments.id),
      )
      .where(inArray(employeeSubDepartments.employeeId, employeeIds));

    const map = new Map<string, (typeof departments.$inferSelect)[]>();
    for (const row of result) {
      const existing = map.get(row.employeeId) ?? [];
      existing.push(row.departments);
      map.set(row.employeeId, existing);
    }

    return map;
  }

  private async fetchEmployees(options?: {
    where?: SQL;
    limit?: number;
    page?: number;
    query?: {
      includeSubDepartments?: boolean;
      includeSupervisor?: boolean;
      includeUser?: boolean;
    };
  }): Promise<Employee[]> {
    if (options?.query?.includeUser && options?.query?.includeSupervisor) {
      const query = this.db
        .select()
        .from(employees)
        .leftJoin(users, eq(employees.userId, users.id))
        .leftJoin(supervisors, eq(employees.supervisorId, supervisors.id))
        .$dynamic();

      if (options?.where) {
        query.where(options.where);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }

      const result = await query;

      const subDepartmentsMap = options?.query?.includeSubDepartments
        ? await this.fetchSubDepartmentsForEmployees(
            result.map((r) => r.employees.id),
          )
        : undefined;

      return Promise.all(
        result.map((row) =>
          this.mapToEmployeeWithRelations(
            row,
            subDepartmentsMap?.get(row.employees.id) ?? [],
          ),
        ),
      );
    } else if (options?.query?.includeUser) {
      const query = this.db
        .select()
        .from(employees)
        .leftJoin(users, eq(employees.userId, users.id))
        .$dynamic();
      if (options?.where) {
        query.where(options.where);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }

      const result = await query;

      const subDepartmentsMap = options?.query?.includeSubDepartments
        ? await this.fetchSubDepartmentsForEmployees(
            result.map((r) => r.employees.id),
          )
        : undefined;

      return Promise.all(
        result.map((row) =>
          this.mapToEmployeeWithRelations(
            row,
            subDepartmentsMap?.get(row.employees.id) ?? [],
          ),
        ),
      );
    } else if (options?.query?.includeSupervisor) {
      const query = this.db
        .select()
        .from(employees)
        .leftJoin(supervisors, eq(employees.supervisorId, supervisors.id))
        .$dynamic();

      if (options?.where) {
        query.where(options.where);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }

      const result = await query;

      const subDepartmentsMap = options?.query?.includeSubDepartments
        ? await this.fetchSubDepartmentsForEmployees(
            result.map((r) => r.employees.id),
          )
        : undefined;

      return Promise.all(
        result.map((row) =>
          this.mapToEmployeeWithRelations(
            row,
            subDepartmentsMap?.get(row.employees.id) ?? [],
          ),
        ),
      );
    } else {
      const query = this.db.select().from(employees).$dynamic();

      if (options?.where) {
        query.where(options.where);
      }
      if (options?.limit) {
        query.limit(options.limit);
      }
      if (options?.page) {
        query.offset((options.page - 1) * (options.limit ?? 10));
      }

      const result = await query;

      const subDepartmentsMap = options?.query?.includeSubDepartments
        ? await this.fetchSubDepartmentsForEmployees(result.map((r) => r.id))
        : undefined;

      return Promise.all(
        result.map((row) =>
          this.mapToEmployeeWithRelations(
            { employees: row },
            subDepartmentsMap?.get(row.id) ?? [],
          ),
        ),
      );
    }
  }

  async findDelegableEmployees(
    supervisorId: string,
    supervisorDepartmentIds: string[],
    searchQuery?: string,
  ): Promise<Employee[]> {
    const baseConditions = or(
      // Employees directly supervised by this supervisor
      eq(employees.supervisorId, supervisorId),
      // Employees in sub-departments whose parent is supervised by this supervisor
      inArray(
        sql`(SELECT d.parent_id FROM ${departments} d 
          JOIN ${employeeSubDepartments} esd ON esd.department_id = d.id 
          WHERE esd.employee_id = ${employees.id} 
          LIMIT 1)`,
        supervisorDepartmentIds,
      ),
    );

    let whereClause;

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const searchConditions = or(
        ilike(users.name, `%${searchTerm}%`),
        ilike(users.email, `%${searchTerm}%`),
        ilike(users.username, `%${searchTerm}%`),
        ilike(users.employeeId, `%${searchTerm}%`),
        uuidRegex.test(searchTerm) ? eq(employees.id, searchTerm) : undefined,
      );

      whereClause = and(baseConditions, searchConditions);
    } else {
      whereClause = baseConditions;
    }

    const items = await this.db
      .select({
        employee: employees,
        user: users,
        supervisor: supervisors,
        subDepartment: employeeSubDepartments,
        department: departments,
        supervisorDepartment: departments,
      })
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(supervisors, eq(employees.supervisorId, supervisors.id))
      .leftJoin(
        employeeSubDepartments,
        eq(employees.id, employeeSubDepartments.employeeId),
      )
      .leftJoin(
        departments,
        eq(employeeSubDepartments.departmentId, departments.id),
      )
      .leftJoin(
        departmentToSupervisor,
        eq(supervisors.id, departmentToSupervisor.supervisorId),
      )
      .leftJoin(
        sql`${departments} as supervisor_departments`,
        eq(departmentToSupervisor.departmentId, sql`supervisor_departments.id`),
      )
      .where(whereClause);

    // Group results and map to domain
    const grouped = this.groupEmployeeResults(items);
    return Promise.all(
      grouped.map((e) => this.mapToEmployeeWithRelations({ employees: e })),
    );
  }

  private groupEmployeeResults(items: any[]) {
    const map = new Map();

    for (const item of items) {
      if (!map.has(item.employee.id)) {
        map.set(item.employee.id, {
          ...item.employee,
          user: item.user,
          supervisor: item.supervisor
            ? {
                ...item.supervisor,
                departments: [],
              }
            : null,
          subDepartments: [],
        });
      }

      const emp = map.get(item.employee.id);

      if (item.subDepartment && item.department) {
        emp.subDepartments.push({
          ...item.subDepartment,
          department: item.department,
        });
      }

      if (item.supervisor && item.supervisorDepartment) {
        emp.supervisor.departments.push(item.supervisorDepartment);
      }
    }

    return Array.from(map.values());
  }
}
