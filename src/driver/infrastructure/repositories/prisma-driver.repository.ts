import { Injectable } from '@nestjs/common';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverRepository } from '../../domain/repositories/driver.repository';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class PrismaDriverRepository implements DriverRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Driver | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        vehicles: true,
        violations: true,
      },
    });

    return driver ? Driver.fromJSON(driver) : null;
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: true,
        vehicles: true,
        violations: true,
      },
    });

    return driver ? Driver.fromJSON(driver) : null;
  }

  async findAll(): Promise<Driver[]> {
    const drivers = await this.prisma.driver.findMany({
      include: {
        user: true,
        vehicles: true,
        violations: true,
      },
    });

    return Promise.all(drivers.map((driver) => Driver.fromJSON(driver)));
  }

  async save(driver: Driver): Promise<void> {
    const data = driver.toJSON();
    await this.prisma.driver.create({
      data: {
        id: data.id,
        user: { connect: { id: data.userId } },
        licensingNumber: data.licensingNumber,
        drivingLicenseExpiry: data.drivingLicenseExpiry,
        supervisor: { connect: { id: data.supervisorId } },
        vehicles: {
          connect: data.vehicles?.map((v) => ({ id: v.id.toString() })) || [],
        },
        violations: {
          connect: data.violations?.map((v) => ({ id: v.id })) || [],
        },
      },
    });
  }

  async update(driver: Driver): Promise<void> {
    const data = driver.toJSON();
    await this.prisma.driver.update({
      where: { id: data.id },
      data: {
        vehicles: {
          set: data.vehicles?.map((v) => ({ id: v.id.toString() })) || [],
        },
        violations: {
          set: data.violations?.map((v) => ({ id: v.id })) || [],
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.driver.delete({
      where: { id },
    });
  }

  async findByLicensingNumber(licensingNumber: string): Promise<Driver | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { licensingNumber },
    });

    return driver ? Driver.fromJSON(driver) : null;
  }
}
