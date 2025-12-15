import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';

@Injectable()
export class DeleteDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(id: string): Promise<void> {
    return this.departmentRepo.removeById(id);
  }
}
