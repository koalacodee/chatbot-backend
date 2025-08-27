import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';

interface GetAllSubDepartmentsInput {
  departmentId?: string;
}

@Injectable()
export class GetAllSubDepartmentsUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute({ departmentId }: GetAllSubDepartmentsInput): Promise<any[]> {
    return this.departmentRepo
      .findAllSubDepartments(
        {
          includeQuestions: true,
        },
        departmentId,
      )
      .then((depts) => depts.map((dept) => dept.toJSON()));
  }
}
