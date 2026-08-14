import { Injectable } from '@nestjs/common';
import { SQL, and, count, desc, eq, or, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import {
  drivers,
  users,
  vehicleLicenses,
  vehicles,
  violationRules,
  violations,
} from 'src/common/drizzle/schema';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { toVehicleDomain } from 'src/vehicle/infrastructure/mappers/vehicle.mapper';
import { ViolationRule } from '../../domain/entities/violation-rule.entity';
import { Violation } from '../../domain/entities/violation.entity';
import {
  ViolationFilters,
  ViolationRepository,
} from '../../domain/repositories/violation.repository';

type ViolationRow = typeof violations.$inferSelect;
type RuleRow = typeof violationRules.$inferSelect;
type UserRow = typeof users.$inferSelect;

@Injectable()
export class DrizzleViolationRepository extends ViolationRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toUser(row: UserRow): Promise<User> {
    // The stored password is a hash, so skip the hashing path — the original passed
    // `false` here too.
    return User.create(
      {
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username,
        password: row.password,
        role: row.role.toUpperCase() as Roles,
        employeeId: row.employeeId ?? undefined,
        jobTitle: row.jobTitle ?? undefined,
      },
      false,
    );
  }

  private toRule(row: RuleRow): ViolationRule {
    return ViolationRule.create({
      id: row.id,
      // ViolationType is @map'd (SPEEDING -> "speeding") and is not exported from the
      // entity module, so it is widened here rather than referenced by name.
      type: row.type.toUpperCase() as any,
      threshold: row.threshold,
      fineAmount: row.fineAmount,
      description: row.description,
      isEnabled: row.isEnabled,
    });
  }

  /**
   * A violation's driver is a `drivers` row, but the domain wants the `User` behind it —
   * which is why the join walks violations -> drivers -> users.
   */
  private async load(
    where?: SQL,
    offset?: number,
    limit?: number,
  ): Promise<Violation[]> {
    let query = this.db
      .select({
        violation: violations,
        driverUser: users,
        vehicle: vehicles,
        license: vehicleLicenses,
        vehicleDriver: drivers,
        rule: violationRules,
      })
      .from(violations)
      .leftJoin(drivers, eq(drivers.id, violations.driverId))
      .leftJoin(users, eq(users.id, drivers.userId))
      .leftJoin(vehicles, eq(vehicles.id, violations.vehicleId))
      .leftJoin(vehicleLicenses, eq(vehicleLicenses.vehicleId, vehicles.id))
      .leftJoin(violationRules, eq(violationRules.id, violations.ruleId))
      .where(where)
      .orderBy(desc(violations.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return Promise.all(
      rows.map(async (row) =>
        Violation.create({
          id: row.violation.id,
          driver: row.driverUser ? await this.toUser(row.driverUser) : undefined,
          vehicle: row.vehicle
            ? toVehicleDomain(row.vehicle, row.license, row.vehicleDriver)
            : undefined,
          rule: row.rule ? this.toRule(row.rule) : undefined,
          description: row.violation.description,
          amount: row.violation.amount,
          isPaid: row.violation.isPaid,
          triggerEventId: row.violation.triggerEventId,
          createdAt: new Date(row.violation.createdAt),
          updatedAt: new Date(row.violation.updatedAt),
        } as any),
      ),
    );
  }

  async save(violation: Violation): Promise<Violation> {
    const values = {
      id: violation.id,
      description: violation.description,
      amount: violation.amount,
      isPaid: violation.isPaid,
      triggerEventId: violation.triggerEventId,
      driverId: violation.driver.id.toString(),
      vehicleId: violation.vehicle.id.toString(),
      ruleId: violation.rule.id.toString(),
      createdAt: violation.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
    };

    const { id: _id, createdAt: _createdAt, ...updatable } = values;

    const [saved] = await this.db
      .insert(violations)
      .values(values)
      .onConflictDoUpdate({ target: violations.id, set: updatable })
      .returning();

    const [reloaded] = await this.load(eq(violations.id, saved.id));

    return reloaded;
  }

  async findById(id: string): Promise<Violation | null> {
    const found = await this.load(eq(violations.id, id), undefined, 1);

    return found[0] ?? null;
  }

  async findAll(offset?: number, limit?: number): Promise<Violation[]> {
    return this.load(undefined, offset, limit);
  }

  async removeById(id: string): Promise<Violation | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(violations).where(eq(violations.id, id));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(violations)
      .where(eq(violations.id, id))
      .limit(1);

    return rows.length > 0;
  }

  /**
   * NOTE: this OR is preserved exactly as it was, including the fact that the `isPaid`
   * arm is always present — with no `status` filter it becomes `isPaid = false`, so the
   * count folds in every unpaid violation regardless of driver or vehicle. That is what
   * the Prisma version counted; changing it would move a number the UI already shows.
   */
  async count(filters: ViolationFilters): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(violations)
      .where(
        or(
          filters?.vehicleId
            ? eq(violations.vehicleId, filters.vehicleId)
            : undefined,
          filters?.driverId
            ? eq(violations.driverId, filters.driverId)
            : undefined,
          eq(violations.isPaid, filters?.status === 'paid'),
        ),
      );

    return Number(rows[0].value);
  }

  async findByDriverId(driverId: string): Promise<Violation[]> {
    return this.load(eq(violations.driverId, driverId));
  }

  async findByVehicleId(vehicleId: string): Promise<Violation[]> {
    return this.load(eq(violations.vehicleId, vehicleId));
  }

  async findUnpaidByDriverId(driverId: string): Promise<Violation[]> {
    return this.load(
      and(eq(violations.driverId, driverId), eq(violations.isPaid, false)),
    );
  }

  async findWithFilters(
    filters: ViolationFilters,
    offset?: number,
    limit?: number,
  ): Promise<Violation[]> {
    const conditions: SQL[] = [];

    if (filters.vehicleId)
      conditions.push(eq(violations.vehicleId, filters.vehicleId));
    if (filters.driverId)
      conditions.push(eq(violations.driverId, filters.driverId));
    if (filters.status)
      conditions.push(eq(violations.isPaid, filters.status === 'paid'));

    return this.load(
      conditions.length ? or(...conditions) : undefined,
      offset,
      limit,
    );
  }
}
