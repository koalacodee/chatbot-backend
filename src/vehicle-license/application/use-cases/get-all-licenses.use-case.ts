import { Injectable } from '@nestjs/common';
import { VehicleLicenseRepository } from '../../domain/repositories/vehicle-license.repository';
import { GetAllLicensesInputDto } from '../dto/get-all-licenses.dto';

@Injectable()
export class GetAllLicensesUseCase {
  constructor(private readonly repo: VehicleLicenseRepository) {}

  async execute(input: GetAllLicensesInputDto = {} as any) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 50;
    const offset = (page - 1) * limit;

    const items = await this.repo.findAll(offset, limit);

    const filtered = items.filter((l) => {
      if (input.vehicleId && l.vehicle.id.toString() !== input.vehicleId) return false;
      if (input.driverId && (l.vehicle.driver?.id?.toString?.() ?? '') !== input.driverId) return false;
      if (input.status && l.status !== input.status) return false;
      return true;
    });

    return filtered.map((l) => l.toJSON());
  }
}
