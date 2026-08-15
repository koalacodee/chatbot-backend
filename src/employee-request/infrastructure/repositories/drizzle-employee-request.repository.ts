import { Injectable } from '@nestjs/common';
import { SQL, and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  admins,
  departmentToSupervisor,
  departments,
  employeeRequests,
  employees,
  supervisors,
  users,
} from 'src/common/drizzle/schema';
import {
  Department,
  DepartmentVisibility,
} from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  Supervisor,
  SupervisorPermissionsEnum,
} from 'src/supervisor/domain/entities/supervisor.entity';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import {
  ApproveEmployeeRequestInput,
  ApproveEmployeeRequestResult,
  EmployeeRequestRepository,
} from '../../domain/repositories/employee-request.repository';

type RequestRow = typeof employeeRequests.$inferSelect;
type SupervisorRow = typeof supervisors.$inferSelect;
type UserRow = typeof users.$inferSelect;
type AdminRow = typeof admins.$inferSelect;
type DepartmentRow = typeof departments.$inferSelect;
type RequestStatusDb = RequestRow['status'];

/**
 * Prisma declared `enum RequestStatus { PENDING @map("pending") ... }`, so the domain saw
 * SCREAMING_CASE while Postgres stores lowercase. Drizzle does no such mapping, so every
 * read and every write has to cross that boundary explicitly.
 */
const STATUS_TO_DB: Record<RequestStatus, RequestStatusDb> = {
  [RequestStatus.PENDING]: 'pending',
  [RequestStatus.APPROVED]: 'approved',
  [RequestStatus.REJECTED]: 'rejected',
};

const STATUS_TO_DOMAIN: Record<RequestStatusDb, RequestStatus> = {
  pending: RequestStatus.PENDING,
  approved: RequestStatus.APPROVED,
  rejected: RequestStatus.REJECTED,
};

const RESOLVED_STATUSES: RequestStatusDb[] = ['approved', 'rejected'];

// The supervisor permission and department visibility enums are @map'd the same way, and
// in both cases the Postgres label is exactly the lowercase of the domain value.
const toPermission = (label: string) =>
  label.toUpperCase() as SupervisorPermissionsEnum;

const toVisibility = (label: string) =>
  label.toUpperCase() as DepartmentVisibility;

type EmployeeRow = typeof employees.$inferSelect;

/** The employee permission enum is @map'd like the rest — lowercase in Postgres. */
const toDbPermission = (permission: EmployeePermissionsEnum) =>
  permission.toLowerCase() as NonNullable<EmployeeRow['permissions']>[number];

