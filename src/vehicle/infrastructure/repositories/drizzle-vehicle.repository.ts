import { Injectable } from '@nestjs/common';
import { SQL, and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { drivers, vehicleLicenses, vehicles } from 'src/common/drizzle/schema';
import { Vehicle, VehicleStatus } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import {
  LICENSE_STATUS_TO_DB,
  VEHICLE_STATUS_TO_DB,
  toVehicleDomain,
} from '../mappers/vehicle.mapper';

@Injectable()
export class DrizzleVehicleRepository extends VehicleRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  /** Every read is this join with a different predicate; only `save` differs. */
  private async load(
    where?: SQL,
    offset?: number,
    limit?: number,
  ): Promise<Vehicle[]> {
    let query = this.db
      .select({
        vehicle: vehicles,
        license: vehicleLicenses,
        driver: drivers,
      })
      .from(vehicles)
      .leftJoin(vehicleLicenses, eq(vehicleLicenses.vehicleId, vehicles.id))
      .leftJoin(drivers, eq(drivers.id, vehicles.driverId))
      .where(where)
      .orderBy(desc(vehicles.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map((row) =>
      toVehicleDomain(row.vehicle, row.license, row.driver),
    );
  }

  async save(vehicle: Vehicle): Promise<Vehicle> {
    const updatedAt = new Date().toISOString();
    const vehicleId = vehicle.id.toString();

    const values = {
      id: vehicleId,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      plateNumber: vehicle.plateNumber,
      vin: vehicle.vin,
      status: VEHICLE_STATUS_TO_DB[vehicle.status],
      notes: vehicle.notes ?? null,
      nextMaintenanceDate: vehicle.nextMaintenanceDate?.toISOString() ?? null,
      driverId: vehicle.driver?.id ?? null,
      createdAt: vehicle.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt,
    };

    await this.db.transaction(async (tx) => {
      const { id: _id, createdAt: _createdAt, ...updatable } = values;

      await tx
        .insert(vehicles)
        .values(values)
        .onConflictDoUpdate({ target: vehicles.id, set: updatable });

      // Prisma expressed this as a nested `license: { upsert }` / `license: { create }`.
      if (!vehicle.license) return;

      const license = vehicle.license;

      const licenseValues = {
        id: license.id.toString(),
        vehicleId,
        licenseNumber: license.licenseNumber || '',
        issueDate: (license.issueDate ?? new Date()).toISOString(),
        expiryDate: (license.expiryDate ?? new Date()).toISOString(),
        insurancePolicyNumber: license.insurancePolicyNumber ?? null,
        insuranceExpiryDate:
          license.insuranceExpiryDate?.toISOString() ?? null,
        status: license.status
          ? LICENSE_STATUS_TO_DB[license.status]
          : null,
        createdAt: license.createdAt.toISOString(),
        updatedAt,
      };

      const { id: _licenseId, createdAt: _licenseCreatedAt, ...licenseUpdatable } =
        licenseValues;

      await tx
        .insert(vehicleLicenses)
        .values(licenseValues)
        .onConflictDoUpdate({
          target: vehicleLicenses.id,
          set: licenseUpdatable,
        });
    });

    const [saved] = await this.load(eq(vehicles.id, vehicleId));

    return saved;
  }

  async findById(id: string): Promise<Vehicle | null> {
    const found = await this.load(eq(vehicles.id, id), undefined, 1);

    return found[0] ?? null;
  }

  async findAll(offset?: number, limit?: number): Promise<Vehicle[]> {
    return this.load(undefined, offset, limit);
  }

  async removeById(id: string): Promise<Vehicle | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(vehicles).where(eq(vehicles.id, id));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(vehicles);

    return Number(rows[0].value);
  }

  async findByDriverId(driverId: string): Promise<Vehicle[]> {
    return this.load(eq(vehicles.driverId, driverId));
  }

  async findByPlateNumber(plateNumber: string): Promise<Vehicle | null> {
    const found = await this.load(
      eq(vehicles.plateNumber, plateNumber),
      undefined,
      1,
    );

    return found[0] ?? null;
  }

  async findFiltered(
    status?: any,
    assignedDriverId?: string,
    offset?: number,
    limit?: number,
  ): Promise<Vehicle[]> {
    // `status` arrives untyped and may be a domain key ('ACTIVE') or a raw label
    // ('active'), which is what the old `(PrismaVehicleStatus as any)[status] ?? status`
    // was hedging against.
    const dbStatus = status
      ? (VEHICLE_STATUS_TO_DB[status as VehicleStatus] ?? status)
      : undefined;

    return this.load(
      and(
        dbStatus ? eq(vehicles.status, dbStatus) : undefined,
        assignedDriverId ? eq(vehicles.driverId, assignedDriverId) : undefined,
      ),
      offset,
      limit,
    );
  }

  async search(
    query: string,
    offset?: number,
    limit?: number,
  ): Promise<Vehicle[]> {
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const pattern = `%${trimmed}%`;

    return this.load(
      or(
        ilike(vehicles.make, pattern),
        ilike(vehicles.model, pattern),
        ilike(vehicles.plateNumber, pattern),
        ilike(vehicles.vin, pattern),
      ),
      offset,
      limit,
    );
  }
}
