import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ViolationRuleRepository } from '../../domain/repositories/violation-rule.repository';
import { ViolationRule } from '../../domain/entities/violation-rule.entity';
import { ViolationType as PrismaViolationType } from '@prisma/client';

@Injectable()
export class PrismaViolationRuleRepository extends ViolationRuleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(row: any): ViolationRule {
    // We are not eagerly mapping violations to avoid cycles; services can load as needed
    return ViolationRule.create({
      id: row.id,
      type: row.type,
      threshold: row.threshold,
      fineAmount: row.fineAmount,
      description: row.description,
      isEnabled: row.isEnabled,
    });
  }

  async save(rule: ViolationRule): Promise<ViolationRule> {
    const upsert = await this.prisma.violationRule.upsert({
      where: { id: rule.id },
      update: {
        type: PrismaViolationType[
          rule.type as keyof typeof PrismaViolationType
        ] as any,
        threshold: rule.threshold,
        fineAmount: rule.fineAmount,
        description: rule.description,
        isEnabled: rule.isEnabled,
      },
      create: {
        id: rule.id,
        type: PrismaViolationType[
          rule.type as keyof typeof PrismaViolationType
        ] as any,
        threshold: rule.threshold,
        fineAmount: rule.fineAmount,
        description: rule.description,
        isEnabled: rule.isEnabled,
      },
    });
    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<ViolationRule | null> {
    const row = await this.prisma.violationRule.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<ViolationRule[]> {
    const rows = await this.prisma.violationRule.findMany({
      skip: offset,
      take: limit,
      orderBy: { id: 'asc' },
    });
    return rows.map((r: any) => this.toDomain(r));
  }

  async removeById(id: string): Promise<ViolationRule | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.violationRule.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.violationRule.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.violationRule.count();
  }
}
