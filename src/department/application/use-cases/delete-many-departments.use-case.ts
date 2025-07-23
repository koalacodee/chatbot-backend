import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

@Injectable()
export class DeleteManyDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(ids: string[]): Promise<Department[]> {
    return this.departmentRepo.removeByIds(ids);
  }
}
