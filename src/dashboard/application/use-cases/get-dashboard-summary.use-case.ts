import { Injectable } from '@nestjs/common';
import {
  DashboardRepository,
  DashboardSummary,
} from '../../domain/repositories/dashboard.repository';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(): Promise<DashboardSummary> {
    return this.repo.getSummary();
  }
}
