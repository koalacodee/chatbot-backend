import { Injectable } from '@nestjs/common';
import { asc, count, eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { violationRules } from 'src/common/drizzle/schema';
import { ViolationRule } from '../../domain/entities/violation-rule.entity';
import { ViolationRuleRepository } from '../../domain/repositories/violation-rule.repository';

type ViolationRuleRow = typeof violationRules.$inferSelect;
type ViolationTypeDb = ViolationRuleRow['type'];

/**
 * Prisma declared `enum ViolationType { SPEEDING @map("speeding") }`, so the domain saw
 * SCREAMING_CASE while Postgres stores lowercase. `ViolationRule.create` assigns `type`
 * without validating, so an unmapped read would be silent — the rule would simply stop
 * matching the domain enum — while an unmapped write fails the enum check outright.
 *
 * The domain's `ViolationType` is not exported from the entity module, so the domain side
 * is keyed by its string values rather than the enum itself.
 */
const TYPE_TO_DB: Record<string, ViolationTypeDb> = {
  SPEEDING: 'speeding',
  MISSED_MAINTENANCE: 'missed_maintenance',
};

const TYPE_TO_DOMAIN: Record<ViolationTypeDb, string> = {
  speeding: 'SPEEDING',
  missed_maintenance: 'MISSED_MAINTENANCE',
};

@Injectable()
export class DrizzleViolationRuleRepository extends ViolationRuleRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(row: ViolationRuleRow): ViolationRule {
    // Violations are deliberately not loaded here — the entity keeps its own list and
    // eager-loading them would cycle back through Violation -> ViolationRule.
    return ViolationRule.create({
      id: row.id,
      type: TYPE_TO_DOMAIN[row.type] as any,
      threshold: row.threshold,
      fineAmount: row.fineAmount,
      description: row.description,
      isEnabled: row.isEnabled,
    });
  }

  async save(rule: ViolationRule): Promise<ViolationRule> {
    const values = {
      id: rule.id,
      type: TYPE_TO_DB[rule.type],
      threshold: rule.threshold,
      fineAmount: rule.fineAmount,
      description: rule.description,
      isEnabled: rule.isEnabled,
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
    };

    const { id: _id, ...updatable } = values;

    const [saved] = await this.db
      .insert(violationRules)
      .values(values)
      .onConflictDoUpdate({ target: violationRules.id, set: updatable })
      .returning();

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<ViolationRule | null> {
    const rows = await this.db
      .select()
      .from(violationRules)
      .where(eq(violationRules.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<ViolationRule[]> {
    let query = this.db
      .select()
      .from(violationRules)
      .orderBy(asc(violationRules.id))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map((row) => this.toDomain(row));
  }

  async removeById(id: string): Promise<ViolationRule | null> {
    // One statement instead of the old read-then-delete pair.
    const deleted = await this.db
      .delete(violationRules)
      .where(eq(violationRules.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(violationRules)
      .where(eq(violationRules.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(violationRules);

    return Number(rows[0].value);
  }
}
