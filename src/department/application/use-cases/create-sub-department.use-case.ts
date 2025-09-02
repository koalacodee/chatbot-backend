import { Injectable, NotFoundException } from '@nestjs/common';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';

interface CreateSubDepartmentInput {
  parentId: string;
  name: string;
}

@Injectable()
export class CreateSubDepartmentUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(dto: CreateSubDepartmentInput) {
    const parent = await this.departmentRepo.findById(dto.parentId);

    if (!parent) {
      throw new NotFoundException({ parent: 'not_found' });
    }

    const subDept = Department.create({
      name: dto.name,
      parent,
      visibility: parent.visibility,
    });

    await this.departmentRepo.save(subDept, { includeParent: true });

    return subDept;
  }
}
