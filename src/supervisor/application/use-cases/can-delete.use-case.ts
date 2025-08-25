import { Injectable } from '@nestjs/common';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';

interface CanDeleteRequest {
  id: string;
}

@Injectable()
export class CanDeleteUseCase {
  constructor(private readonly supervisorRepository: SupervisorRepository) {}

  async execute(id: string) {
    return this.supervisorRepository.canDelete(id);
  }
}
