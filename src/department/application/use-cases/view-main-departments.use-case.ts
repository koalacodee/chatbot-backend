import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

@Injectable()
export class ViewMainDepartmentsUseCase {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(options?: {
    limit?: number;
    page?: number;
    guestId?: string;
  }): Promise<Department[]> {
    // guestId is accepted for consistency but not used in this public viewing use case
    return this.departmentRepository.viewMainDepartments({
      limit: options?.limit,
      page: options?.page,
    });
  }
}
