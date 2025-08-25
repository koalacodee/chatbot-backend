import { Injectable } from '@nestjs/common';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverRepository } from '../../domain/repositories/driver.repository';

@Injectable()
export class GetAllDriversUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  async execute(): Promise<Driver[]> {
    return this.driverRepository.findAll();
  }
}
