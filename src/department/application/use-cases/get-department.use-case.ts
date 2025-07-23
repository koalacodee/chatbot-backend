import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

@Injectable()
export class GetDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(id: string): Promise<Department | null> {
    return this.departmentRepo.findById(id);
  }
}
