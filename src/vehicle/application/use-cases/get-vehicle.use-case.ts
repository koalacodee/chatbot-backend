import { Injectable, NotFoundException } from '@nestjs/common';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';

@Injectable()
export class GetVehicleUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findById(id);
    if (!vehicle)
      throw new NotFoundException({
        details: [{ field: 'id', message: 'Vehicle not found' }],
      });
    return vehicle;
  }
}
