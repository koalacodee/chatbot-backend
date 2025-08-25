import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  ViolationFilters,
  ViolationRepository,
} from '../../domain/repositories/violation.repository';
import { Violation } from '../../domain/entities/violation.entity';
import { ViolationRule } from '../../domain/entities/violation-rule.entity';
import { Vehicle } from 'src/vehicle/domain/entities/vehicle.entity';
import { User } from 'src/shared/entities/user.entity';
import { VehicleLicense } from 'src/vehicle-license/domain/entities/vehicle-license.entity';

@Injectable()
export class PrismaViolationRepository extends ViolationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<Violation> {
    // Map nested vehicle (minimally) and its license if present
    let vehicle: Vehicle | undefined;
    if (row.vehicle) {
      const lic: VehicleLicense | undefined = row.vehicle.license
        ? VehicleLicense.create({
            id: row.vehicle.license.id,
            vehicle: undefined as unknown as Vehicle,
            licenseNumber: row.vehicle.license.licenseNumber,
            issueDate: row.vehicle.license.issueDate,
            expiryDate: row.vehicle.license.expiryDate,
            insurancePolicyNumber:
              row.vehicle.license.insurancePolicyNumber ?? undefined,
            insuranceExpiryDate:
              row.vehicle.license.insuranceExpiryDate ?? undefined,
            status: row.vehicle.license.status,
            createdAt: row.vehicle.license.createdAt,
            updatedAt: row.vehicle.license.updatedAt,
          })
        : undefined;

      vehicle = Vehicle.create({
        id: row.vehicle.id,
        make: row.vehicle.make,
        model: row.vehicle.model,
        year: row.vehicle.year,
        plateNumber: row.vehicle.plateNumber,
        vin: row.vehicle.vin,
        status: row.vehicle.status,
        driver: row.vehicle.driver, // repository dedicated to Vehicle handles domain driver mapping
        license: (lic as any) ?? (undefined as unknown as VehicleLicense),
        createdAt: row.vehicle.createdAt,
        updatedAt: row.vehicle.updatedAt,
        notes: row.vehicle.notes ?? undefined,
        nextMaintenanceDate: row.vehicle.nextMaintenanceDate ?? undefined,
      });
      if (lic) (lic as any).vehicle = vehicle;
    }

    const rule: ViolationRule | undefined = row.rule
      ? ViolationRule.create({
          id: row.rule.id,
          type: row.rule.type,
          threshold: row.rule.threshold,
          fineAmount: row.rule.fineAmount,
          description: row.rule.description,
          isEnabled: row.rule.isEnabled,
        })
      : undefined;

    const driver: User | undefined = row.driver
      ? await User.create(row.driver, false)
      : undefined;

    return Violation.create({
      id: row.id,
      driver: driver as User,
      vehicle: vehicle as Vehicle,
      rule: rule as ViolationRule,
      description: row.description,
      amount: row.amount,
      isPaid: row.isPaid,
      triggerEventId: row.triggerEventId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async save(violation: Violation): Promise<Violation> {
    const upsert = await this.prisma.violation.upsert({
      where: { id: violation.id },
      update: {
        description: violation.description,
        amount: violation.amount,
        isPaid: violation.isPaid,
        triggerEventId: violation.triggerEventId,
        updatedAt: new Date(),
        driver: { connect: { id: violation.driver.id.toString() } },
        vehicle: { connect: { id: violation.vehicle.id.toString() } },
        rule: { connect: { id: violation.rule.id.toString() } },
      },
      create: {
        id: violation.id,
        description: violation.description,
        amount: violation.amount,
        isPaid: violation.isPaid,
        triggerEventId: violation.triggerEventId,
        createdAt: violation.createdAt,
        updatedAt: new Date(),
        driver: { connect: { id: violation.driver.id.toString() } },
        vehicle: { connect: { id: violation.vehicle.id.toString() } },
        rule: { connect: { id: violation.rule.id.toString() } },
      },
      include: {
        driver: true,
        vehicle: { include: { driver: true, license: true } },
        rule: true,
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<Violation | null> {
    const row = await this.prisma.violation.findUnique({
      where: { id },
      include: {
        driver: true,
        vehicle: { include: { driver: true, license: true } },
        rule: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Violation[]> {
    const rows = await this.prisma.violation.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        driver: true,
        vehicle: { include: { driver: true, license: true } },
        rule: true,
      },
    });
    return Promise.all(rows.map((r: any) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<Violation | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.violation.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.violation.count({ where: { id } });
    return count > 0;
  }

  async count(filters: ViolationFilters): Promise<number> {
    return this.prisma.violation.count({
      where: {
        OR: [
          { vehicleId: filters.vehicleId },
          { driverId: filters.driverId },
          { isPaid: filters.status === 'paid' ? true : false },
        ],
      },
    });
  }

  async findByDriverId(driverId: string): Promise<Violation[]> {
    const rows = await this.prisma.violation.findMany({
      where: { driverId },
      include: {
        driver: true,
        vehicle: { include: { driver: true, license: true } },
        rule: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r: any) => this.toDomain(r)));
  }

  async findByVehicleId(vehicleId: string): Promise<Violation[]> {
    const rows = await this.prisma.violation.findMany({
      where: { vehicleId },
      include: {
        driver: true,
        vehicle: { include: { driver: true, license: true } },
        rule: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r: any) => this.toDomain(r)));
  }

  async findUnpaidByDriverId(driverId: string): Promise<Violation[]> {
    const rows = await this.prisma.violation.findMany({
      where: { driverId, isPaid: false },
      include: {
        driver: true,
        vehicle: { include: { driver: true, license: true } },
        rule: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r: any) => this.toDomain(r)));
  }

  async findWithFilters(
    filters: ViolationFilters,
    offset?: number,
    limit?: number,
  ): Promise<Violation[]> {
    const orConditions = [];
    if (filters.vehicleId) orConditions.push({ vehicleId: filters.vehicleId });
    if (filters.driverId) orConditions.push({ driverId: filters.driverId });
    if (filters.status)
      orConditions.push({ isPaid: filters.status === 'paid' });

    const violations = await this.prisma.violation.findMany({
      where: orConditions.length ? { OR: orConditions } : undefined,
      skip: offset,
      take: limit,
    });

    // assuming toDomain is async
    return Promise.all(violations.map(this.toDomain));
  }
}
