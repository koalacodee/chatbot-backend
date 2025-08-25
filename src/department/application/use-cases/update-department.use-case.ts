import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import {
  Department,
  DepartmentVisibility,
} from '../../domain/entities/department.entity';

interface UpdateDepartmentDto {
  name?: string;
  visibility?: DepartmentVisibility;
}

@Injectable()
export class UpdateDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    return this.departmentRepo.update(id, dto);
  }
}
