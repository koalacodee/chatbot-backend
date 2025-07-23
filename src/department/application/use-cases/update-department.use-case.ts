import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

interface UpdateDepartmentDto {
  name?: string;
}

@Injectable()
export class UpdateDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    return this.departmentRepo.update(id, dto);
  }
}
