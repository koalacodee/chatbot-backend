import { Injectable } from '@nestjs/common';
import { SQL, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { drivers, users, vehicles, violations } from 'src/common/drizzle/schema';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  Vehicle,
  VehicleStatus,
} from 'src/vehicle/domain/entities/vehicle.entity';
import { Violation } from 'src/violation/domain/entities/violation.entity';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverRepository } from '../../domain/repositories/driver.repository';

type DriverRow = typeof drivers.$inferSelect;
type UserRow = typeof users.$inferSelect;
type VehicleRow = typeof vehicles.$inferSelect;
type ViolationRow = typeof violations.$inferSelect;

/**
 * Prisma declared `enum VehicleStatus { ACTIVE @map("active") ... }`, so it handed the
 * domain SCREAMING_CASE while Postgres stores the lowercase label. Drizzle does no such
 * mapping, and `Vehicle.create` assigns `status` straight through without validating,
 * so without this every vehicle would silently come back as 'active' and stop matching
 * `VehicleStatus.ACTIVE`.
 */
const VEHICLE_STATUS_TO_DOMAIN: Record<VehicleRow['status'], VehicleStatus> = {
  active: VehicleStatus.ACTIVE,
  in_maintenance: VehicleStatus.IN_MAINTENANCE,
  out_of_service: VehicleStatus.OUT_OF_SERVICE,
};


/** `driving_license_expiry` is a DATE column, which Drizzle reads and writes as 'YYYY-MM-DD'. */
const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

