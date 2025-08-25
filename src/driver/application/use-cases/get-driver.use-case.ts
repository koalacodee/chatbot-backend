import { Injectable } from '@nestjs/common';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverRepository } from '../../domain/repositories/driver.repository';

@Injectable()
export class GetDriverUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  async execute(id: string): Promise<Driver | null> {
    return this.driverRepository.findById(id);
  }
}
