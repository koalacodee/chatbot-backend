import { Injectable } from '@nestjs/common';
import {
  DashboardRepository,
  EmployeeDashboardData,
} from '../../domain/repositories/dashboard.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';

export interface GetEmployeeDashboardInputDto {
  userId: string;
  taskLimit?: number;
  ticketLimit?: number;
}

@Injectable()
export class GetEmployeeDashboardUseCase {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute(
    dto: GetEmployeeDashboardInputDto,
  ): Promise<EmployeeDashboardData> {
    const { userId, taskLimit = 10, ticketLimit = 10 } = dto;

    // Get employee by user ID
    const employee = await this.employeeRepository.findByUserId(userId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    return this.repo.getEmployeeDashboard(
      employee.id.toString(),
      taskLimit,
      ticketLimit,
    );
  }
}

