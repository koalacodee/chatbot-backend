import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { User } from 'src/shared/entities/user.entity';

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

      for (const key of Object.keys(user.toJSON()) as Array<keyof User>) {
        const newValue = user[key].toString();
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
          role: user.role.getRole(),
        },
      }),
    );
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException({ email: 'user_not_found' });
    return await this.mapToDomain(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ email: 'user_not_found' });
    return await this.mapToDomain(user);
  }

  private async mapToDomain(user: any): Promise<User> {
    return await User.create(
      {
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        id: user.id,
      },
      false,
    );
  }
}
