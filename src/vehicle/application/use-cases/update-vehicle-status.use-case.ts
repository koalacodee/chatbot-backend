import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';

interface UpdateVehicleStatusInputDto {
  vehicleId: string;
  status: any; // VehicleStatus
}

@Injectable()
export class UpdateVehicleStatusUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute({ vehicleId, status }: UpdateVehicleStatusInputDto): Promise<Vehicle> {
    if (!status) throw new BadRequestException({ status: 'required' });
    const vehicle = await this.vehicleRepo.findById(vehicleId);
    if (!vehicle) throw new NotFoundException({ id: 'vehicle_not_found' });
    vehicle.status = status as any;
    return this.vehicleRepo.save(vehicle);
  }
}
