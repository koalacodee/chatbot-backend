import { Injectable } from '@nestjs/common';
import { Driver } from '../../domain/entities/driver.entity';
import { DriverRepository } from '../../domain/repositories/driver.repository';

@Injectable()
export class GetDriverByUserIdUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  async execute(userId: string): Promise<Driver | null> {
    return this.driverRepository.findByUserId(userId);
  }
}
