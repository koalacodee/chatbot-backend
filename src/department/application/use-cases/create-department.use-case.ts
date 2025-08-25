import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import {
  Department,
  DepartmentVisibility,
} from '../../domain/entities/department.entity';

interface CreateDepartmentDto {
  name: string;
  visibility?: DepartmentVisibility;
}

@Injectable()
export class CreateDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(dto: CreateDepartmentDto): Promise<Department> {
    const department = Department.create({
      name: dto.name,
      visibility: dto.visibility,
    });
    return this.departmentRepo.save(department);
  }
}
