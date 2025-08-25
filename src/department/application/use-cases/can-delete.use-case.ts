import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';

@Injectable()
export class CanDeleteUseCase {
  constructor(private readonly departmentRepo: DepartmentRepository) {}

  async execute({ id }: { id: string }): Promise<boolean> {
    return await this.departmentRepo.canDelete(id);
  }
}
