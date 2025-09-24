import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { Promotion } from '../../domain/entities/promotion.entity';
import {
  AudienceType,
  AudienceType as PrismaAudienceType,
} from '@prisma/client';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class PrismaPromotionRepository extends PromotionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<Promotion> {
    return Promotion.create({
      id: row.id,
      title: row.title,
      audience: row.audience,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startDate: row.startDate ?? undefined,
      endDate: row.endDate ?? undefined,
      createdByAdmin: row.createdByAdmin,
      createdBySupervisor: row.createdBySupervisor,
    });
  }

  async save(promotion: Promotion): Promise<Promotion> {
    const upsert = await this.prisma.promotion.upsert({
      where: { id: promotion.id.toString() },
      update: {
        title: promotion.title,
        audience: PrismaAudienceType[
          promotion.audience as keyof typeof PrismaAudienceType
        ] as any,
        isActive: promotion.isActive,
        startDate: promotion.startDate,
        endDate: promotion.endDate ?? null,
        updatedAt: new Date(),
        createdByAdmin: promotion.createdByAdmin
          ? {
              connect: { id: promotion.createdByAdmin.id.toString() },
            }
          : undefined,
        createdBySupervisor: promotion.createdBySupervisor
          ? {
              connect: { id: promotion.createdBySupervisor.id.toString() },
            }
          : undefined,
      },
      create: {
        id: promotion.id.toString(),
        title: promotion.title,
        audience: PrismaAudienceType[
          promotion.audience as keyof typeof PrismaAudienceType
        ] as any,
        isActive: promotion.isActive,
        createdAt: promotion.createdAt,
        updatedAt: new Date(),
        startDate: promotion.startDate,
        endDate: promotion.endDate ?? null,
        createdByAdmin: promotion.createdByAdmin
          ? {
              connect: { id: promotion.createdByAdmin.id.toString() },
            }
          : undefined,
        createdBySupervisor: promotion.createdBySupervisor
          ? {
              connect: { id: promotion.createdBySupervisor.id.toString() },
            }
          : undefined,
      },
      include: { createdByAdmin: true, createdBySupervisor: true },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<Promotion | null> {
    const row = await this.prisma.promotion.findUnique({
      where: { id },
      include: { createdByAdmin: true, createdBySupervisor: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { createdByAdmin: true, createdBySupervisor: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<Promotion | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.promotion.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.promotion.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.promotion.count();
  }

  async findByAudience(audience: string): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { audience: audience as any },
      orderBy: { createdAt: 'desc' },
      include: { createdByAdmin: true, createdBySupervisor: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findActive(): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { createdByAdmin: true, createdBySupervisor: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findActiveByAudience(audience: string): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { isActive: true, audience: audience as any },
      orderBy: { createdAt: 'desc' },
      include: { createdByAdmin: true, createdBySupervisor: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async getPromotionForUser(role: Roles): Promise<Promotion | null> {
    if (role === Roles.ADMIN) {
      return null;
    }

    const roleToAudienceMap: Record<Roles, AudienceType> = {
      GUEST: 'CUSTOMER',
      SUPERVISOR: 'SUPERVISOR',
      EMPLOYEE: 'EMPLOYEE',
      DRIVER: 'EMPLOYEE',
      ADMIN: undefined,
    };

    const now = new Date();

    const promotion = await this.prisma.promotion.findFirst({
      where: {
        isActive: true,
        OR: [{ audience: roleToAudienceMap[role] }, { audience: 'ALL' }],
        AND: [
          {
            OR: [{ startDate: null }, { startDate: { lte: now } }],
          },
          {
            OR: [
              { endDate: null },
              {
                endDate: {
                  gte: new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    23,
                    59,
                    59,
                    999,
                  ),
                },
              },
            ],
          },
        ],
      },
    });

    return promotion ? this.toDomain(promotion) : null;
  }

  async getPromotionForCustomer(): Promise<Promotion | null> {
    const now = new Date();

    const promotion = await this.prisma.promotion.findFirst({
      where: {
        isActive: true,
        OR: [{ audience: 'CUSTOMER' }, { audience: 'ALL' }],
        AND: [
          {
            OR: [{ startDate: null }, { startDate: { lte: now } }],
          },
          {
            OR: [
              { endDate: null },
              {
                endDate: {
                  gte: new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    23,
                    59,
                    59,
                    999,
                  ),
                },
              },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { createdByAdmin: true, createdBySupervisor: true },
    });

    return promotion ? this.toDomain(promotion) : null;
  }
}
