import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';

export interface GetEmployeeDashboardSummaryResponseDto {
  completedTasks: number;
  closedTickets: number;
  expiredFiles: number;
}

@Injectable()
export class GetEmployeeDashboardSummaryUseCase {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) { }

  async execute(
    userId: string,
  ): Promise<GetEmployeeDashboardSummaryResponseDto> {
    // Get employee by user ID
    const employee = await this.employeeRepository.findByUserId(userId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    return this.repo.getEmployeeDashboardSummary(employee.id.toString());
  }
}

