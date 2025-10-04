import { Injectable, NotFoundException } from '@nestjs/common';
import {
  UserQuery,
  UserRepository,
} from 'src/shared/repositories/user.repository';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { UserRole } from '@prisma/client';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Driver } from 'src/driver/domain/entities/driver.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Department } from 'src/department/domain/entities/department.entity';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(user: User): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (existing) {
      const toUpdate: Partial<Record<keyof User, any>> = {};

      for (const key of Object.keys(user.toJSON())) {
        if (!user[key]) continue;
        const newValue = user[key].toString ? user[key].toString() : user[key];
        const oldValue = existing[key];

        if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
          toUpdate[key] = newValue;
        }
      }

      if (Object.keys(toUpdate).length === 0) {
        return this.mapToDomain(existing);
      }

      return this.mapToDomain(
        await this.prisma.user.update({
          where: { id: user.id },
          data: toUpdate,
        }),
      );
    }

    // create logic
    return this.mapToDomain(
      await this.prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email.toString(),
          password: user.password.toString(),
          role: user.role.getRole() as UserRole,
          username: user.username,
          employeeId: user.employeeId,
          jobTitle: user.jobTitle,
        },
      }),
    );
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  async findByEmail(email: string, query: UserQuery): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        employee: query?.includeEntity,
        supervisor: query?.includeEntity
          ? { include: { departments: true } }
          : undefined,
        admin: query?.includeEntity,
        driver: query?.includeEntity,
      },
    });

    return (await user) ? this.mapToDomain(user) : null;
  }

  async findById(id: string, query: UserQuery): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        employee: query?.includeEntity,
        supervisor: query?.includeEntity
          ? { include: { departments: true } }
          : undefined,
        admin: query?.includeEntity,
        driver: query?.includeEntity,
      },
    });
    return user ? this.mapToDomain(user) : null;
  }

  private async mapToDomain(user: any): Promise<User> {
    return await User.create(
      {
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        id: user.id,
        username: user.username,
        jobTitle: user.jobTitle,
        employeeId: user.employeeId,
        profilePicture: user.profilePicture,
        employee: user.employee
          ? await Employee.create(user.employee)
          : undefined,
        driver: user.driver ? Driver.create(user.driver) : undefined,
        supervisor: user.supervisor
          ? Supervisor.create({
              ...user.supervisor,
              departments: user.supervisor.departments.map((dept: any) =>
                Department.create(dept),
              ),
            })
          : undefined,
        admin: user.admin ? Admin.create(user.admin) : undefined,
      },
      false,
    );
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id } });
    return count > 0;
  }

  async searchSupervisors(search: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: search } },
          { id: search },
          { email: { contains: search } },
        ],
        role: Roles.SUPERVISOR,
      },
    });
    return Promise.all(users.map((user) => this.mapToDomain(user)));
  }

  async findByUsername(
    username: string,
    query: UserQuery,
  ): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        employee: query?.includeEntity,
        supervisor: query?.includeEntity
          ? { include: { departments: true } }
          : undefined,
        admin: query?.includeEntity,
        driver: query?.includeEntity,
      },
    });
    return user ? this.mapToDomain(user) : null;
  }

  async findByEmployeeId(
    employeeId: string,
    query: UserQuery,
  ): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { employeeId },
      include: {
        employee: query?.includeEntity,
        supervisor: query?.includeEntity
          ? { include: { departments: true } }
          : undefined,
        admin: query?.includeEntity,
        driver: query?.includeEntity,
      },
    });
    return user ? this.mapToDomain(user) : null;
  }

  async findBySupervisorId(id: string, query: UserQuery): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { supervisor: { id } },
      include: {
        employee: query?.includeEntity,
        supervisor: query?.includeEntity
          ? { include: { departments: true } }
          : undefined,
        admin: query?.includeEntity,
        driver: query?.includeEntity,
      },
    });

    return user ? this.mapToDomain(user) : null;
  }

  async search(query: string): Promise<User[]> {
    const q = query?.trim();
    const rows = await this.prisma.user.findMany({
      where: {
        AND: [
          { role: { in: [UserRole.EMPLOYEE, UserRole.SUPERVISOR] } },
          q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                  { username: { contains: q, mode: 'insensitive' } },
                  { id: q },
                ],
              }
            : {},
        ],
      },
      orderBy: { name: 'asc' },
      include: { profilePictures: true },
    });
    return Promise.all(
      rows.map((r) =>
        User.create(
          {
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password,
            role: r.role as any, // domain accepts underlying enum when skipValidation = false
            username: r.username,
            employeeId: r.employeeId,
            jobTitle: r.jobTitle,
            profilePicture: r.profilePictures[0],
          },
          false,
        ),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
