import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleLicense } from '../../domain/entities/vehicle-license.entity';
import { VehicleStatus as PrismaVehicleStatus } from '@prisma/client';

@Injectable()
export class PrismaVehicleRepository extends VehicleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(row: any): Vehicle {
    // Map license first using minimal structure expected by VehicleLicense
    const license: VehicleLicense | undefined = row.license
      ? VehicleLicense.create({
          id: row.license.id,
          vehicle: undefined as unknown as Vehicle, // will be replaced after vehicle instance creation
          licenseNumber: row.license.licenseNumber,
          issueDate: row.license.issueDate,
          expiryDate: row.license.expiryDate,
          insurancePolicyNumber: row.license.insurancePolicyNumber ?? undefined,
          insuranceExpiryDate: row.license.insuranceExpiryDate ?? undefined,
          status: row.license.status,
          createdAt: row.license.createdAt,
          updatedAt: row.license.updatedAt,
        })
      : undefined;

    const vehicle = Vehicle.create({
      id: row.id,
      make: row.make,
      model: row.model,
      year: row.year,
      plateNumber: row.plateNumber,
      vin: row.vin,
      status: row.status,
      driver: row.driver ?? null,
      license: license as any, // temporarily set; corrected below
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      notes: row.notes ?? undefined,
      nextMaintenanceDate: row.nextMaintenanceDate ?? undefined,
    });

    // Fix back-reference in license if present
    if (license) {
      license.vehicle = vehicle;
    }

    return vehicle;
  }

  async save(vehicle: Vehicle): Promise<Vehicle> {
    const upserted = await this.prisma.vehicle.upsert({
      where: { id: vehicle.id.toString() },
      update: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plateNumber: vehicle.plateNumber,
        vin: vehicle.vin,
        status: PrismaVehicleStatus[vehicle.status],
        notes: vehicle.notes ?? null,
        nextMaintenanceDate: vehicle.nextMaintenanceDate ?? null,
        updatedAt: new Date(),
        ...(vehicle.driver
          ? { driver: { connect: { id: vehicle.driver.id } } }
          : {}),
      },
      create: {
        id: vehicle.id.toString(),
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plateNumber: vehicle.plateNumber,
        vin: vehicle.vin,
        status: PrismaVehicleStatus[vehicle.status],
        notes: vehicle.notes ?? null,
        nextMaintenanceDate: vehicle.nextMaintenanceDate ?? null,
        createdAt: vehicle.createdAt,
        updatedAt: new Date(),
        driver: { connect: { id: vehicle.driver.id } },
      },
      include: {
        driver: true,
        license: true,
      },
    });

    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Vehicle | null> {
    const row = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { driver: true, license: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Vehicle[]> {
    const rows = await this.prisma.vehicle.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { driver: true, license: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async removeById(id: string): Promise<Vehicle | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.vehicle.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.vehicle.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.vehicle.count();
  }

  async findByDriverId(driverId: string): Promise<Vehicle[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { driverId },
      include: { driver: true, license: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByPlateNumber(plateNumber: string): Promise<Vehicle | null> {
    const row = await this.prisma.vehicle.findFirst({
      where: { plateNumber },
      include: { driver: true, license: true },
    });
    return row ? this.toDomain(row) : null;
  }
}
