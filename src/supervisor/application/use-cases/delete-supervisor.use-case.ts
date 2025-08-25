import { Injectable, NotFoundException } from '@nestjs/common';
import { SupervisorRepository } from '../../domain/repository/supervisor.repository';

@Injectable()
export class DeleteSupervisorUseCase {
  constructor(private readonly supervisorRepository: SupervisorRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.supervisorRepository.exists(id);
    if (!exists) {
      throw new NotFoundException('Supervisor not found');
    }

    await this.supervisorRepository.delete(id);
  }
}
