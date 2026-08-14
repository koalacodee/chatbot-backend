import { drivers, vehicleLicenses, vehicles } from 'src/common/drizzle/schema';
import {
  VehicleLicense,
  VehicleLicenseStatus,
} from 'src/vehicle-license/domain/entities/vehicle-license.entity';
import { Vehicle, VehicleStatus } from '../../domain/entities/vehicle.entity';

export type VehicleRow = typeof vehicles.$inferSelect;
export type VehicleLicenseRow = typeof vehicleLicenses.$inferSelect;
export type DriverRow = typeof drivers.$inferSelect;

/**
 * Prisma declared both of these enums with `@map`, e.g.
 * `enum VehicleStatus { ACTIVE @map("active") }`, so the domain saw SCREAMING_CASE while
 * Postgres stores lowercase. Drizzle passes the label through untouched, and neither
 * `Vehicle.create` nor `VehicleLicense.create` validates `status`, so without these the
 * mismatch would be silent — statuses would simply stop matching the domain enums.
 *
 * Shared here because the vehicle, vehicle-license and violation repositories all map
 * the same two rows.
 */
export const VEHICLE_STATUS_TO_DOMAIN: Record<
  VehicleRow['status'],
  VehicleStatus
> = {
  active: VehicleStatus.ACTIVE,
  in_maintenance: VehicleStatus.IN_MAINTENANCE,
  out_of_service: VehicleStatus.OUT_OF_SERVICE,
};

export const VEHICLE_STATUS_TO_DB: Record<
  VehicleStatus,
  VehicleRow['status']
> = {
  [VehicleStatus.ACTIVE]: 'active',
  [VehicleStatus.IN_MAINTENANCE]: 'in_maintenance',
  [VehicleStatus.OUT_OF_SERVICE]: 'out_of_service',
};

type LicenseStatusDb = NonNullable<VehicleLicenseRow['status']>;

export const LICENSE_STATUS_TO_DOMAIN: Record<
  LicenseStatusDb,
  VehicleLicenseStatus
> = {
  active: VehicleLicenseStatus.ACTIVE,
  expiring_soon: VehicleLicenseStatus.EXPIRING_SOON,
  expired: VehicleLicenseStatus.EXPIRED,
};

export const LICENSE_STATUS_TO_DB: Record<
  VehicleLicenseStatus,
  LicenseStatusDb
> = {
  [VehicleLicenseStatus.ACTIVE]: 'active',
  [VehicleLicenseStatus.EXPIRING_SOON]: 'expiring_soon',
  [VehicleLicenseStatus.EXPIRED]: 'expired',
};

/**
 * Builds a Vehicle and, when the license row is present, its VehicleLicense — wiring the
 * back-reference in both directions the way the original mappers did by hand.
 *
 * `driver` is typed as Prisma's `User` on `VehicleOptions` but has always been handed the
 * raw driver row, so it is passed through unchanged rather than invented here.
 */
export function toVehicleDomain(
  row: VehicleRow,
  licenseRow?: VehicleLicenseRow | null,
  driverRow?: DriverRow | null,
): Vehicle {
  const vehicle = Vehicle.create({
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    plateNumber: row.plateNumber,
    vin: row.vin,
    status: VEHICLE_STATUS_TO_DOMAIN[row.status],
    driver: (driverRow ?? null) as any,
    license: undefined as any,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    notes: row.notes ?? undefined,
    nextMaintenanceDate: row.nextMaintenanceDate
      ? new Date(row.nextMaintenanceDate)
      : undefined,
  });

  if (licenseRow) {
    vehicle.license = toVehicleLicenseDomain(licenseRow, vehicle);
  }

  return vehicle;
}

export function toVehicleLicenseDomain(
  row: VehicleLicenseRow,
  vehicle: Vehicle,
): VehicleLicense {
  return VehicleLicense.create({
    id: row.id,
    vehicle,
    licenseNumber: row.licenseNumber,
    issueDate: new Date(row.issueDate),
    expiryDate: new Date(row.expiryDate),
    insurancePolicyNumber: row.insurancePolicyNumber ?? undefined,
    insuranceExpiryDate: row.insuranceExpiryDate
      ? new Date(row.insuranceExpiryDate)
      : undefined,
    // `status` is nullable in Postgres but required on the entity.
    status: row.status ? LICENSE_STATUS_TO_DOMAIN[row.status] : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}
