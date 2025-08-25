import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ActivityLogRepository } from '../../domain/repositories/activity-log.repository';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import { User } from 'src/shared/entities/user.entity';

@Injectable()
export class PrismaActivityLogRepository extends ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<ActivityLog> {
    const user: User = await User.create(row.user, false);
    return ActivityLog.create({
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user,
      activity: row.activity,
      details: row.details,
      itemId: row.itemId,
    });
  }

  async save(log: ActivityLog): Promise<ActivityLog> {
    const upsert = await this.prisma.activityLog.upsert({
      where: { id: log.id },
      update: {
        activity: log.activity,
        details: log.details,
        itemId: log.itemId,
        updatedAt: new Date(),
        user: { connect: { id: log.user.id.toString() } },
      },
      create: {
        id: log.id,
        activity: log.activity,
        details: log.details,
        itemId: log.itemId,
        createdAt: log.createdAt,
        updatedAt: new Date(),
        user: { connect: { id: log.user.id.toString() } },
      },
      include: { user: true },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<ActivityLog | null> {
    const row = await this.prisma.activityLog.findUnique({
      where: { id },
      include: { user: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<ActivityLog[]> {
    const rows = await this.prisma.activityLog.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<ActivityLog | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.activityLog.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.activityLog.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.activityLog.count();
  }

  async findByUserId(
    userId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]> {
    const rows = await this.prisma.activityLog.findMany({
      where: { userId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findByItemId(
    itemId: string,
    offset?: number,
    limit?: number,
  ): Promise<ActivityLog[]> {
    const rows = await this.prisma.activityLog.findMany({
      where: { itemId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }
}
