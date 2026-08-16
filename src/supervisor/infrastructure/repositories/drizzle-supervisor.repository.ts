import { Injectable } from '@nestjs/common';
import { SQL, and, count, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  departmentToSupervisor,
  departments,
  drivers,
  employeeRequests,
  employees,
  knowledgeChunks,
  profilePictures,
  promotions,
  questions,
  supervisors,
  supportTicketAnswers,
  taskSubmissions,
  tasks,
  users,
} from 'src/common/drizzle/schema';
import {
  Department,
  DepartmentVisibility,
} from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  Supervisor,
  SupervisorPermissionsEnum,
} from '../../domain/entities/supervisor.entity';
import {
  SupervisorRepository,
  SupervisorSummary,
} from '../../domain/repository/supervisor.repository';

type SupervisorRow = typeof supervisors.$inferSelect;
type UserRow = typeof users.$inferSelect;
type DepartmentRow = typeof departments.$inferSelect;

// AdminPermissions and DepartmentVisibility are both @map'd in Prisma, and in both cases
// the Postgres label is exactly the lowercase of the domain value.
const toPermissionDomain = (label: string) =>
  label.toUpperCase() as SupervisorPermissionsEnum;

const toPermissionDb = (permission: SupervisorPermissionsEnum) =>
  permission.toLowerCase() as (typeof supervisors.permissions._.data)[number];

@Injectable()
export class DrizzleSupervisorRepository extends SupervisorRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toUser(row: UserRow): Promise<User> {
    // `User.create` hashes by default, which would run argon2 over the already-hashed
    // password column on every supervisor read.
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

