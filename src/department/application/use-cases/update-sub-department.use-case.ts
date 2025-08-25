import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

export interface UpdateSubDepartmentInput {
  name?: string;
  parentId?: string;
}

@Injectable()
export class UpdateSubDepartmentUseCase {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(
    id: string,
    input: UpdateSubDepartmentInput,
  ): Promise<Department> {
    const updateData: Partial<Department> = {
      name: input.name,
    };

    if (input.parentId) {
      const department = await this.departmentRepository.findMainDepartmentById(
        input.parentId,
      );
      if (!department) {
        throw new Error('Department not found');
      }
      updateData.parent = department;
    }
    return this.departmentRepository.updateSubDepartment(id, updateData, {
      includeParent: true,
    });
  }
}
