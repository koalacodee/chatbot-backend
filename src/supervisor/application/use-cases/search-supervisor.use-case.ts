import { Injectable } from '@nestjs/common';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';

interface SearchSupervisorInput {
  search: string;
}

@Injectable()
export class SearchSupervisorUseCase {
  constructor(private readonly supervisorRepository: SupervisorRepository) {}

  async execute(input: SearchSupervisorInput) {
    return this.supervisorRepository.search(input.search);
  }
}