  /**
   * Only `departments`, `user` and `permissions` are ever read off a loaded Supervisor
   * anywhere in the codebase. The other seven relation arrays default to [] in the
   * constructor, which is what the Prisma version effectively produced for them anyway —
   * see the note on `load()`.
   */
  private async toDomain(
    row: SupervisorRow,
    userRow: UserRow | null,
    departmentRows: DepartmentRow[],
  ): Promise<Supervisor> {
    return Supervisor.create({
      id: row.id,
      userId: row.userId,
      user: userRow ? await this.toUser(userRow) : undefined,
      permissions: (row.permissions ?? []).map(toPermissionDomain),
      departments: departmentRows.map((department) =>
        Department.create({
          id: department.id,
          name: department.name,
          visibility: department.visibility.toUpperCase() as DepartmentVisibility,
          parentId: department.parentId ?? undefined,
          isExposedToTvContent: department.isExposedToTvContent,
        }),
      ),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /**
   * Shared by every read. Two queries: supervisors with their user, then all of their
   * departments in one batched pass keyed by supervisor.
   *
   * The Prisma version eagerly included assignerTasks, employeeRequests, promotions,
   * tasksReviewed, questions, supportTicketAnswersAuthored and tasksPerformed on all of
   * these — every task a supervisor ever assigned, every question they wrote, and so on,
   * loaded on every login and every RBAC check, then dropped on the floor. Two of them
   * (`approvedTasks`, `performedTasks`) were already always empty because the mapper read
   * property names the include never produced.
   */
  private async load(where?: SQL): Promise<Supervisor[]> {
    const rows = await this.db
      .select({ supervisor: supervisors, user: users })
      .from(supervisors)
      .leftJoin(users, eq(users.id, supervisors.userId))
      .where(where);

    if (rows.length === 0) return [];

    const supervisorIds = rows.map((row) => row.supervisor.id);

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

    const bySupervisor = new Map<string, DepartmentRow[]>();

    for (const row of departmentRows) {
      const bucket = bySupervisor.get(row.supervisorId) ?? [];
      bucket.push(row.department);
      bySupervisor.set(row.supervisorId, bucket);
    }

    return Promise.all(
      rows.map((row) =>
        this.toDomain(
          row.supervisor,
          row.user,
          bySupervisor.get(row.supervisor.id) ?? [],
        ),
      ),
    );
  }

  /**
   * Prisma's `departments: { set: [...] }` replaces the join rows wholesale. This is a
   * true many-to-many, so unlike the driver relations that really is expressible.
   */
  private async syncDepartments(
    tx: Parameters<Parameters<typeof this.db.transaction>[0]>[0],
    supervisorId: string,
    departmentIds: string[],
  ): Promise<void> {
    if (departmentIds.length === 0) {
      await tx
        .delete(departmentToSupervisor)
        .where(eq(departmentToSupervisor.supervisorId, supervisorId));
      return;
    }

    await tx
      .delete(departmentToSupervisor)
      .where(
        and(
          eq(departmentToSupervisor.supervisorId, supervisorId),
          notInArray(departmentToSupervisor.departmentId, departmentIds),
        ),
      );

    await tx
      .insert(departmentToSupervisor)
      .values(
        departmentIds.map((departmentId) => ({ supervisorId, departmentId })),
      )
      .onConflictDoNothing();
  }

  async save(supervisor: Supervisor): Promise<Supervisor> {
    const data = supervisor.toPersistence();
    const departmentIds = data.departments.map((department) =>
      department.id.toString(),
    );

    await this.db.transaction(async (tx) => {
      await tx
        .insert(supervisors)
        .values({
          id: data.id,
          userId: data.userId,
          permissions: data.permissions.map(toPermissionDb),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: supervisors.id,
          set: {
            userId: data.userId,
            permissions: data.permissions.map(toPermissionDb),
            updatedAt: new Date(),
          },
        });

      await this.syncDepartments(tx, data.id, departmentIds);
    });

    const [saved] = await this.load(eq(supervisors.id, data.id));

    return saved;
  }

  async findById(id: string): Promise<Supervisor | null> {
    const found = await this.load(eq(supervisors.id, id));

    return found[0] ?? null;
  }

  async findByUserId(userId: string): Promise<Supervisor | null> {
    const found = await this.load(eq(supervisors.userId, userId));

    return found[0] ?? null;
  }

  async findAll(): Promise<Supervisor[]> {
    return this.load();
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(supervisors).where(eq(supervisors.id, id));
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(supervisors)
      .where(eq(supervisors.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async update(id: string, supervisor: Supervisor): Promise<void> {
    const data = supervisor.toPersistence();
    const departmentIds = data.departments.map((department) =>
      department.id.toString(),
    );

    await this.db.transaction(async (tx) => {
      await tx
        .update(supervisors)
        .set({
          userId: data.userId,
          permissions: data.permissions.map(toPermissionDb),
          updatedAt: new Date(),
        })
        .where(eq(supervisors.id, id));

      await this.syncDepartments(tx, id, departmentIds);
    });
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(supervisors);

    return Number(rows[0].value);
  }

  private supervisorsInDepartments(where: SQL) {
    return this.db
      .select({ id: departmentToSupervisor.supervisorId })
      .from(departmentToSupervisor)
      .innerJoin(
        departments,
        eq(departments.id, departmentToSupervisor.departmentId),
      )
      .where(where);
  }

  async findManyByDepartmentId(departmentId: string): Promise<Supervisor[]> {
    return this.load(
      inArray(
        supervisors.id,
        this.supervisorsInDepartments(eq(departments.id, departmentId)),
      ),
    );
  }

  async findByDepartmentIds(departmentIds: string[]): Promise<Supervisor[]> {
    if (departmentIds.length === 0) return [];

    return this.load(
      inArray(
        supervisors.id,
        this.supervisorsInDepartments(inArray(departments.id, departmentIds)),
      ),
    );
  }

  async search(query: string): Promise<Supervisor[]> {
    const pattern = `%${query}%`;

    return this.load(
      or(
        ilike(users.name, pattern),
        ilike(users.email, pattern),
        inArray(
          supervisors.id,
          this.supervisorsInDepartments(ilike(departments.name, pattern)),
        ),
      ),
    );
  }

  private async hasAny(table: any, where: SQL): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(table)
      .where(where)
      .limit(1);

    return rows.length > 0;
  }

  async canDelete(id: string): Promise<boolean> {
    // Sequential on purpose — each check short-circuits the rest. EXISTS rather than
    // COUNT(*), since only the presence of a row matters.
    //
    // The questions check tests authorship. It previously compared `department_id`
    // against the supervisor id — copied from a department guard and never re-pointed —
    // so it could never match. `knowledge_chunks` has no supervisor column at all, so
    // that check had no meaning and is gone.
    if (await this.hasAny(questions, eq(questions.creatorSupervisorId, id)))
      return false;

    if (
      await this.hasAny(
        supportTicketAnswers,
        eq(supportTicketAnswers.answererSupervisorId, id),
      )
    )
      return false;

    if (await this.hasAny(employees, eq(employees.supervisorId, id)))
      return false;

    if (await this.hasAny(tasks, eq(tasks.assignerSupervisorId, id)))
      return false;

    if (
      await this.hasAny(
        taskSubmissions,
        or(
          eq(taskSubmissions.performerSupervisorId, id),
          eq(taskSubmissions.reviewedBySupervisorId, id),
        ),
      )
    )
      return false;

    return true;
  }

  async getSupervisorSummaries(
    departmentIds?: string[],
  ): Promise<SupervisorSummary[]> {
    // Membership stays a subquery so a supervisor covering several departments still
    // yields one row.
    const memberOf = this.db
      .select({ id: departmentToSupervisor.supervisorId })
      .from(departmentToSupervisor)
      .where(
        departmentIds?.length
          ? inArray(departmentToSupervisor.departmentId, departmentIds)
          : undefined,
      );

    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        profilePicture: profilePictures.id,
      })
      .from(users)
      .innerJoin(supervisors, eq(supervisors.userId, users.id))
      .leftJoin(profilePictures, eq(profilePictures.userId, users.id))
      .where(inArray(supervisors.id, memberOf));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      profilePicture: row.profilePicture ?? undefined,
    }));
  }

