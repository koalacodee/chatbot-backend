import { Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, inArray, or, SQL } from 'drizzle-orm';
import {
  DatabaseInstance,
  DrizzleService,
  DrizzleTransaction,
} from 'src/common/drizzle/drizzle.service';
import {
  admins,
  departments as departmentsTable,
  departmentToSupervisor,
  drivers,
  employees,
  profilePictures,
  supervisors,
  users,
} from 'src/common/drizzle/schema';
import {
  UserQuery,
  UserRepository,
} from 'src/shared/repositories/user.repository';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Driver } from 'src/driver/domain/entities/driver.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { isUUID } from 'class-validator';

type UserRow = typeof users.$inferSelect;
type DrizzleUserRole = UserRow['role'];

/** Domain roles are upper-case; the `user_role` DB enum is lower-case. */
function toDbRole(role: Roles): DrizzleUserRole {
  return role.toLowerCase() as DrizzleUserRole;
}


@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db(): DatabaseInstance | DrizzleTransaction {
    return this.tx ?? this.drizzle.client;
  }

  private tx?: DrizzleTransaction;

  /**
   * Returns a repository bound to an open transaction, so callers can compose
   * user writes with other work in the same unit.
   */
  withTransaction(tx: DrizzleTransaction): DrizzleUserRepository {
    const scoped = new DrizzleUserRepository(this.drizzle);
    scoped.tx = tx;
    return scoped;
  }

  // ─── reads ────────────────────────────────────────────────────────────────

  private async findOne(
    where: SQL,
    query?: UserQuery,
  ): Promise<User | null> {
    if (!query?.includeEntity) {
      const rows = await this.db
        .select()
        .from(users)
        .where(where)
        .limit(1);
      return rows.length ? this.mapToDomain(rows[0]) : null;
    }

    // One round trip for the user plus each of the four role rows. Every join
    // is on a unique user_id, so this cannot fan out.
    const rows = await this.db
      .select({
        user: users,
        employee: employees,
        supervisor: supervisors,
        admin: admins,
        driver: drivers,
      })
      .from(users)
      .leftJoin(employees, eq(employees.userId, users.id))
      .leftJoin(supervisors, eq(supervisors.userId, users.id))
      .leftJoin(admins, eq(admins.userId, users.id))
      .leftJoin(drivers, eq(drivers.userId, users.id))
      .where(where)
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];

    // Supervisors carry a department list; second trip only when one exists.
    let supervisorDepartments: Department[] = [];
    if (row.supervisor) {
      const deptRows = await this.db
        .select({ department: departmentsTable })
        .from(departmentToSupervisor)
        .innerJoin(
          departmentsTable,
          eq(departmentToSupervisor.departmentId, departmentsTable.id),
        )
        .where(eq(departmentToSupervisor.supervisorId, row.supervisor.id));

      supervisorDepartments = deptRows.map((d) =>
        Department.create({
          id: d.department.id,
          name: d.department.name,
          visibility: d.department.visibility as any,
          parentId: d.department.parentId ?? undefined,
        }),
      );
    }

    return this.mapToDomain(row.user, {
      employee: row.employee,
      supervisor: row.supervisor,
      admin: row.admin,
      driver: row.driver,
      supervisorDepartments,
    });
  }

  async findById(id: string, query?: UserQuery): Promise<User | null> {
    return this.findOne(eq(users.id, id), query);
  }

  async findByEmail(email: string, query?: UserQuery): Promise<User | null> {
    return this.findOne(eq(users.email, email), query);
  }

  async findByUsername(
    username: string,
    query?: UserQuery,
  ): Promise<User | null> {
    return this.findOne(eq(users.username, username), query);
  }

  async findByEmployeeId(
    employeeId: string,
    query?: UserQuery,
  ): Promise<User | null> {
    return this.findOne(eq(users.employeeId, employeeId), query);
  }

  async findBySupervisorId(id: string, query?: UserQuery): Promise<User> {
    const rows = await this.db
      .select({ userId: supervisors.userId })
      .from(supervisors)
      .where(eq(supervisors.id, id))
      .limit(1);

    if (!rows.length) return null;
    return this.findOne(eq(users.id, rows[0].userId), query);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows.length > 0;
  }

  async existsById(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async search(query: string): Promise<User[]> {
    const q = query?.trim();

    const roleFilter = inArray(users.role, ['employee', 'supervisor']);

    // `id` is a uuid column — only compare it when the term could be one,
    // otherwise Postgres rejects the cast and the whole search 500s.
    const textFilter = q
      ? or(
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(users.username, `%${q}%`),
          ...(isUUID(q) ? [eq(users.id, q)] : []),
        )
      : undefined;

    const rows = await this.db
      .select({ user: users, profilePicture: profilePictures.filename })
      .from(users)
      .leftJoin(profilePictures, eq(profilePictures.userId, users.id))
      .where(textFilter ? and(roleFilter, textFilter) : roleFilter)
      .orderBy(asc(users.name));

    // A user may have several profile-picture rows; keep the first per user.
    const seen = new Set<string>();
    const deduped = rows.filter((r) => {
      if (seen.has(r.user.id)) return false;
      seen.add(r.user.id);
      return true;
    });

    return Promise.all(
      deduped.map((r) =>
        this.mapToDomain(r.user, { profilePicture: r.profilePicture }),
      ),
    );
  }

  // ─── writes ───────────────────────────────────────────────────────────────

  async save(user: User): Promise<User> {
    const values = {
      id: user.id,
      name: user.name,
      email: user.email.toString(),
      username: user.username,
      password: user.password.toString(),
      role: toDbRole(user.role.getRole()),
      employeeId: user.employeeId ?? null,
      jobTitle: user.jobTitle ?? null,
      updatedAt: new Date(),
    };

    const [row] = await this.db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: values.name,
          email: values.email,
          username: values.username,
          password: values.password,
          role: values.role,
          employeeId: values.employeeId,
          jobTitle: values.jobTitle,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    return this.mapToDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  // ─── mapping ──────────────────────────────────────────────────────────────

  private async mapToDomain(
    row: UserRow,
    relations?: {
      employee?: typeof employees.$inferSelect | null;
      supervisor?: typeof supervisors.$inferSelect | null;
      admin?: typeof admins.$inferSelect | null;
      driver?: typeof drivers.$inferSelect | null;
      supervisorDepartments?: Department[];
      profilePicture?: string | null;
    },
  ): Promise<User> {
    const employee = relations?.employee
      ? await Employee.create({
          id: relations.employee.id,
          userId: relations.employee.userId,
          permissions: (relations.employee.permissions ?? []) as any,
          supervisorId: relations.employee.supervisorId,
        })
      : undefined;

    const supervisor = relations?.supervisor
      ? Supervisor.create({
          id: relations.supervisor.id,
          userId: relations.supervisor.userId,
          permissions: (relations.supervisor.permissions ?? []) as any,
          departments: relations.supervisorDepartments ?? [],
          createdAt: relations.supervisor.createdAt,
          updatedAt: relations.supervisor.updatedAt,
        })
      : undefined;

    const admin = relations?.admin
      ? Admin.create({
          id: relations.admin.id,
          userId: relations.admin.userId,
        })
      : undefined;

    const driver = relations?.driver
      ? Driver.create({
          id: relations.driver.id,
          userId: relations.driver.userId,
          supervisorId: relations.driver.supervisorId,
          licensingNumber: relations.driver.licensingNumber,
          drivingLicenseExpiry: new Date(
            relations.driver.drivingLicenseExpiry,
          ),
        })
      : undefined;

    // `false` = the stored password is already an argon2 hash. Passing `true`
    // (the default) would re-hash it and break every password check.
    return User.create(
      {
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username,
        password: row.password,
        role: row.role as unknown as Roles,
        employeeId: row.employeeId ?? undefined,
        jobTitle: row.jobTitle ?? undefined,
        profilePicture: relations?.profilePicture ?? undefined,
        employee,
        supervisor,
        admin,
        driver,
      },
      false,
    );
  }
}
