import { Injectable } from '@nestjs/common';
import { VehicleLicenseRepository } from '../../domain/repositories/vehicle-license.repository';

interface SortLicensesByExpiryInput {
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

@Injectable()
export class SortLicensesByExpiryDateUseCase {
  constructor(private readonly repo: VehicleLicenseRepository) {}

  async execute(input: SortLicensesByExpiryInput = {}): Promise<any[]> {
    const items = await this.repo.findAll();
    const filtered = input.status ? items.filter((l) => l.status === input.status) : items;
    return filtered
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
      .map((l) => l.toJSON());
  }
}
