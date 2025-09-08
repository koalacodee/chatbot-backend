import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

@Injectable()
export class ViewSubDepartmentsUseCase {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(options?: {
    limit?: number;
    page?: number;
    departmentId?: string;
    guestId?: string;
  }): Promise<Department[]> {
    // guestId is accepted for consistency but not used in this public viewing use case
    return this.departmentRepository.viewSubDepartments({
      limit: options?.limit,
      page: options?.page,
      departmentId: options?.departmentId,
    });
  }
}
