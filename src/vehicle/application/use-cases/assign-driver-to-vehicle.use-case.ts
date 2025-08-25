import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';

interface AssignDriverInputDto {
  vehicleId: string;
  assignedDriverId: string;
}

@Injectable()
export class AssignDriverToVehicleUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute({ vehicleId, assignedDriverId }: AssignDriverInputDto): Promise<Vehicle> {
    if (!assignedDriverId) throw new BadRequestException({ assignedDriverId: 'required' });
    const vehicle = await this.vehicleRepo.findById(vehicleId);
    if (!vehicle) throw new NotFoundException({ id: 'vehicle_not_found' });
    vehicle.driver = { id: assignedDriverId } as any;
    return this.vehicleRepo.save(vehicle);
  }
}
