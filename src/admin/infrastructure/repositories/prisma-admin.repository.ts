import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Admin } from '../../domain/entities/admin.entity';
import { AdminRepository } from '../../domain/repositories/admin.repository';

@Injectable()
export class PrismaAdminRepository extends AdminRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(admin: any): Admin {
    return Admin.create({
      id: admin.id,
      userId: admin.userId,
      // pass-through optional relations if they were included by caller
      user: admin?.user,
      promotions: admin?.promotions,
      approvedTasks: admin?.approvedTasks,
      adminResolutions: admin?.adminResolutions,
      questions: admin?.questions,
      supportTicketAnswersAuthored: admin?.supportTicketAnswersAuthored,
      performerTasks: admin?.performerTasks,
      // createdAt/updatedAt not present in Prisma Admin model; entity will default
    });
  }

  private toPrismaData(entity: Admin) {
    const json = entity.toJSON();
    return {
      id: json.id,
      userId: json.userId,
    } as const;
  }

  async save(admin: Admin): Promise<Admin> {
    const data = this.toPrismaData(admin);
    const upsert = await this.prisma.admin.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<Admin | null> {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    return admin ? this.toDomain(admin) : null;
  }

  async findAll(): Promise<Admin[]> {
    const items = await this.prisma.admin.findMany();
    return items.map((a) => this.toDomain(a));
  }

  async removeById(id: string): Promise<Admin | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.admin.delete({ where: { id } });
    return existing;
  }

  async findByIds(ids: string[]): Promise<Admin[]> {
    const items = await this.prisma.admin.findMany({
      where: { id: { in: ids } },
    });
    return items.map((a) => this.toDomain(a));
  }

  async update(id: string, update: Partial<Admin>): Promise<Admin> {
    const data: any = {};
    if ((update as any)?.userId)
      data.userId =
        (update as any).userId.toString?.() ?? (update as any).userId;

    const updated = await this.prisma.admin.update({ where: { id }, data });
    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.admin.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.admin.count();
  }

  async findByUserId(userId: string): Promise<Admin | null> {
    const admin = await this.prisma.admin.findUnique({ where: { userId } });
    return admin ? this.toDomain(admin) : null;
  }
}
