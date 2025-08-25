import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

@Injectable()
export class DeleteSubDepartmentUseCase {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(id: string): Promise<Department | null> {
    return this.departmentRepository.removeSubDepartmentById(id);
  }
}
