import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleLicenseRepository } from '../../domain/repositories/vehicle-license.repository';
import { GetSingleLicenseInputDto } from '../dto/get-single-license.dto';
import { VehicleLicense } from '../../domain/entities/vehicle-license.entity';

@Injectable()
export class GetSingleLicenseUseCase {
  constructor(private readonly repo: VehicleLicenseRepository) {}

  async execute(input: GetSingleLicenseInputDto): Promise<VehicleLicense> {
    const license = await this.repo.findById(input.licenseId);
    if (!license) throw new NotFoundException('Vehicle license not found');
    return license;
  }
}
