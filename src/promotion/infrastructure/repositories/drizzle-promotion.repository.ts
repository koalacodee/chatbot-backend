import { Injectable } from '@nestjs/common';
import {
  SQL,
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { admins, promotions, supervisors } from 'src/common/drizzle/schema';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  Supervisor,
  SupervisorPermissionsEnum,
} from 'src/supervisor/domain/entities/supervisor.entity';
import {
  AudienceType,
  Promotion,
} from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

type PromotionRow = typeof promotions.$inferSelect;
type AdminRow = typeof admins.$inferSelect;
type SupervisorRow = typeof supervisors.$inferSelect;
type AudienceDb = PromotionRow['audience'];

/**
 * Prisma declared `enum AudienceType { CUSTOMER @map("customer") ... }`, so the domain
 * saw SCREAMING_CASE while Postgres stores lowercase. Every read and every predicate has
 * to cross that boundary, or the audience filters silently match nothing.
 */
const AUDIENCE_TO_DB: Record<AudienceType, AudienceDb> = {
  [AudienceType.CUSTOMER]: 'customer',
  [AudienceType.SUPERVISOR]: 'supervisor',
  [AudienceType.EMPLOYEE]: 'employee',
  [AudienceType.ALL]: 'all',
};

const AUDIENCE_TO_DOMAIN: Record<AudienceDb, AudienceType> = {
  customer: AudienceType.CUSTOMER,
  supervisor: AudienceType.SUPERVISOR,
  employee: AudienceType.EMPLOYEE,
  all: AudienceType.ALL,
};

/** `findByAudience` takes a bare string, so accept either casing before mapping. */
const toAudienceDb = (audience: string): AudienceDb =>
  AUDIENCE_TO_DB[audience.toUpperCase() as AudienceType];

const ROLE_TO_AUDIENCE: Record<Roles, AudienceDb | undefined> = {
  [Roles.GUEST]: 'customer',
  [Roles.SUPERVISOR]: 'supervisor',
  [Roles.EMPLOYEE]: 'employee',
  [Roles.DRIVER]: 'employee',
  [Roles.ADMIN]: undefined,
};

