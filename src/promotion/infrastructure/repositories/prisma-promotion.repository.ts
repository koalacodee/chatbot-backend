import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { Promotion } from '../../domain/entities/promotion.entity';
import { AudienceType as PrismaAudienceType } from '@prisma/client';
import { User } from 'src/shared/entities/user.entity';

@Injectable()
export class PrismaPromotionRepository extends PromotionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<Promotion> {
    const createdBy: User = await User.create(row.createdBy, false);
    return Promotion.create({
      id: row.id,
      title: row.title,
      audience: row.audience,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startDate: row.startDate ?? undefined,
      endDate: row.endDate ?? undefined,
      createdBy,
    });
  }

  async save(promotion: Promotion): Promise<Promotion> {
    const upserted = await this.prisma.promotion.upsert({
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
        createdBy: { connect: { id: promotion.createdBy.id.toString() } },
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
        createdBy: { connect: { id: promotion.createdBy.id.toString() } },
      },
      include: { createdBy: true },
    });

    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Promotion | null> {
    const row = await this.prisma.promotion.findUnique({
      where: { id },
      include: { createdBy: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true },
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
      include: { createdBy: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findActive(): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findActiveByAudience(audience: string): Promise<Promotion[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { isActive: true, audience: audience as any },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }
}