@Injectable()
export class DrizzleEmployeeRequestRepository extends EmployeeRequestRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  // `users` is joined twice — once for the requesting supervisor, once for the resolving
  // admin — so each needs its own alias.
  private readonly supervisorUsers = alias(users, 'supervisor_users');
  private readonly adminUsers = alias(users, 'admin_users');

  private toUser(row: UserRow): Promise<User> {
    // `User.create` hashes by default, which would run argon2 over the already-hashed
    // password column once per row. The stored value is a hash.
    return User.create(
      {
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username,
        password: row.password,
        role: row.role.toUpperCase() as Roles,
        employeeId: row.employeeId ?? undefined,
        jobTitle: row.jobTitle ?? undefined,
      },
      false,
    );
  }

  private toDepartment(row: DepartmentRow): Department {
    return Department.create({
      id: row.id,
      name: row.name,
      visibility: toVisibility(row.visibility),
    });
  }

  private async toDomain(
    row: RequestRow,
    supervisorRow: SupervisorRow,
    supervisorUserRow: UserRow | null,
    departmentRows: DepartmentRow[],
    adminRow: AdminRow | null,
    adminUserRow: UserRow | null,
  ): Promise<EmployeeRequest> {
    const [supervisorUser, adminUser] = await Promise.all([
      supervisorUserRow ? this.toUser(supervisorUserRow) : undefined,
      adminUserRow ? this.toUser(adminUserRow) : undefined,
    ]);

    return EmployeeRequest.create({
      id: row.id,
      requestedBySupervisorId: row.requestedBySupervisorId,
      requestedBySupervisor: Supervisor.create({
        id: supervisorRow.id,
        userId: supervisorRow.userId,
        user: supervisorUser,
        permissions: (supervisorRow.permissions ?? []).map(toPermission),
        departments: departmentRows.map((department) =>
          this.toDepartment(department),
        ),
        createdAt: supervisorRow.createdAt,
        updatedAt: supervisorRow.updatedAt,
      }),
      newEmployeeEmail: Email.create(row.newEmployeeEmail),
      newEmployeeFullName: row.newEmployeeFullName,
      newEmployeeUsername: row.newEmployeeUsername,
      newEmployeeJobTitle: row.newEmployeeJobTitle,
      newEmployeeId: row.newEmployeeId ?? undefined,
      temporaryPassword: row.temporaryPassword,
      newEmployeeDesignation: row.newEmployeeDesignation ?? undefined,
      status: STATUS_TO_DOMAIN[row.status],
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : undefined,
      resolvedByAdmin: adminRow
        ? Admin.create({
            id: adminRow.id,
            userId: adminRow.userId,
            user: adminUser,
          })
        : undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      acknowledgedBySupervisor: row.acknowledgedBySupervisor ?? false,
    });
  }

  /**
   * Every read in this repository is the same join with a different predicate, so they
   * all funnel through here. Departments come back in one batched follow-up keyed by
   * supervisor rather than a lookup per request.
   */
  private async loadMany(
    where?: SQL,
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]> {
    let query = this.db
      .select({
        request: employeeRequests,
        supervisor: supervisors,
        supervisorUser: this.supervisorUsers,
        admin: admins,
        adminUser: this.adminUsers,
      })
      .from(employeeRequests)
      .innerJoin(
        supervisors,
        eq(supervisors.id, employeeRequests.requestedBySupervisorId),
      )
      .leftJoin(this.supervisorUsers, eq(this.supervisorUsers.id, supervisors.userId))
      .leftJoin(admins, eq(admins.id, employeeRequests.resolvedByAdminId))
      .leftJoin(this.adminUsers, eq(this.adminUsers.id, admins.userId))
      .where(where)
      .orderBy(desc(employeeRequests.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    if (rows.length === 0) return [];

    const supervisorIds = [...new Set(rows.map((row) => row.supervisor.id))];

    const departmentRows = await this.db
      .select({
        supervisorId: departmentToSupervisor.supervisorId,
        department: departments,
      })
      .from(departmentToSupervisor)
      .innerJoin(
        departments,
        eq(departments.id, departmentToSupervisor.departmentId),
      )
      .where(inArray(departmentToSupervisor.supervisorId, supervisorIds));

    const departmentsBySupervisor = new Map<string, DepartmentRow[]>();

    for (const row of departmentRows) {
      const bucket = departmentsBySupervisor.get(row.supervisorId) ?? [];
      bucket.push(row.department);
      departmentsBySupervisor.set(row.supervisorId, bucket);
    }

    return Promise.all(
      rows.map((row) =>
        this.toDomain(
          row.request,
          row.supervisor,
          row.supervisorUser,
          departmentsBySupervisor.get(row.supervisor.id) ?? [],
          row.admin,
          row.adminUser,
        ),
      ),
    );
  }

  private toRow(request: EmployeeRequest, updatedAt: Date) {
    return {
      id: request.id.toString(),
      requestedBySupervisorId: request.requestedBySupervisor.id.toString(),
      newEmployeeEmail: request.newEmployeeEmail.toString(),
      newEmployeeFullName: request.newEmployeeFullName ?? null,
      newEmployeeUsername: request.newEmployeeUsername ?? null,
      newEmployeeJobTitle: request.newEmployeeJobTitle ?? null,
      temporaryPassword: request.temporaryPassword ?? null,
      newEmployeeDesignation: request.newEmployeeDesignation ?? null,
      newEmployeeId: request.newEmployeeId ?? null,
      status: STATUS_TO_DB[request.status],
      createdAt: request.createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      resolvedAt: request.resolvedAt?.toISOString() ?? null,
      resolvedByAdminId: request.resolvedByAdmin?.id.toString() ?? null,
      rejectionReason: request.rejectionReason ?? null,
      acknowledgedBySupervisor: request.acknowledgedBySupervisor,
    };
  }

  /**
   * Mirrors Prisma's `update` block, which deliberately left the immutable new-employee
   * fields and createdAt alone.
   */
  private updatableColumns(values: ReturnType<typeof this.toRow>) {
    return {
      requestedBySupervisorId: values.requestedBySupervisorId,
      newEmployeeEmail: values.newEmployeeEmail,
      newEmployeeFullName: values.newEmployeeFullName,
      newEmployeeDesignation: values.newEmployeeDesignation,
      newEmployeeId: values.newEmployeeId,
      status: values.status,
      resolvedAt: values.resolvedAt,
      resolvedByAdminId: values.resolvedByAdminId,
      rejectionReason: values.rejectionReason,
      acknowledgedBySupervisor: values.acknowledgedBySupervisor,
      updatedAt: values.updatedAt,
    };
  }

  async save(request: EmployeeRequest): Promise<EmployeeRequest> {
    const values = this.toRow(request, new Date());

    const [saved] = await this.db
      .insert(employeeRequests)
      .values(values)
      .onConflictDoUpdate({
        target: employeeRequests.id,
        set: this.updatableColumns(values),
      })
      .returning();

    // Prisma re-mapped the bare upserted row, which carried no relations, so the entity
    // it handed back had an undefined supervisor. The caller already owns both relations,
    // so reuse them instead of losing them or paying for another round trip.
    return EmployeeRequest.create({
      id: saved.id,
      requestedBySupervisorId: saved.requestedBySupervisorId,
      requestedBySupervisor: request.requestedBySupervisor,
      newEmployeeEmail: Email.create(saved.newEmployeeEmail),
      newEmployeeFullName: saved.newEmployeeFullName,
      newEmployeeUsername: saved.newEmployeeUsername,
      newEmployeeJobTitle: saved.newEmployeeJobTitle,
      newEmployeeId: saved.newEmployeeId ?? undefined,
      temporaryPassword: saved.temporaryPassword,
      newEmployeeDesignation: saved.newEmployeeDesignation ?? undefined,
      status: STATUS_TO_DOMAIN[saved.status],
      createdAt: new Date(saved.createdAt),
      updatedAt: new Date(saved.updatedAt),
      resolvedAt: saved.resolvedAt ? new Date(saved.resolvedAt) : undefined,
      resolvedByAdmin: request.resolvedByAdmin,
      rejectionReason: saved.rejectionReason ?? undefined,
      acknowledgedBySupervisor: saved.acknowledgedBySupervisor ?? false,
    });
  }

  /**
   * The three writes an approval implies, in one transaction: the new user, the employee
   * row pointing at it, and the request moving to APPROVED.
   *
   * The row shapes are duplicated from the user and employee repositories on purpose —
   * those expose `save(entity)` against their own connection, so there is no way to
   * enlist them in a transaction owned here without threading a transaction handle
   * through every repository interface. Duplicating two small value maps is the cheaper
   * trade; the alternative is leaving the sequence non-atomic.
   */
  async approveTransactionally(
    input: ApproveEmployeeRequestInput,
  ): Promise<ApproveEmployeeRequestResult> {
    const { request, user, employee } = input;
    const now = new Date();

    const userValues = {
      id: user.id,
      name: user.name,
      email: user.email.toString(),
      username: user.username,
      password: user.password.toString(),
      role: user.role.getRole().toLowerCase() as UserRow['role'],
      employeeId: user.employeeId ?? null,
      jobTitle: user.jobTitle ?? null,
      updatedAt: now,
    };

    const employeeValues = {
      id: employee.id.toString(),
      userId: employee.userId.toString(),
      permissions: employee.permissions.map(toDbPermission),
      supervisorId: employee.supervisorId.toString(),
    };

    const requestValues = this.toRow(request, now);

    await this.db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values(userValues)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            name: userValues.name,
            email: userValues.email,
            username: userValues.username,
            password: userValues.password,
            role: userValues.role,
            employeeId: userValues.employeeId,
            jobTitle: userValues.jobTitle,
            updatedAt: userValues.updatedAt,
          },
        });

      await tx
        .insert(employees)
        .values(employeeValues)
        .onConflictDoUpdate({
          target: employees.id,
          set: {
            userId: employeeValues.userId,
            permissions: employeeValues.permissions,
            supervisorId: employeeValues.supervisorId,
          },
        });

      await tx
        .insert(employeeRequests)
        .values(requestValues)
        .onConflictDoUpdate({
          target: employeeRequests.id,
          set: this.updatableColumns(requestValues),
        });
    });

    // The caller owns fully-built entities already; re-reading would only cost round trips
    // and lose the relations the request carries.
    return { request, user, employee };
  }

  async findById(id: string): Promise<EmployeeRequest | null> {
    const rows = await this.loadMany(eq(employeeRequests.id, id), undefined, 1);

    return rows[0] ?? null;
  }

  async findAll(offset?: number, limit?: number): Promise<EmployeeRequest[]> {
    return this.loadMany(undefined, offset, limit);
  }

  async removeById(id: string): Promise<EmployeeRequest | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(employeeRequests).where(eq(employeeRequests.id, id));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(employeeRequests)
      .where(eq(employeeRequests.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(employeeRequests);

    return Number(rows[0].value);
  }

  async findBySupervisorId(
    supervisorId: string,
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]> {
    return this.loadMany(
      eq(employeeRequests.requestedBySupervisorId, supervisorId),
      offset,
      limit,
    );
  }

  async findByStatuses(
    statuses: RequestStatus[],
    offset?: number,
    limit?: number,
    supervisorId?: string,
  ): Promise<EmployeeRequest[]> {
    const dbStatuses = statuses.map((status) => STATUS_TO_DB[status]);

    const where = supervisorId
      ? and(
          inArray(employeeRequests.status, dbStatuses),
          eq(employeeRequests.requestedBySupervisorId, supervisorId),
        )
      : inArray(employeeRequests.status, dbStatuses);

    return this.loadMany(where, offset, limit);
  }

  async findPending(
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]> {
    return this.loadMany(eq(employeeRequests.status, 'pending'), offset, limit);
  }

  async countPending(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(employeeRequests)
      .where(eq(employeeRequests.status, 'pending'));

    return Number(rows[0].value);
  }

  async findResolved(
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]> {
    return this.loadMany(
      inArray(employeeRequests.status, RESOLVED_STATUSES),
      offset,
      limit,
    );
  }
}