@Injectable()
export class DrizzlePromotionRepository extends PromotionRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(
    row: PromotionRow,
    adminRow: AdminRow | null,
    supervisorRow: SupervisorRow | null,
  ): Promotion {
    return Promotion.create({
      id: row.id,
      title: row.title,
      audience: AUDIENCE_TO_DOMAIN[row.audience],
      isActive: row.isActive,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      startDate: row.startDate ? new Date(row.startDate) : undefined,
      endDate: row.endDate ? new Date(row.endDate) : undefined,
      // The Prisma mapper handed the raw joined rows straight through, so these were
      // plain objects wearing the Admin/Supervisor types. Building real entities costs
      // nothing here and makes the declared types honest.
      createdByAdmin: adminRow
        ? Admin.create({ id: adminRow.id, userId: adminRow.userId })
        : undefined,
      createdBySupervisor: supervisorRow
        ? Supervisor.create({
            id: supervisorRow.id,
            userId: supervisorRow.userId,
            // AdminPermissions is @map'd too; the Postgres label is the lowercase of the
            // domain value.
            permissions: (supervisorRow.permissions ?? []).map(
              (permission) =>
                permission.toUpperCase() as SupervisorPermissionsEnum,
            ),
            createdAt: supervisorRow.createdAt,
            updatedAt: supervisorRow.updatedAt,
          })
        : undefined,
    });
  }

  /** Every read joins the same two optional creators; only the predicate differs. */
  private async load(
    where?: SQL,
    offset?: number,
    limit?: number,
  ): Promise<Promotion[]> {
    let query = this.db
      .select({
        promotion: promotions,
        admin: admins,
        supervisor: supervisors,
      })
      .from(promotions)
      .leftJoin(admins, eq(admins.id, promotions.createdByAdminId))
      .leftJoin(
        supervisors,
        eq(supervisors.id, promotions.createdBySupervisorId),
      )
      .where(where)
      .orderBy(desc(promotions.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map((row) =>
      this.toDomain(row.promotion, row.admin, row.supervisor),
    );
  }

  /**
   * Live now: started (or no start) and not finished. The end bound compares against the
   * end of the current local day, matching the original.
   */
  private withinSchedule(now: Date): SQL {
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    return and(
      or(
        isNull(promotions.startDate),
        lte(promotions.startDate, now.toISOString()),
      ),
      or(
        isNull(promotions.endDate),
        gte(promotions.endDate, endOfDay.toISOString()),
      ),
    );
  }

  async save(promotion: Promotion): Promise<Promotion> {
    const values = {
      id: promotion.id.toString(),
      title: promotion.title,
      audience: AUDIENCE_TO_DB[promotion.audience],
      isActive: promotion.isActive,
      createdAt: promotion.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
      startDate: promotion.startDate?.toISOString() ?? null,
      endDate: promotion.endDate?.toISOString() ?? null,
      createdByAdminId: promotion.createdByAdmin?.id.toString() ?? null,
      createdBySupervisorId:
        promotion.createdBySupervisor?.id.toString() ?? null,
    };

    const [saved] = await this.db
      .insert(promotions)
      .values(values)
      .onConflictDoUpdate({
        target: promotions.id,
        // Mirrors Prisma's update block: createdAt stays put.
        set: {
          title: values.title,
          audience: values.audience,
          isActive: values.isActive,
          updatedAt: values.updatedAt,
          startDate: values.startDate,
          endDate: values.endDate,
          createdByAdminId: values.createdByAdminId,
          createdBySupervisorId: values.createdBySupervisorId,
        },
      })
      .returning();

    // The caller already holds both creators; reuse them rather than re-joining.
    return Promotion.create({
      id: saved.id,
      title: saved.title,
      audience: AUDIENCE_TO_DOMAIN[saved.audience],
      isActive: saved.isActive,
      createdAt: new Date(saved.createdAt),
      updatedAt: new Date(saved.updatedAt),
      startDate: saved.startDate ? new Date(saved.startDate) : undefined,
      endDate: saved.endDate ? new Date(saved.endDate) : undefined,
      createdByAdmin: promotion.createdByAdmin,
      createdBySupervisor: promotion.createdBySupervisor,
    });
  }

  async findById(id: string): Promise<Promotion | null> {
    const found = await this.load(eq(promotions.id, id), undefined, 1);

    return found[0] ?? null;
  }

  async findAll(offset?: number, limit?: number): Promise<Promotion[]> {
    return this.load(undefined, offset, limit);
  }

  async removeById(id: string): Promise<Promotion | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(promotions).where(eq(promotions.id, id));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(promotions)
      .where(eq(promotions.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(promotions);

    return Number(rows[0].value);
  }

  async findByAudience(audience: string): Promise<Promotion[]> {
    return this.load(eq(promotions.audience, toAudienceDb(audience)));
  }

  async findActive(): Promise<Promotion[]> {
    return this.load(eq(promotions.isActive, true));
  }

  async findActiveByAudience(audience: string): Promise<Promotion[]> {
    return this.load(
      and(
        eq(promotions.isActive, true),
        eq(promotions.audience, toAudienceDb(audience)),
      ),
    );
  }

  async getPromotionForUser(role: Roles): Promise<Promotion | null> {
    if (role === Roles.ADMIN) return null;

    const audience = ROLE_TO_AUDIENCE[role];
    const now = new Date();

    const found = await this.load(
      and(
        eq(promotions.isActive, true),
        or(
          audience ? eq(promotions.audience, audience) : undefined,
          eq(promotions.audience, 'all'),
        ),
        this.withinSchedule(now),
      ),
      undefined,
      1,
    );

    return found[0] ?? null;
  }

  async getPromotionForCustomer(): Promise<Promotion | null> {
    const now = new Date();

    const found = await this.load(
      and(
        eq(promotions.isActive, true),
        or(
          eq(promotions.audience, 'customer'),
          eq(promotions.audience, 'all'),
        ),
        this.withinSchedule(now),
      ),
      undefined,
      1,
    );

    return found[0] ?? null;
  }
}
