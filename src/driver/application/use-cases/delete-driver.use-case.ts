import { Injectable } from '@nestjs/common';
import { DriverRepository } from '../../domain/repositories/driver.repository';

@Injectable()
export class DeleteDriverUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  async execute(id: string): Promise<boolean> {
    const driver = await this.driverRepository.findById(id);
    if (!driver) {
      return false;
    }

    await this.driverRepository.delete(id);
    return true;
  }
}
