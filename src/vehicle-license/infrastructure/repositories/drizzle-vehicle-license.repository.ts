import { Injectable } from '@nestjs/common';
import { SQL, count, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { drivers, vehicleLicenses, vehicles } from 'src/common/drizzle/schema';
import {
  LICENSE_STATUS_TO_DB,
  toVehicleDomain,
  toVehicleLicenseDomain,
} from 'src/vehicle/infrastructure/mappers/vehicle.mapper';
import { VehicleLicense } from '../../domain/entities/vehicle-license.entity';
import { VehicleLicenseRepository } from '../../domain/repositories/vehicle-license.repository';

@Injectable()
export class DrizzleVehicleLicenseRepository extends VehicleLicenseRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private async load(
    where?: SQL,
    offset?: number,
    limit?: number,
  ): Promise<VehicleLicense[]> {
    let query = this.db
      .select({
        license: vehicleLicenses,
        vehicle: vehicles,
        driver: drivers,
      })
      .from(vehicleLicenses)
      .innerJoin(vehicles, eq(vehicles.id, vehicleLicenses.vehicleId))
      .leftJoin(drivers, eq(drivers.id, vehicles.driverId))
      .where(where)
      .orderBy(desc(vehicleLicenses.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map((row) => {
      // Build the vehicle without its license first, then attach this one, so the pair
      // points at each other — same shape the old mapper assembled by hand.
      const vehicle = toVehicleDomain(row.vehicle, null, row.driver);
      const license = toVehicleLicenseDomain(row.license, vehicle);

      vehicle.license = license;

      return license;
    });
  }

  async save(license: VehicleLicense): Promise<VehicleLicense> {
    const values = {
      id: license.id.toString(),
      vehicleId: license.vehicle.id.toString(),
      licenseNumber: license.licenseNumber,
      issueDate: license.issueDate.toISOString(),
      expiryDate: license.expiryDate.toISOString(),
      insurancePolicyNumber: license.insurancePolicyNumber ?? null,
      insuranceExpiryDate: license.insuranceExpiryDate?.toISOString() ?? null,
      status: license.status ? LICENSE_STATUS_TO_DB[license.status] : null,
      createdAt: license.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
    };

    const { id: _id, createdAt: _createdAt, ...updatable } = values;

    const [saved] = await this.db
      .insert(vehicleLicenses)
      .values(values)
      .onConflictDoUpdate({ target: vehicleLicenses.id, set: updatable })
      .returning();

    const [reloaded] = await this.load(eq(vehicleLicenses.id, saved.id));

    return reloaded;
  }

  async findById(id: string): Promise<VehicleLicense | null> {
    const found = await this.load(eq(vehicleLicenses.id, id), undefined, 1);

    return found[0] ?? null;
  }

  async findByVehicleId(vehicleId: string): Promise<VehicleLicense | null> {
    const found = await this.load(
      eq(vehicleLicenses.vehicleId, vehicleId),
      undefined,
      1,
    );

    return found[0] ?? null;
  }

  async findAll(offset?: number, limit?: number): Promise<VehicleLicense[]> {
    return this.load(undefined, offset, limit);
  }

  async removeById(id: string): Promise<VehicleLicense | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(vehicleLicenses).where(eq(vehicleLicenses.id, id));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(vehicleLicenses)
      .where(eq(vehicleLicenses.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(vehicleLicenses);

    return Number(rows[0].value);
  }

  /**
   * Recomputes every license's status from its expiry dates in a single statement. The
   * labels written here are the raw Postgres enum values, which is what the original
   * `$executeRawUnsafe` wrote too.
   */
  async updateLicenseStatuses(): Promise<number> {
    const result = await this.db.execute(sql`
      UPDATE vehicle_licenses
      SET status = CASE
        WHEN expiry_date < NOW()
             OR (insurance_expiry_date IS NOT NULL AND insurance_expiry_date < NOW())
          THEN 'expired'
        WHEN expiry_date < NOW() + INTERVAL '30 days'
             OR (insurance_expiry_date IS NOT NULL AND insurance_expiry_date < NOW() + INTERVAL '30 days')
          THEN 'expiring_soon'
        ELSE 'active'
      END::vehicle_license_status
    `);

    return (result as unknown as { rowCount: number }).rowCount ?? 0;
  }
}
