import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

@Injectable()
export class DeleteDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(id: string): Promise<Department | null> {
    return this.departmentRepo.removeById(id);
  }
}
