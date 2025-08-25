import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';

@Injectable()
export class GetAllSubDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute(): Promise<any[]> {
    return this.departmentRepo
      .findAllSubDepartments({
        includeQuestions: true,
      })
      .then((depts) => depts.map((dept) => dept.toJSON()));
  }
}
