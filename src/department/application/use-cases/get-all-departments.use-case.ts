import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';

@Injectable()
export class GetAllDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(): Promise<any[]> {
    return this.departmentRepo
      .findAll()
      .then((depts) => depts.map((dept) => dept.toJSON()));
  }
}
