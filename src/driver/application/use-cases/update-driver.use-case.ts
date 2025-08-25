import { Injectable } from '@nestjs/common';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverRepository } from '../../domain/repositories/driver.repository';

interface UpdateDriverRequest {
  id: string;
  vehicles?: string[];
  violations?: string[];
}

@Injectable()
export class UpdateDriverUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  async execute(request: UpdateDriverRequest): Promise<Driver | null> {
    const driver = await this.driverRepository.findById(request.id);
    if (!driver) {
      return null;
    }

    const updatedDriver = Driver.create({
      id: driver.id.value,
      userId: driver.userId.value,
      supervisorId: driver.supervisorId.value,
      licensingNumber: driver.licensingNumber,
      drivingLicenseExpiry: driver.drivingLicenseExpiry,
      vehicles: driver.vehicles,
      violations: driver.violations,
    });

    await this.driverRepository.update(updatedDriver);
    return updatedDriver;
  }
}
