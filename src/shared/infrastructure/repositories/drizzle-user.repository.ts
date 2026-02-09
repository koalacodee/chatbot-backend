import { eq, like, or } from 'drizzle-orm';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { supervisors, users } from '@/common/drizzle/schema';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { User } from '@/shared/entities/user.entity';

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

function mapToDrizzleUserRole(role: Roles): DrizzleUserRole {
  switch (role) {
    case Roles.SUPERVISOR:
      return 'supervisor';
    case Roles.ADMIN:
      return 'admin';
    case Roles.EMPLOYEE:
      return 'employee';
    case Roles.DRIVER:
      return 'driver';
  }
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseInstance | DrizzleTransaction) {}

  static fromTransaction(tx: DrizzleTransaction): DrizzleUserRepository {
    return new DrizzleUserRepository(tx);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0;
  }

  async existsById(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result.length > 0;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToUser(result[0]);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToUser(result[0]);
  }

  async findBySupervisorId(id: string): Promise<User | null> {
    const supervisorResult = await this.db
      .select()
      .from(supervisors)
      .innerJoin(users, eq(supervisors.userId, users.id))
      .where(eq(supervisors.id, id))
      .limit(1);

    if (supervisorResult.length === 0) {
      return null;
    }

    const supervisor = supervisorResult[0];
    return this.mapToUser(supervisor.users);
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToUser(result[0]);
  }

  async findByEmployeeId(employeeId: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.employeeId, employeeId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToUser(result[0]);
  }

  async save(user: User): Promise<User> {
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email.toString(),
      username: user.username,
      password: user.password.toString(),
      role: mapToDrizzleUserRole(user.role.getRole()),
      employeeId: user.employeeId ?? null,
      jobTitle: user.jobTitle ?? null,
      updatedAt: new Date(),
    };

    const result = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: userData.name,
          email: userData.email.toString(),
          username: userData.username,
          password: userData.password.toString(),
          role: mapToDrizzleUserRole(user.role.getRole()),
          employeeId: userData.employeeId,
          jobTitle: userData.jobTitle,
          updatedAt: userData.updatedAt,
        },
      })
      .returning();

    return this.mapToUser(result[0]);
  }

  async search(query: string): Promise<User[]> {
    const searchTerm = `%${query}%`;
    const result = await this.db
      .select()
      .from(users)
      .where(
        or(
          like(users.name, searchTerm),
          like(users.email, searchTerm),
          like(users.username, searchTerm),
          like(users.employeeId, searchTerm),
        ),
      );

    return Promise.all(result.map(this.mapToUser));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  private mapToUser(row: typeof users.$inferSelect): Promise<User> {
    return User.create({
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
      password: row.password,
      role: mapToUserRole(row.role),
      employeeId: row.employeeId ?? undefined,
      jobTitle: row.jobTitle ?? undefined,
    });
  }
}
