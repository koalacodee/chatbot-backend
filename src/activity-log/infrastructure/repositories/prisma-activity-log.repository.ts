import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  ActivityLogRepository,
  ActivityTypePayload,
  AllGroupedActivities,
} from '../../domain/repositories/activity-log.repository';
import { ActivityLog } from '../../domain/entities/activity-log.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaActivityLogRepository extends ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<ActivityLog> {
    return ActivityLog.create({
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      type: row.type,
      title: row.title,
      meta: row.meta,
      itemId: row.itemId,
      occurredAt: row.occurredAt,
      userId: row.userId,
    });
  }

  async save(log: ActivityLog): Promise<ActivityLog> {
    const upsert = await this.prisma.activityLog.upsert({
      where: { id: log.id },
      update: {
        id: log.id,
        title: log.title,
        meta: {
          ...log.meta,
        },
        itemId: log.itemId,
        type: log.type,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        occurredAt: log.occurredAt,
        user: { connect: { id: log.userId } },
      },
      create: {
        id: log.id,
        title: log.title,
        meta: {
          ...log.meta,
        },
        itemId: log.itemId,
        type: log.type,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        occurredAt: log.occurredAt,
        user: { connect: { id: log.userId } },
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

  async getAggregatedActivityFeed(options: {
    userId?: string;
    limit?: number;
    cursor?: string;
  }) {
    const userIdFilter = options.userId
      ? Prisma.sql`al.user_id = ${options.userId}::uuid`
      : Prisma.sql`TRUE`;
    const cursorFilter = options.cursor
      ? Prisma.sql`al.occurred_at < ${options.cursor}`
      : Prisma.sql`TRUE`;

    const result = await this.prisma.$queryRaw<
      [{ data: ActivityTypePayload[]; nextCursor: string | null }]
    >`
      WITH filtered AS (
        SELECT al.*, u.name, u.employee_id
        FROM activity_logs al
        JOIN users u ON u.id = al.user_id
        WHERE ${userIdFilter}
          AND ${cursorFilter}
      ),
      grouped AS (
        SELECT
          type,
          json_build_object(
            'type', type,
            'activities', (
              SELECT json_agg(
                      json_build_object(
                        'id', id,
                        'title', title,
                        'itemId', item_id,
                        'meta', meta,
                        'createdAt', created_at,
                        'updatedAt', updated_at,
                        'occurredAt', occurred_at,
                        'userId', user_id,
                        'user', json_build_object(
                                  'id', user_id,
                                  'name', name,
                                  'employeeId', employee_id
                                )
                      )
                    ORDER BY occurred_at DESC
                    )
              FROM filtered f2
              WHERE f2.type = f1.type
              LIMIT ${options.limit ?? 10}
            )
          ) AS payload,
          -- last occurred_at of this type slice
          (SELECT max(occurred_at)
          FROM (
            SELECT occurred_at
            FROM filtered f2
            WHERE f2.type = f1.type
            ORDER BY occurred_at DESC
            LIMIT ${options.limit ?? 10}
          ) x) AS last_occurred_at
        FROM (SELECT DISTINCT type FROM filtered) AS f1
      )
      SELECT json_agg(payload) AS data,
            CASE
              WHEN min(last_occurred_at) IS NULL THEN NULL
              ELSE min(last_occurred_at)
            END AS nextCursor
      FROM grouped;

    `;

    return { data: result[0].data, nextCursor: result[0].nextCursor };
  }
}
