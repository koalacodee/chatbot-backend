import { Injectable } from '@nestjs/common';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';

interface SearchVehiclesInputDto {
  q: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchVehiclesUseCase {
  constructor(private readonly vehicleRepo: VehicleRepository) {}

  async execute({ q, page, limit }: SearchVehiclesInputDto): Promise<Vehicle[]> {
    const p = page && page > 0 ? page : 1;
    const take = limit && limit > 0 ? limit : 50;
    const skip = (p - 1) * take;
    return this.vehicleRepo.search(q, skip, take);
  }
}