  async delegateSupervisorResponsibilities(
    fromSupervisorId: string,
    toSupervisorId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(employees)
        .set({ supervisorId: toSupervisorId })
        .where(eq(employees.supervisorId, fromSupervisorId));

      await tx
        .update(tasks)
        .set({ assignerSupervisorId: toSupervisorId })
        .where(eq(tasks.assignerSupervisorId, fromSupervisorId));

      await tx
        .update(taskSubmissions)
        .set({ performerSupervisorId: toSupervisorId })
        .where(eq(taskSubmissions.performerSupervisorId, fromSupervisorId));

      await tx
        .update(taskSubmissions)
        .set({ reviewedBySupervisorId: toSupervisorId })
        .where(eq(taskSubmissions.reviewedBySupervisorId, fromSupervisorId));

      await tx
        .update(supportTicketAnswers)
        .set({ answererSupervisorId: toSupervisorId })
        .where(eq(supportTicketAnswers.answererSupervisorId, fromSupervisorId));

      await tx
        .update(questions)
        .set({ creatorSupervisorId: toSupervisorId })
        .where(eq(questions.creatorSupervisorId, fromSupervisorId));

      await tx
        .update(promotions)
        .set({ createdBySupervisorId: toSupervisorId })
        .where(eq(promotions.createdBySupervisorId, fromSupervisorId));

      await tx
        .update(employeeRequests)
        .set({ requestedBySupervisorId: toSupervisorId })
        .where(
          eq(employeeRequests.requestedBySupervisorId, fromSupervisorId),
        );

      await tx
        .update(drivers)
        .set({ supervisorId: toSupervisorId })
        .where(eq(drivers.supervisorId, fromSupervisorId));
    });
  }

  async softDeleteSupervisor(id: string): Promise<void> {
    // Named "soft" but it is a hard delete, relying on the schema's cascades — same as
    // the Prisma version. There is no deletedAt column to set.
    await this.db.delete(supervisors).where(eq(supervisors.id, id));
  }
}
