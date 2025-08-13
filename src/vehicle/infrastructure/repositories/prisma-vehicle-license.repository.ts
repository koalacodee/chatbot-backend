import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { VehicleLicenseRepository } from '../../domain/repositories/vehicle-license.repository';
import { VehicleLicense } from '../../domain/entities/vehicle-license.entity';
import { Vehicle } from '../../domain/entities/vehicle.entity';

@Injectable()
export class PrismaVehicleLicenseRepository extends VehicleLicenseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(row: any): VehicleLicense {
    const vehicle = Vehicle.create({
      id: row.vehicle.id,
      make: row.vehicle.make,
      model: row.vehicle.model,
      year: row.vehicle.year,
      plateNumber: row.vehicle.plateNumber,
      vin: row.vehicle.vin,
      status: row.vehicle.status,
      driver: row.vehicle.driver,
      license: undefined as unknown as VehicleLicense, // will be set after creation if needed
      createdAt: row.vehicle.createdAt,
      updatedAt: row.vehicle.updatedAt,
      notes: row.vehicle.notes ?? undefined,
      nextMaintenanceDate: row.vehicle.nextMaintenanceDate ?? undefined,
    }) as unknown as Vehicle;

    const license = VehicleLicense.create({
      id: row.id,
      vehicle: vehicle as any,
      licenseNumber: row.licenseNumber,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      insurancePolicyNumber: row.insurancePolicyNumber ?? undefined,
      insuranceExpiryDate: row.insuranceExpiryDate ?? undefined,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });

    // ensure vehicle.license points to this license
    vehicle.license = license as any;

    return license;
  }

  async save(license: VehicleLicense): Promise<VehicleLicense> {
    const upserted = await this.prisma.vehicleLicense.upsert({
      where: { id: license.id.toString() },
      update: {
        licenseNumber: license.licenseNumber,
        issueDate: license.issueDate,
        expiryDate: license.expiryDate,
        insurancePolicyNumber: license.insurancePolicyNumber ?? null,
        insuranceExpiryDate: license.insuranceExpiryDate ?? null,
        status: license.status,
        updatedAt: new Date(),
        vehicle: { connect: { id: license.vehicle.id.toString() } },
      },
      create: {
        id: license.id.toString(),
        licenseNumber: license.licenseNumber,
        issueDate: license.issueDate,
        expiryDate: license.expiryDate,
        insurancePolicyNumber: license.insurancePolicyNumber ?? null,
        insuranceExpiryDate: license.insuranceExpiryDate ?? null,
        status: license.status,
        createdAt: license.createdAt,
        updatedAt: new Date(),
        vehicle: { connect: { id: license.vehicle.id.toString() } },
      },
      include: { vehicle: { include: { driver: true, license: true } } },
    });

    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<VehicleLicense | null> {
    const row = await this.prisma.vehicleLicense.findUnique({
      where: { id },
      include: { vehicle: { include: { driver: true, license: true } } },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByVehicleId(vehicleId: string): Promise<VehicleLicense | null> {
    const row = await this.prisma.vehicleLicense.findFirst({
      where: { vehicleId },
      include: { vehicle: { include: { driver: true, license: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<VehicleLicense[]> {
    const rows = await this.prisma.vehicleLicense.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { include: { driver: true, license: true } } },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async removeById(id: string): Promise<VehicleLicense | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.vehicleLicense.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.vehicleLicense.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.vehicleLicense.count();
  }
}
