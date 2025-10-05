import { Injectable } from '@nestjs/common';
import {
  SupervisorRepository,
  SupervisorSummary,
} from '../../domain/repository/supervisor.repository';

@Injectable()
export class GetSupervisorsSummaryUseCase {
  constructor(private readonly supervisorRepository: SupervisorRepository) {}

  async execute(departmentIds?: string[]): Promise<SupervisorSummary[]> {
    return this.supervisorRepository.getSupervisorSummaries(departmentIds);
  }
}
