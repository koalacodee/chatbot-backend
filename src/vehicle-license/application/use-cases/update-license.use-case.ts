import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleLicenseRepository } from '../../domain/repositories/vehicle-license.repository';
import { UpdateLicenseInputDto } from '../dto/update-license.dto';

@Injectable()
export class UpdateLicenseUseCase {
  constructor(private readonly repo: VehicleLicenseRepository) {}

  async execute(input: UpdateLicenseInputDto) {
    const license = await this.repo.findById(input.licenseId);
    if (!license)
      throw new NotFoundException({
        details: [{ field: 'licenseId', message: 'Vehicle license not found' }],
      });

    if (input.licenseNumber !== undefined)
      license.licenseNumber = input.licenseNumber;
    if (input.issueDate !== undefined)
      license.issueDate = new Date(input.issueDate);
    if (input.expiryDate !== undefined)
      license.expiryDate = new Date(input.expiryDate);
    if (input.insurancePolicyNumber !== undefined)
      license.insurancePolicyNumber = input.insurancePolicyNumber || undefined;
    if (input.insuranceExpiryDate !== undefined)
      license.insuranceExpiryDate = input.insuranceExpiryDate
        ? new Date(input.insuranceExpiryDate)
        : undefined;
    if (input.status !== undefined) license.status = input.status as any;

    const saved = await this.repo.save(license);
    return saved.toJSON();
  }
}
