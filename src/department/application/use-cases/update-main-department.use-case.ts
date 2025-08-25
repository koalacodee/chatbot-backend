import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department, DepartmentVisibility } from '../../domain/entities/department.entity';

export interface UpdateMainDepartmentInput {
  name?: string;
  visibility?: string;
}

@Injectable()
export class UpdateMainDepartmentUseCase {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(id: string, input: UpdateMainDepartmentInput): Promise<Department> {
    const updateData: Partial<Department> = {
      name: input.name,
      visibility: input.visibility ? input.visibility as DepartmentVisibility : undefined,
    };
    return this.departmentRepository.updateMainDepartment(id, updateData);
  }
}
