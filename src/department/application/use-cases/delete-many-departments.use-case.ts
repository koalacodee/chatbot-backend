import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';

@Injectable()
export class DeleteManyDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(ids: string[]): Promise<void> {
    return this.departmentRepo.removeByIds(ids);
  }
}
