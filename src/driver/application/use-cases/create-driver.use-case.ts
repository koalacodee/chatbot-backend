import { Injectable } from '@nestjs/common';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverRepository } from '../../domain/repositories/driver.repository';

interface CreateDriverRequest {
  userId: string;
  supervisorId: string;
  licensingNumber: string;
  drivingLicenseExpiry: Date;
  vehicles?: string[];
  violations?: string[];
}

@Injectable()
export class CreateDriverUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  async execute(request: CreateDriverRequest): Promise<Driver> {
    const driver = Driver.create({
      userId: request.userId,
      supervisorId: request.supervisorId,
      licensingNumber: request.licensingNumber,
      drivingLicenseExpiry: request.drivingLicenseExpiry,
    });

    await this.driverRepository.save(driver);
    return driver;
  }
}
