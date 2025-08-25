import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { UserRole } from '@prisma/client';

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

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    return (await user) ? this.mapToDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return (await user) ? this.mapToDomain(user) : null;
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

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return user ? this.mapToDomain(user) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { employeeId } });
    return user ? this.mapToDomain(user) : null;
  }

  async findBySupervisorId(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { supervisor: { id } },
    });
    console.log(user);

    return user ? this.mapToDomain(user) : null;
  }
}
