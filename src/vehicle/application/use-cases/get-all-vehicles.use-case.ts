import { Injectable } from '@nestjs/common';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';

interface GetAllVehiclesInputDto {
  status?: any;
  assignedDriverId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class GetAllVehiclesUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute(input?: GetAllVehiclesInputDto): Promise<any[]> {
    const page = input?.page && input.page > 0 ? input.page : 1;
    const take = input?.limit && input.limit > 0 ? input.limit : 50;
    const skip = (page - 1) * take;

    if (!input?.status && !input?.assignedDriverId)
      return this.vehicleRepo.findAll(skip, take);

    return this.vehicleRepo.findFiltered(
      input?.status,
      input?.assignedDriverId,
      skip,
      take,
    ).then((res) => res.map((veh) => veh.toJSON()));
  }
}
