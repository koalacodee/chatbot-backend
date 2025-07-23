import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';

@Injectable()
export class CountDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(): Promise<number> {
    return this.departmentRepo.count();
  }
}
