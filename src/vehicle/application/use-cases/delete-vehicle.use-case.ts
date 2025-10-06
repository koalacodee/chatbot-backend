import { Injectable, NotFoundException } from '@nestjs/common';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';

@Injectable()
export class DeleteVehicleUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute(id: string): Promise<Vehicle | null> {
    const existing = await this.vehicleRepo.findById(id);
    if (!existing)
      throw new NotFoundException({
        details: [{ field: 'id', message: 'Vehicle not found' }],
      });
    await this.vehicleRepo.removeById(id);
    return existing;
  }
}
