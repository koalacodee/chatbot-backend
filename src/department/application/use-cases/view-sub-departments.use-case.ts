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
  }): Promise<Department[]> {
    return this.departmentRepository.viewSubDepartments(options);
  }
}