@Injectable()
export class DrizzleDriverRepository extends DriverRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toUser(row: UserRow): Promise<User> {
    // `hashPassword` defaults to true, so the old `User.create(props.user)` in
    // Driver.fromJSON re-hashed the already-hashed column on every read — an argon2 pass
    // per driver, per query. The stored value is a hash, so it takes the hash path.
    return User.create(
      {
        id: row.id,
        name: row.name,
        email: row.email,
        username: row.username,
        password: row.password,
        // Role.create() uppercases its input, so the lowercase DB label is accepted.
        role: row.role.toUpperCase() as Roles,
        employeeId: row.employeeId ?? undefined,
        jobTitle: row.jobTitle ?? undefined,
      },
      false,
    );
  }

  // Vehicle/Violation options declare fully-hydrated `driver`, `license`, `vehicle` and
  // `rule` relations, but the Prisma mapper fed them raw rows, so those arrived
  // undefined. Keeping that shape — populating them would mean reworking both entities.
  private toVehicle(row: VehicleRow): Vehicle {
    return Vehicle.create({
      id: row.id,
      make: row.make,
      model: row.model,
      year: row.year,
      plateNumber: row.plateNumber,
      vin: row.vin,
      status: VEHICLE_STATUS_TO_DOMAIN[row.status],
      notes: row.notes ?? undefined,
      nextMaintenanceDate: row.nextMaintenanceDate
        ? new Date(row.nextMaintenanceDate)
        : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  private toViolation(row: ViolationRow): Violation {
    return Violation.create({
      id: row.id,
      description: row.description,
      amount: row.amount,
      isPaid: row.isPaid,
      triggerEventId: row.triggerEventId,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  private async toDomain(
    row: DriverRow,
    userRow?: UserRow,
    vehicleRows?: VehicleRow[],
    violationRows?: ViolationRow[],
  ): Promise<Driver> {
    return Driver.create({
      id: row.id,
      userId: row.userId,
      supervisorId: row.supervisorId,
      licensingNumber: row.licensingNumber,
      drivingLicenseExpiry: new Date(row.drivingLicenseExpiry),
      user: userRow ? await this.toUser(userRow) : undefined,
      vehicles: vehicleRows?.map((vehicle) => this.toVehicle(vehicle)),
      violations: violationRows?.map((violation) => this.toViolation(violation)),
    });
  }

  /** Shared by findById and findByUserId, which differ only in their predicate. */
  private async loadOne(where: SQL): Promise<Driver | null> {
    const rows = await this.db
      .select({ driver: drivers, user: users })
      .from(drivers)
      .innerJoin(users, eq(users.id, drivers.userId))
      .where(where)
      .limit(1);

    if (!rows[0]) return null;

    const driverId = rows[0].driver.id;

    const [vehicleRows, violationRows] = await Promise.all([
      this.db.select().from(vehicles).where(eq(vehicles.driverId, driverId)),
      this.db.select().from(violations).where(eq(violations.driverId, driverId)),
    ]);

    return this.toDomain(rows[0].driver, rows[0].user, vehicleRows, violationRows);
  }

  async findById(id: string): Promise<Driver | null> {
    return this.loadOne(eq(drivers.id, id));
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    return this.loadOne(eq(drivers.userId, userId));
  }

  async findAll(): Promise<Driver[]> {
    const rows = await this.db
      .select({ driver: drivers, user: users })
      .from(drivers)
      .innerJoin(users, eq(users.id, drivers.userId));

    if (rows.length === 0) return [];

    // Three queries total no matter how many drivers come back, rather than a per-driver
    // lookup for each relation.
    const driverIds = rows.map((row) => row.driver.id);

    const [vehicleRows, violationRows] = await Promise.all([
      this.db.select().from(vehicles).where(inArray(vehicles.driverId, driverIds)),
      this.db
        .select()
        .from(violations)
        .where(inArray(violations.driverId, driverIds)),
    ]);

    const vehiclesByDriver = this.groupByDriver(vehicleRows);
    const violationsByDriver = this.groupByDriver(violationRows);

    return Promise.all(
      rows.map((row) =>
        this.toDomain(
          row.driver,
          row.user,
          vehiclesByDriver.get(row.driver.id) ?? [],
          violationsByDriver.get(row.driver.id) ?? [],
        ),
      ),
    );
  }

  private groupByDriver<T extends { driverId: string }>(
    rows: T[],
  ): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    for (const row of rows) {
      const bucket = grouped.get(row.driverId) ?? [];
      bucket.push(row);
      grouped.set(row.driverId, bucket);
    }

    return grouped;
  }

  async findByLicensingNumber(licensingNumber: string): Promise<Driver | null> {
    // The Prisma version ran this one without any `include`, so user/vehicles/violations
    // stayed undefined. Kept that way — callers only use it as an existence check.
    const rows = await this.db
      .select()
      .from(drivers)
      .where(eq(drivers.licensingNumber, licensingNumber))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async save(driver: Driver): Promise<void> {
    const updatedAt = new Date().toISOString();
    const driverId = driver.id.value;

    await this.db.transaction(async (tx) => {
      await tx.insert(drivers).values({
        id: driverId,
        userId: driver.userId.value,
        supervisorId: driver.supervisorId.value,
        licensingNumber: driver.licensingNumber,
        drivingLicenseExpiry: toDateOnly(driver.drivingLicenseExpiry),
        updatedAt,
      });

      await this.linkRelations(tx, driver, updatedAt);
    });
  }

  async update(driver: Driver): Promise<void> {
    const updatedAt = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      await this.linkRelations(tx, driver, updatedAt);
    });
  }

  /**
   * Prisma's `connect` / `set` on these relations just rewrites the child's driver_id.
   *
   * Note `set` also implies detaching children that are no longer listed, but
   * vehicles.driver_id and violations.driver_id are both NOT NULL, so Prisma could never
   * have detached them either — that call would have failed outright. Only the attach
   * half is reproducible, and it is the half that ever worked.
   */
  private async linkRelations(
    tx: Parameters<Parameters<typeof this.db.transaction>[0]>[0],
    driver: Driver,
    updatedAt: string,
  ): Promise<void> {
    const driverId = driver.id.value;

    const vehicleIds = driver.vehicles?.map((vehicle) => vehicle.id.toString());
    const violationIds = driver.violations?.map((violation) => violation.id);

    if (vehicleIds?.length) {
      await tx
        .update(vehicles)
        .set({ driverId, updatedAt })
        .where(inArray(vehicles.id, vehicleIds));
    }

    if (violationIds?.length) {
      await tx
        .update(violations)
        .set({ driverId, updatedAt })
        .where(inArray(violations.id, violationIds));
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(drivers).where(eq(drivers.id, id));
  }
}
