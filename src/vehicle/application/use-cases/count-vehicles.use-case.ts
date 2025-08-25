import { Injectable } from '@nestjs/common';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';

@Injectable()
export class CountVehiclesUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute(): Promise<number> {
    return this.vehicleRepo.count();
  }
}
